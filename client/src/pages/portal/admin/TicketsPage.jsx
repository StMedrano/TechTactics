import { useEffect, useState } from 'react'
import PortalLayout from '../../../components/layout/PortalLayout'
import Card from '../../../components/ui/Card'
import { appService } from '../../../services/appService'
import { zohoService } from '../../../services/zohoService'
import { money } from '../../../utils/formatters'

function formatTicketStatus(value) {
  return String(value || '')
    .replace(/[\s-]+/g, '_')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function normalizeTicketStatus(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

function canMarkCompleted(status) {
  return !['pending_approval', 'pending', 'requested', 'new', 'quote_sent', 'quote_rejected', 'deposit_pending', 'rejected', 'completed'].includes(
    normalizeTicketStatus(status)
  )
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function getBooksItemPrice(item) {
  return Number(item?.rate || item?.cost || 0)
}

function getBooksItemLabel(item) {
  const price = getBooksItemPrice(item)
  const cost = Number(item?.cost || 0)
  const unit = item?.unit ? ` / ${item.unit}` : ''
  const costLabel = cost > 0 && cost !== price ? ` (cost ${money(cost)})` : ''
  return `${item?.name || 'Books item'} - ${money(price)}${unit}${costLabel}`
}

function getLineItemTotal(items = []) {
  return items.reduce((sum, item) => sum + Number(item.quantity || 1) * Number(item.rate || 0), 0)
}

function getQuoteDraft(current, ticket) {
  return {
    selectedBooksItemId: current[ticket.id]?.selectedBooksItemId ?? '',
    quoteText: current[ticket.id]?.quoteText ?? ticket.quoteText ?? '',
    quoteAmount: current[ticket.id]?.quoteAmount ?? (ticket.quoteAmount ? String(ticket.quoteAmount) : ''),
    quoteItems: Array.isArray(current[ticket.id]?.quoteItems)
      ? current[ticket.id].quoteItems
      : Array.isArray(ticket.quoteItems)
        ? ticket.quoteItems
        : [],
  }
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState([])
  const [error, setError] = useState('')
  const [savingTicketId, setSavingTicketId] = useState('')
  const [quoteDrafts, setQuoteDrafts] = useState({})
  const [booksItems, setBooksItems] = useState([])
  const [booksItemStatus, setBooksItemStatus] = useState('')

  function updateQuoteDraft(ticket, patch) {
    setQuoteDrafts((current) => ({
      ...current,
      [ticket.id]: {
        ...getQuoteDraft(current, ticket),
        ...patch,
      },
    }))
  }

  async function loadTickets() {
    try {
      const payload = await appService.getTickets()
      setTickets(Array.isArray(payload) ? payload : [])
      setError('')
    } catch (err) {
      setError(err.message || 'Unable to load website requests.')
    }
  }

  useEffect(() => {
    loadTickets()
    zohoService
      .listItems()
      .then((payload) => {
        setBooksItems(Array.isArray(payload?.items) ? payload.items : [])
        setBooksItemStatus('')
      })
      .catch((err) => {
        setBooksItems([])
        setBooksItemStatus(err.message || 'Zoho Books items are not available right now.')
      })
  }, [])

  function handleAddBooksItem(ticket) {
    const draft = getQuoteDraft(quoteDrafts, ticket)
    const itemId = draft.selectedBooksItemId
    const item = booksItems.find((booksItem) => String(booksItem.id) === String(itemId))
    if (!item) {
      setError('Choose a Zoho Books item before adding it to the quote.')
      return
    }

    const price = getBooksItemPrice(item)
    if (price <= 0) {
      setError('This Zoho Books item does not have a sale price or cost to pull.')
      return
    }

    setQuoteDrafts((current) => {
      const draft = getQuoteDraft(current, ticket)
      const quoteItem = {
        itemId: item.itemId || item.id,
        name: item.name,
        description: item.description || `Zoho Books item for ticket #${ticket.id}`,
        quantity: 1,
        rate: price,
        cost: Number(item.cost || 0),
      }
      const quoteItems = [...draft.quoteItems, quoteItem]
      const total = getLineItemTotal(quoteItems)

      return {
        ...current,
        [ticket.id]: {
          ...draft,
          selectedBooksItemId: '',
          quoteItems,
          quoteAmount: total ? String(total.toFixed(2)) : draft.quoteAmount,
        },
      }
    })
  }

  function handleRemoveQuoteItem(ticket, index) {
    setQuoteDrafts((current) => {
      const draft = getQuoteDraft(current, ticket)
      const quoteItems = draft.quoteItems.filter((_, itemIndex) => itemIndex !== index)
      const total = getLineItemTotal(quoteItems)

      return {
        ...current,
        [ticket.id]: {
          ...draft,
          quoteItems,
          quoteAmount: total ? String(total.toFixed(2)) : '',
        },
      }
    })
  }

  async function handleSendQuote(ticket) {
    const draft = getQuoteDraft(quoteDrafts, ticket)
    const itemSummary = draft.quoteItems
      .map((item) => `${item.name} x${item.quantity || 1} - ${money(Number(item.rate || 0))}`)
      .join('\n')
    const quoteText = String(draft.quoteText || itemSummary || '').trim()
    const quoteAmount = Number(draft.quoteAmount || getLineItemTotal(draft.quoteItems) || 0)

    if (!quoteText) {
      setError('Add quote details before sending this to the customer.')
      return
    }

    if (!Number.isFinite(quoteAmount) || quoteAmount <= 0) {
      setError('Add a quote amount greater than zero.')
      return
    }

    if (!window.confirm('Send this quote to the customer for approval and project start-date selection?')) {
      return
    }

    setSavingTicketId(ticket.id)
    try {
      await appService.sendTicketQuote(ticket.id, {
        quoteText,
        quoteAmount,
        quoteItems: draft.quoteItems,
      })
      setQuoteDrafts((current) => ({
        ...current,
        [ticket.id]: {
          selectedBooksItemId: '',
          quoteText: '',
          quoteAmount: '',
          quoteItems: [],
        },
      }))
      await loadTickets()
    } catch (err) {
      setError(err.message || 'Unable to send the quote.')
    } finally {
      setSavingTicketId('')
    }
  }

  async function handleReject(ticket) {
    if (!window.confirm('Reject this request?')) {
      return
    }

    setSavingTicketId(ticket.id)
    try {
      await appService.updateTicketApproval(ticket.id, {
        status: 'rejected',
      })
      await loadTickets()
    } catch (err) {
      setError(err.message || 'Unable to reject the request.')
    } finally {
      setSavingTicketId('')
    }
  }

  async function handleComplete(ticket) {
    const completionNote = window.prompt(
      'Add a completion note for the customer before closing this ticket.',
      'Website project completed successfully.'
    )

    if (completionNote === null) {
      return
    }

    if (!String(completionNote).trim()) {
      setError('Add a completion note before marking a website project completed.')
      return
    }

    if (!window.confirm('Mark this website project completed and send a review request to the customer?')) {
      return
    }

    setSavingTicketId(ticket.id)
    try {
      await appService.updateTicketStatus(ticket.id, {
        status: 'completed',
        note: completionNote,
      })
      await loadTickets()
    } catch (err) {
      setError(err.message || 'Unable to mark the website project completed.')
    } finally {
      setSavingTicketId('')
    }
  }

  return (
    <PortalLayout title="Website Requests">
      {error && (
        <Card title="Load Error">
          <p>{error}</p>
        </Card>
      )}

      <Card
        title="Project Start Calendar"
        subtitle="Customer-approved website projects appear here after the customer chooses a project start date."
      >
        <div className="calendar-strip">
          {tickets
            .filter((ticket) => ticket.scheduledDate)
            .sort((left, right) => String(left.scheduledDate).localeCompare(String(right.scheduledDate)))
            .map((ticket) => (
              <div className="calendar-day" key={`scheduled-${ticket.id}`}>
                <strong>{formatDate(ticket.scheduledDate)}</strong>
                <span>#{ticket.id} {ticket.title || ticket.type}</span>
                <small>{ticket.customerName || 'Customer'} - {ticket.assignedEmployee || 'Pending assignment'}</small>
              </div>
            ))}
          {!tickets.some((ticket) => ticket.scheduledDate) && (
            <p>No customer-approved website project starts have been scheduled yet.</p>
          )}
        </div>
      </Card>

      <Card subtitle="Website requests wait here for quote creation, customer approval, project start selection, assignment, completion, and review follow-up.">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Requested Work</th>
                <th>Category</th>
                <th>Status</th>
                <th>Assigned</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => {
                const normalizedStatus = normalizeTicketStatus(ticket.status)
                const isPendingApproval = ['pending_approval', 'pending', 'requested', 'new'].includes(
                  normalizedStatus
                )
                const isQuoteSent = normalizedStatus === 'quote_sent'
                const isDepositPending = normalizedStatus === 'deposit_pending'
                const isSaving = savingTicketId === ticket.id
                const quoteDraft = getQuoteDraft(quoteDrafts, ticket)

                return (
                  <tr key={ticket.id}>
                    <td>#{ticket.id}</td>
                    <td>{ticket.customerName}</td>
                    <td>
                      {ticket.title || ticket.type}
                      <div className="sub-cell">{ticket.type}</div>
                    </td>
                    <td>{ticket.category}</td>
                    <td>
                      {formatTicketStatus(ticket.status)}
                      <div className="sub-cell">{ticket.note}</div>
                      {ticket.quoteAmount > 0 && (
                        <div className="sub-cell">Quote: {money(ticket.quoteAmount)}</div>
                      )}
                      {ticket.scheduledDate && (
                        <div className="sub-cell">Start: {formatDate(ticket.scheduledDate)}</div>
                      )}
                    </td>
                    <td>
                      {isPendingApproval || isQuoteSent
                        ? 'Pending customer/admin workflow'
                        : isDepositPending
                          ? 'Waiting for 50% deposit and schedule'
                        : ticket.assignedEmployee || 'Unassigned'}
                    </td>
                    <td>{ticket.updatedAt}</td>
                    <td>
                      {isPendingApproval ? (
                        <div className="stack gap-sm">
                          <textarea
                            rows="3"
                            value={quoteDraft.quoteText}
                            onChange={(event) => updateQuoteDraft(ticket, { quoteText: event.target.value })}
                            placeholder="Scope, inclusions, assumptions, and customer-facing quote details"
                          />
                          {booksItems.length ? (
                            <div className="line-item-picker">
                              <select
                                value={quoteDraft.selectedBooksItemId}
                                onChange={(event) => updateQuoteDraft(ticket, { selectedBooksItemId: event.target.value })}
                              >
                                <option value="">Choose a Zoho Books item...</option>
                                {booksItems.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {getBooksItemLabel(item)}
                                  </option>
                                ))}
                              </select>
                              <button
                                className="btn btn-secondary"
                                type="button"
                                disabled={isSaving}
                                onClick={() => handleAddBooksItem(ticket)}
                              >
                                Add Item
                              </button>
                            </div>
                          ) : (
                            <div className="sub-cell">
                              {booksItemStatus || 'No Zoho Books items were returned for quote pricing.'}
                            </div>
                          )}
                          {quoteDraft.quoteItems.length > 0 && (
                            <div className="line-item-list">
                              {quoteDraft.quoteItems.map((item, index) => (
                                <div className="line-item-row" key={`${item.itemId || item.name}-${index}`}>
                                  <span>{item.name}</span>
                                  <strong>{money(Number(item.rate || 0))}</strong>
                                  <button type="button" onClick={() => handleRemoveQuoteItem(ticket, index)}>
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={quoteDraft.quoteAmount}
                            onChange={(event) => updateQuoteDraft(ticket, { quoteAmount: event.target.value })}
                            placeholder="Quote amount"
                          />
                          <div className="inline-actions compact-actions">
                            <button
                              className="btn btn-secondary"
                              type="button"
                              disabled={isSaving}
                              onClick={() => handleSendQuote(ticket)}
                            >
                              {isSaving ? 'Sending...' : 'Send Quote'}
                            </button>
                            <button
                              className="btn btn-secondary danger-outline"
                              type="button"
                              disabled={isSaving}
                              onClick={() => handleReject(ticket)}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ) : isQuoteSent ? (
                        <div className="stack gap-sm">
                          <strong>Waiting for customer</strong>
                          <div className="sub-cell">Quote: {money(ticket.quoteAmount)}</div>
                          <p>{ticket.quoteText || 'Quote details sent.'}</p>
                        </div>
                      ) : isDepositPending ? (
                        <div className="stack gap-sm">
                          <strong>Waiting for deposit</strong>
                          <div className="sub-cell">50% deposit: {money(Number(ticket.quoteAmount || 0) * 0.5)}</div>
                          <p>Customer must pay the deposit before choosing a project start date.</p>
                        </div>
                      ) : canMarkCompleted(normalizedStatus) ? (
                        <button
                          className="btn btn-secondary"
                          type="button"
                          disabled={isSaving}
                          onClick={() => handleComplete(ticket)}
                        >
                          {isSaving ? 'Saving...' : 'Mark Completed'}
                        </button>
                      ) : normalizedStatus === 'completed' ? (
                        <span className="sub-cell">Review request sent</span>
                      ) : (
                        <span className="sub-cell">Reviewed</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {!tickets.length && (
                <tr>
                  <td colSpan="8">No website requests found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </PortalLayout>
  )
}
