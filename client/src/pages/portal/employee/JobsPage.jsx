import { useEffect, useState } from 'react'
import PortalLayout from '../../../components/layout/PortalLayout'
import Card from '../../../components/ui/Card'
import { appService } from '../../../services/appService'
import { zohoService } from '../../../services/zohoService'
import { money } from '../../../utils/formatters'

const DISPATCH_STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'dispatched', label: 'Assigned' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'awaiting_equipment', label: 'Waiting on Client / Assets' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
]

function formatTicketStatus(value) {
  return String(value || '')
    .replace(/[\s-]+/g, '_')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function canDispatchTicket(status) {
  return !['pending_approval', 'quote_sent', 'quote_rejected', 'deposit_pending', 'rejected'].includes(
    String(status || '').toLowerCase().replace(/[\s-]+/g, '_')
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

function getInvoiceDraft(current, job) {
  return {
    selectedBooksItemId: current[job.id]?.selectedBooksItemId ?? '',
    invoiceItems: Array.isArray(current[job.id]?.invoiceItems) ? current[job.id].invoiceItems : [],
    equipmentItemId: current[job.id]?.equipmentItemId ?? '',
    equipmentName: current[job.id]?.equipmentName ?? 'Project Item',
    equipmentAmount: current[job.id]?.equipmentAmount ?? '',
    laborHours: current[job.id]?.laborHours ?? '',
    laborRate: current[job.id]?.laborRate ?? '',
    notes: current[job.id]?.notes ?? job.quoteText ?? job.description ?? '',
  }
}

export default function JobsPage() {
  const [jobs, setJobs] = useState([])
  const [profile, setProfile] = useState({})
  const [drafts, setDrafts] = useState({})
  const [invoiceDrafts, setInvoiceDrafts] = useState({})
  const [savingTicketId, setSavingTicketId] = useState('')
  const [invoicingTicketId, setInvoicingTicketId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [booksItems, setBooksItems] = useState([])
  const [booksItemStatus, setBooksItemStatus] = useState('')

  const loadJobs = async () => {
    try {
      const [ticketPayload, profilePayload, booksPayload] = await Promise.all([
        appService.getTickets(),
        appService.getProfile(),
        zohoService
          .listItems()
          .catch((err) => ({ items: [], itemError: err.message || 'Zoho Books items are not available.' })),
      ])

      const nextJobs = Array.isArray(ticketPayload) ? ticketPayload : []
      setJobs(nextJobs)
      setProfile(profilePayload || {})
      setBooksItems(Array.isArray(booksPayload?.items) ? booksPayload.items : [])
      setBooksItemStatus(booksPayload?.itemError || '')
      setDrafts((current) => {
        const next = { ...current }
        nextJobs.forEach((job) => {
          if (!next[job.id]) {
            next[job.id] = {
              status: String(job.status || 'open').toLowerCase(),
              note: '',
            }
          }
        })
        return next
      })
      setError('')
    } catch (err) {
      setError(err.message || 'Unable to load assigned website projects.')
    }
  }

  useEffect(() => {
    loadJobs()
  }, [])

  const updateDraft = (ticketId, key, value) => {
    setDrafts((current) => ({
      ...current,
      [ticketId]: {
        ...(current[ticketId] || {}),
        [key]: value,
      },
    }))
  }

  const updateInvoiceDraft = (ticketId, key, value) => {
    setInvoiceDrafts((current) => ({
      ...current,
      [ticketId]: {
        ...(current[ticketId] || {}),
        [key]: value,
      },
    }))
  }

  const handleAddInvoiceItem = (job) => {
    const draft = getInvoiceDraft(invoiceDrafts, job)
    const itemId = draft.selectedBooksItemId
    const item = booksItems.find((booksItem) => String(booksItem.id) === String(itemId))
    if (!item) {
      setError('Choose a Zoho Books item before adding it to the invoice.')
      return
    }

    const price = getBooksItemPrice(item)
    if (price <= 0) {
      setError('This Zoho Books item does not have a sale price or cost to pull.')
      return
    }

    setInvoiceDrafts((current) => {
      const draft = getInvoiceDraft(current, job)
      const description = item.description || `Zoho Books item for ticket #${job.id}`
      const notes = String(draft.notes || '').trim()
      const invoiceItem = {
        itemId: item.itemId || item.id,
        name: item.name,
        description,
        quantity: 1,
        rate: price,
        cost: Number(item.cost || 0),
      }

      return {
        ...current,
        [job.id]: {
          ...draft,
          selectedBooksItemId: '',
          invoiceItems: [...draft.invoiceItems, invoiceItem],
          notes: notes ? `${notes}\n${description}` : description,
        },
      }
    })
  }

  const handleRemoveInvoiceItem = (job, index) => {
    setInvoiceDrafts((current) => {
      const draft = getInvoiceDraft(current, job)
      return {
        ...current,
        [job.id]: {
          ...draft,
          invoiceItems: draft.invoiceItems.filter((_, itemIndex) => itemIndex !== index),
        },
      }
    })
  }

  const handleDispatchSave = async (job) => {
    const draft = drafts[job.id] || {}
    const note = String(draft.note || '').trim()

    if (!note) {
      setError('Add a project note before saving a status update.')
      return
    }

    setSavingTicketId(job.id)
    setError('')
    setMessage('')

    try {
      await appService.updateDispatch(job.id, {
        status: draft.status || job.status,
        note,
      })
      setMessage(`Project updated for request #${job.id}.`)
      setDrafts((current) => ({
        ...current,
        [job.id]: {
          status: draft.status || job.status,
          note: '',
        },
      }))
      await loadJobs()
    } catch (err) {
      setError(err.message || 'Unable to update this project.')
    } finally {
      setSavingTicketId('')
    }
  }

  const handleCreateInvoice = async (job) => {
    const draft = getInvoiceDraft(invoiceDrafts, job)
    const equipmentAmount = Number(draft.equipmentAmount || 0)
    const laborHours = Number(draft.laborHours || 0)
    const laborRate = Number(draft.laborRate || 0)
    const items = [...draft.invoiceItems]

    if (equipmentAmount > 0) {
      items.push({
        itemId: draft.equipmentItemId,
        name: draft.equipmentName || 'Project Item',
        description: `Project item for website request #${job.id}`,
        quantity: 1,
        rate: equipmentAmount,
      })
    }

    if (laborHours > 0 && laborRate > 0) {
      items.push({
        name: 'Project Services',
        description: `Project services for website request #${job.id}`,
        quantity: laborHours,
        rate: laborRate,
      })
    }

    const amount = getLineItemTotal(items) || Number(job.quoteAmount || 0)
    if (amount <= 0) {
      setError('Add project item/service pricing or make sure the quote amount is available before creating an invoice.')
      return
    }

    if (!window.confirm(`Create a Zoho invoice for ${money(amount)}?`)) {
      return
    }

    setInvoicingTicketId(job.id)
    setError('')
    setMessage('')

    try {
      await zohoService.createInvoice({
        payload: {
          ticketId: job.id,
          amount,
          notes: draft.notes || job.quoteText || job.description,
          items,
        },
      })
      setMessage(`Invoice created for ticket #${job.id}.`)
      setInvoiceDrafts((current) => ({
        ...current,
        [job.id]: {
          selectedBooksItemId: '',
          invoiceItems: [],
          equipmentItemId: '',
          equipmentName: 'Project Item',
          equipmentAmount: '',
          laborHours: '',
          laborRate: '',
          notes: '',
        },
      }))
      await loadJobs()
    } catch (err) {
      setError(err.message || 'Unable to create invoice for this ticket.')
    } finally {
      setInvoicingTicketId('')
    }
  }

  const renderDispatchControls = (job) => {
    const isSaving = savingTicketId === job.id
    const draft = drafts[job.id] || { status: job.status, note: '' }
    const canDispatch = canDispatchTicket(job.status)

    if (!canDispatch) {
      return <span className="sub-cell">Waiting for admin approval.</span>
    }

    return (
      <div className="stack gap-sm">
        <select
          value={draft.status || String(job.status || '').toLowerCase()}
          onChange={(event) => updateDraft(job.id, 'status', event.target.value)}
        >
          {DISPATCH_STATUSES.map((statusOption) => (
            <option key={statusOption.value} value={statusOption.value}>
              {statusOption.label}
            </option>
          ))}
        </select>
        <textarea
          rows="3"
          value={draft.note || ''}
          onChange={(event) => updateDraft(job.id, 'note', event.target.value)}
          placeholder="Required project note"
        />
        <button
          className="btn btn-secondary"
          type="button"
          disabled={isSaving}
          onClick={() => handleDispatchSave(job)}
        >
          {isSaving ? 'Saving...' : 'Save Status'}
        </button>
      </div>
    )
  }

  const renderInvoiceControls = (job) => {
    const canDispatch = canDispatchTicket(job.status)
    const invoiceDraft = getInvoiceDraft(invoiceDrafts, job)
    const isInvoicing = invoicingTicketId === job.id

    if (!canDispatch) {
      return <span className="sub-cell">Available after quote approval and assignment.</span>
    }

    return (
      <div className="stack gap-sm">
        {booksItems.length ? (
          <div className="line-item-picker">
            <select
              value={invoiceDraft.selectedBooksItemId}
              onChange={(event) => updateInvoiceDraft(job.id, 'selectedBooksItemId', event.target.value)}
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
              disabled={isInvoicing}
              onClick={() => handleAddInvoiceItem(job)}
            >
              Add Item
            </button>
          </div>
        ) : (
          <div className="sub-cell">
            {booksItemStatus || 'No Zoho Books items were returned for invoice pricing.'}
          </div>
        )}
        {invoiceDraft.invoiceItems.length > 0 && (
          <div className="line-item-list">
            {invoiceDraft.invoiceItems.map((item, index) => (
              <div className="line-item-row" key={`${item.itemId || item.name}-${index}`}>
                <span>{item.name}</span>
                <strong>{money(Number(item.rate || 0))}</strong>
                <button type="button" onClick={() => handleRemoveInvoiceItem(job, index)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <input
          value={invoiceDraft.equipmentName}
          onChange={(event) => updateInvoiceDraft(job.id, 'equipmentName', event.target.value)}
          placeholder="Project item label"
        />
        <input
          type="number"
          min="0"
          step="0.01"
          value={invoiceDraft.equipmentAmount}
          onChange={(event) => updateInvoiceDraft(job.id, 'equipmentAmount', event.target.value)}
          placeholder="Project item amount"
        />
        <div className="grid grid-2">
          <input
            type="number"
            min="0"
            step="0.25"
            value={invoiceDraft.laborHours}
            onChange={(event) => updateInvoiceDraft(job.id, 'laborHours', event.target.value)}
            placeholder="Service hours"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={invoiceDraft.laborRate}
            onChange={(event) => updateInvoiceDraft(job.id, 'laborRate', event.target.value)}
            placeholder="Service rate"
          />
        </div>
        <textarea
          rows="3"
          value={invoiceDraft.notes}
          onChange={(event) => updateInvoiceDraft(job.id, 'notes', event.target.value)}
          placeholder="Invoice notes"
        />
        <button
          className="btn btn-secondary"
          type="button"
          disabled={isInvoicing}
          onClick={() => handleCreateInvoice(job)}
        >
          {isInvoicing ? 'Creating...' : 'Create Invoice'}
        </button>
      </div>
    )
  }

  return (
    <PortalLayout title="My Projects">
      {error && (
        <Card title="Project Update Error">
          <p>{error}</p>
        </Card>
      )}

      {message && (
        <Card title="Project Updated">
          <p>{message}</p>
        </Card>
      )}

      <Card
        title="Project Queue"
        subtitle={
          profile.role === 'employee'
            ? 'Clock in before moving assigned projects beyond Open, and leave a note every time you change status.'
            : 'Admins can update assigned projects, review notes, and help move work through the workflow.'
        }
      >
        <div className="table-wrap dispatch-table-wrap">
          <table className="dispatch-queue-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Project / Work</th>
                <th>Status</th>
                <th>Business / Service Area</th>
                <th>Quote / Start</th>
                <th>Latest Note</th>
                <th className="dispatch-action-cell">Project Update</th>
                <th className="invoice-action-cell">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>#{job.id}</td>
                  <td>{job.customerName || '-'}</td>
                  <td>
                    <strong>{job.title || job.type}</strong>
                    <div className="sub-cell">{job.type} / {job.category}</div>
                  </td>
                  <td>{formatTicketStatus(job.status)}</td>
                  <td>{job.address || '-'}</td>
                  <td>
                    <div>Start: <strong>{formatDate(job.scheduledDate)}</strong></div>
                    <div>Quote: <strong>{money(job.quoteAmount)}</strong></div>
                    <p className="sub-cell">{job.quoteText || 'No quote details attached.'}</p>
                  </td>
                  <td>
                    <div>{job.note || '-'}</div>
                    {Array.isArray(job.dispatchHistory) && job.dispatchHistory.length > 1 && (
                      <div className="sub-cell">
                        {job.dispatchHistory.slice(-2).map((entry) => formatTicketStatus(entry.status)).join(' -> ')}
                      </div>
                    )}
                  </td>
                  <td className="dispatch-action-cell">{renderDispatchControls(job)}</td>
                  <td className="invoice-action-cell">{renderInvoiceControls(job)}</td>
                </tr>
              ))}
              {!jobs.length && (
                <tr>
                  <td colSpan="9">Assigned website projects will appear here once they are approved and assigned to you.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mobile-record-list">
          {jobs.map((job) => (
            <article className="mobile-record-card" key={`mobile-${job.id}`}>
              <div className="mobile-record-head">
                <span className="badge">#{job.id}</span>
                <span className="status-pill">{formatTicketStatus(job.status)}</span>
              </div>
              <h4>{job.title || job.type}</h4>
              <p>{job.customerName || '-'}</p>

              <dl className="mobile-detail-grid">
                <div>
                  <dt>Project</dt>
                  <dd>{job.type} / {job.category}</dd>
                </div>
                <div>
                  <dt>Start</dt>
                  <dd>{formatDate(job.scheduledDate)}</dd>
                </div>
                <div>
                  <dt>Quote</dt>
                  <dd>{money(job.quoteAmount)}</dd>
                </div>
                <div>
                  <dt>Address</dt>
                  <dd>{job.address || '-'}</dd>
                </div>
              </dl>

              <div className="mobile-note-block">
                <strong>Latest Note</strong>
                <p>{job.note || 'No project note yet.'}</p>
              </div>

              <div className="mobile-card-section">
                <h5>Project Update</h5>
                {renderDispatchControls(job)}
              </div>

              <div className="mobile-card-section">
                <h5>Invoice</h5>
                {renderInvoiceControls(job)}
              </div>
            </article>
          ))}

          {!jobs.length && (
            <p className="sub-cell">Assigned website projects will appear here once they are approved and assigned to you.</p>
          )}
        </div>
      </Card>
    </PortalLayout>
  )
}
