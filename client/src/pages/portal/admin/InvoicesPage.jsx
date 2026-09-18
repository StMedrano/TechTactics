import { useEffect, useMemo, useState } from 'react'
import PortalLayout from '../../../components/layout/PortalLayout'
import Card from '../../../components/ui/Card'
import { appService } from '../../../services/appService'
import { zohoService } from '../../../services/zohoService'
import { money } from '../../../utils/formatters'

function formatStatus(value) {
  return String(value || '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function canInvoiceRequest(request, invoicesByTicketId) {
  const normalizedStatus = String(request?.status || '').toLowerCase().replace(/[\s-]+/g, '_')
  return !['pending_approval', 'quote_sent', 'quote_rejected', 'deposit_pending', 'rejected'].includes(normalizedStatus) && !invoicesByTicketId.has(String(request?.id))
}

function isDepositInvoice(invoice) {
  const description = String(invoice?.description || '').toLowerCase()
  return description.includes('50% deposit') || description.includes('deposit invoice')
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

export default function InvoicesPage() {
  const [data, setData] = useState({ users: [], requests: [], invoices: [] })
  const [selectedTicketId, setSelectedTicketId] = useState('')
  const [selectedBooksItemId, setSelectedBooksItemId] = useState('')
  const [invoiceItems, setInvoiceItems] = useState([])
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('Portal-generated invoice')
  const [paymentLink, setPaymentLink] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [loadingPaymentInvoiceId, setLoadingPaymentInvoiceId] = useState('')
  const [booksItems, setBooksItems] = useState([])
  const [booksItemStatus, setBooksItemStatus] = useState('')

  async function loadData() {
    try {
      const [payload, booksPayload] = await Promise.all([
        appService.getAdminDashboard(),
        zohoService
          .listItems()
          .catch((err) => ({ items: [], itemError: err.message || 'Zoho Books items are not available.' })),
      ])
      setData({
        users: payload?.users || [],
        requests: payload?.requests || [],
        invoices: payload?.invoices || [],
      })
      setBooksItems(Array.isArray(booksPayload?.items) ? booksPayload.items : [])
      setBooksItemStatus(booksPayload?.itemError || '')
      setError('')
    } catch (err) {
      setError(err.message || 'Unable to load invoice data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const usersById = useMemo(
    () => new Map((data.users || []).map((user) => [String(user.id), user])),
    [data.users],
  )

  const invoicesByTicketId = useMemo(
    () => new Map((data.invoices || []).filter((invoice) => invoice.ticketId && !isDepositInvoice(invoice)).map((invoice) => [String(invoice.ticketId), invoice])),
    [data.invoices],
  )

  const billableRequests = useMemo(
    () => (data.requests || []).filter((request) => canInvoiceRequest(request, invoicesByTicketId)),
    [data.requests, invoicesByTicketId],
  )

  useEffect(() => {
    if (!billableRequests.length) {
      setSelectedTicketId('')
      return
    }

    const stillAvailable = billableRequests.some((request) => String(request.id) === String(selectedTicketId))
    if (!stillAvailable) {
      setSelectedTicketId(String(billableRequests[0].id))
    }
  }, [billableRequests, selectedTicketId])

  const selectedRequest = useMemo(
    () => billableRequests.find((request) => String(request.id) === String(selectedTicketId)) || null,
    [billableRequests, selectedTicketId],
  )

  const selectedCustomer = selectedRequest ? usersById.get(String(selectedRequest.customerId)) : null

  useEffect(() => {
    setSelectedBooksItemId('')
    setInvoiceItems([])
    setAmount('')
  }, [selectedTicketId])

  function handleAddInvoiceItem() {
    const item = booksItems.find((booksItem) => String(booksItem.id) === String(selectedBooksItemId))
    if (!item) {
      setError('Choose a Zoho Books item before adding it to the invoice.')
      return
    }

    const price = getBooksItemPrice(item)
    if (price <= 0) {
      setError('This Zoho Books item does not have a sale price or cost to pull.')
      return
    }

    const invoiceItem = {
      itemId: item.itemId || item.id,
      name: item.name,
      description: item.description || `Zoho Books item for ticket #${selectedRequest?.id || ''}`,
      quantity: 1,
      rate: price,
      cost: Number(item.cost || 0),
    }

    setInvoiceItems((current) => {
      const nextItems = [...current, invoiceItem]
      const total = getLineItemTotal(nextItems)
      setAmount(total ? String(total.toFixed(2)) : '')
      return nextItems
    })
    setSelectedBooksItemId('')
    setNotes((current) => {
      const itemNote = `${item.name}${item.description ? ` - ${item.description}` : ''}`
      const existing = String(current || '').trim()
      return existing ? `${existing}\n${itemNote}` : itemNote
    })
  }

  function handleRemoveInvoiceItem(index) {
    setInvoiceItems((current) => {
      const nextItems = current.filter((_, itemIndex) => itemIndex !== index)
      const total = getLineItemTotal(nextItems)
      setAmount(total ? String(total.toFixed(2)) : '')
      return nextItems
    })
  }

  async function handleCreateInvoice(event) {
    event.preventDefault()
    if (!selectedRequest) {
      setError('Select a service request to invoice.')
      return
    }

    setSubmitting(true)
    setMessage('')
    setError('')
    setPaymentLink('')

    try {
      const itemTotal = getLineItemTotal(invoiceItems)
      const result = await zohoService.createInvoice({
        payload: {
          ticketId: selectedRequest.id,
          amount: Number(amount || itemTotal || selectedRequest.quoteAmount || 0),
          notes,
          items: invoiceItems,
        },
      })

      setMessage(`Invoice ${result?.storedInvoice?.invoiceNumber || ''} created successfully.`.trim())
      setPaymentLink(result?.storedInvoice?.paymentLink || '')
      setAmount('')
      setSelectedBooksItemId('')
      setInvoiceItems([])
      await loadData()
    } catch (err) {
      setError(err.message || 'Unable to create the invoice.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleOpenPaymentLink(invoice) {
    setLoadingPaymentInvoiceId(invoice.id)
    setError('')

    try {
      const result = await zohoService.getHostedPaymentPage({
        invoiceId: invoice.zohoInvoiceId || invoice.id,
      })
      if (result?.paymentUrl) {
        setPaymentLink(result.paymentUrl)
        return
      }
      setError('No hosted payment link is available for this invoice yet.')
    } catch (err) {
      setError(err.message || 'Unable to load the hosted payment link.')
    } finally {
      setLoadingPaymentInvoiceId('')
    }
  }

  return (
    <PortalLayout title="Invoices">
      {error && (
        <Card title="Load Error">
          <p>{error}</p>
        </Card>
      )}

      {message && (
        <Card title="Invoice Created">
          <p>{message}</p>
        </Card>
      )}

      <div className="grid grid-2 portal-grid-gap">
        <Card title="Create Invoice" subtitle="Choose an approved request and turn it into a Zoho Books invoice.">
          {loading ? (
            <p>Loading invoice-ready requests...</p>
          ) : billableRequests.length ? (
            <form className="form-grid" onSubmit={handleCreateInvoice}>
              <label className="full-width">
                Request
                <select value={selectedTicketId} onChange={(event) => setSelectedTicketId(event.target.value)}>
                  {billableRequests.map((request) => (
                    <option key={request.id} value={request.id}>
                      #{request.id} - {request.title || request.type} - {request.customerName || usersById.get(String(request.customerId))?.name || 'Customer'}
                    </option>
                  ))}
                </select>
              </label>

              <label className="full-width">
                Pull Cost From Zoho Books
                {booksItems.length ? (
                  <div className="line-item-picker">
                    <select value={selectedBooksItemId} onChange={(event) => setSelectedBooksItemId(event.target.value)}>
                      <option value="">Choose a Books item...</option>
                      {booksItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {getBooksItemLabel(item)}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn btn-secondary"
                      type="button"
                      disabled={submitting}
                      onClick={handleAddInvoiceItem}
                    >
                      Add Item
                    </button>
                  </div>
                ) : (
                  <div className="sub-cell">
                    {booksItemStatus || 'No Zoho Books items were returned for invoice pricing.'}
                  </div>
                )}
              </label>

              {invoiceItems.length > 0 && (
                <div className="full-width line-item-list">
                  {invoiceItems.map((item, index) => (
                    <div className="line-item-row" key={`${item.itemId || item.name}-${index}`}>
                      <span>{item.name}</span>
                      <strong>{money(Number(item.rate || 0))}</strong>
                      <button type="button" onClick={() => handleRemoveInvoiceItem(index)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <label>
                Invoice Amount
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder={selectedRequest?.quoteAmount ? String(selectedRequest.quoteAmount) : '0.00'}
                />
              </label>

              <label>
                Customer Zoho Contact
                <input value={selectedCustomer?.zohoContactId || 'Will be created in Zoho Books'} readOnly />
              </label>

              <label className="full-width">
                Invoice Notes
                <textarea
                  rows="4"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Add internal notes or customer-facing invoice details."
                />
              </label>

              <div className="full-width inline-actions">
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? 'Creating Invoice...' : 'Create Zoho Invoice'}
                </button>
              </div>
            </form>
          ) : (
            <p>Requests become invoice-ready after they are approved. Pending or rejected requests will not show here.</p>
          )}
        </Card>

        <Card title="Selected Request" subtitle="Review the customer and service details before billing.">
          {selectedRequest ? (
            <div className="stack gap-sm">
              <strong>{selectedRequest.title || selectedRequest.type}</strong>
              <div className="sub-cell">{selectedRequest.type} - {selectedRequest.category}</div>
              <div>Customer: <strong>{selectedRequest.customerName || selectedCustomer?.name || 'Unknown customer'}</strong></div>
              <div>Address: <strong>{selectedRequest.address || 'No address provided'}</strong></div>
              <div>Status: <strong>{formatStatus(selectedRequest.status)}</strong></div>
              {selectedRequest.quoteAmount > 0 && (
                <div>Approved Quote: <strong>{money(selectedRequest.quoteAmount)}</strong></div>
              )}
              {selectedRequest.scheduledDate && (
                <div>Install Date: <strong>{selectedRequest.scheduledDate}</strong></div>
              )}
              <p>{selectedRequest.description || 'No request details were provided.'}</p>
              <p className="sub-cell">{selectedRequest.note}</p>
              {!selectedCustomer?.zohoContactId && (
                <p>The portal will create or match this customer in Zoho Books when the invoice is created.</p>
              )}
            </div>
          ) : (
            <p>Select a billable request to review it here.</p>
          )}
        </Card>
      </div>

      {paymentLink && (
        <Card title="Hosted Payment Link" subtitle="Share this Zoho-hosted payment page with the customer when needed.">
          <p>
            <a href={paymentLink} target="_blank" rel="noreferrer">
              Open hosted payment page
            </a>
          </p>
        </Card>
      )}

      <Card title="Stored Invoices" subtitle="Invoices saved in Catalyst and linked back to portal requests.">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Request</th>
                <th>Invoice</th>
                <th>Status</th>
                <th>Total</th>
                <th>Balance</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {(data.invoices || []).map((invoice) => (
                <tr key={invoice.id}>
                  <td>#{invoice.ticketId || '-'}</td>
                  <td>
                    {invoice.invoiceNumber || invoice.zohoInvoiceId || 'Pending'}
                    <div className="sub-cell">{invoice.description}</div>
                  </td>
                  <td>{formatStatus(invoice.status)}</td>
                  <td>{money(invoice.amount)}</td>
                  <td>{money(invoice.balance)}</td>
                  <td>
                    <button
                      className="btn btn-secondary"
                      type="button"
                      disabled={loadingPaymentInvoiceId === invoice.id || (!invoice.paymentLink && !invoice.zohoInvoiceId)}
                      onClick={() => handleOpenPaymentLink(invoice)}
                    >
                      {loadingPaymentInvoiceId === invoice.id ? 'Loading...' : 'Open Payment Link'}
                    </button>
                  </td>
                </tr>
              ))}
              {!data.invoices.length && (
                <tr>
                  <td colSpan="6">No invoices have been stored yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </PortalLayout>
  )
}
