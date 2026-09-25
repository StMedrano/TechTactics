import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PortalLayout from '../../../components/layout/PortalLayout'
import Card from '../../../components/ui/Card'
import StatCard from '../../../components/ui/StatCard'
import { appService } from '../../../services/appService'
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

function getTodayDate() {
  return new Date().toISOString().slice(0, 10)
}

function getLatestHistoryEntry(request) {
  if (!Array.isArray(request?.dispatchHistory) || !request.dispatchHistory.length) {
    return null
  }

  return request.dispatchHistory[request.dispatchHistory.length - 1]
}

const initialReviewForm = {
  quote: '',
  rating: '5',
}

export default function CustomerDashboardPage() {
  const [data, setData] = useState({ services: [], requests: [], invoices: [], reviewRequests: [] })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [reviewForms, setReviewForms] = useState({})
  const [quoteForms, setQuoteForms] = useState({})
  const [submittingReviewId, setSubmittingReviewId] = useState('')
  const [respondingQuoteId, setRespondingQuoteId] = useState('')

  const loadDashboard = async () => {
    try {
      const payload = await appService.getCustomerDashboard()
      setData({
        services: payload?.services || [],
        requests: payload?.requests || [],
        invoices: payload?.invoices || [],
        reviewRequests: payload?.reviewRequests || [],
      })
      setError('')
    } catch (err) {
      setError(err.message || 'Unable to load customer dashboard.')
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const totalDue = data.invoices.reduce((sum, item) => sum + Number(item.balance || item.amount || 0), 0)
  const pendingQuotes = data.requests.filter((request) => normalizeTicketStatus(request.status) === 'quote_sent')
  const depositPendingRequests = data.requests.filter(
    (request) => normalizeTicketStatus(request.status) === 'deposit_pending',
  )

  const updateReviewField = (ticketId, key, value) => {
    setReviewForms((current) => ({
      ...current,
      [ticketId]: {
        ...(current[ticketId] || initialReviewForm),
        [key]: value,
      },
    }))
  }

  const submitReview = async (ticketId) => {
    const form = reviewForms[ticketId] || initialReviewForm
    setSubmittingReviewId(ticketId)
    setError('')
    setMessage('')

    try {
      await appService.submitReview(ticketId, form)
      setMessage('Thank you. Your review is now published on the website.')
      setReviewForms((current) => ({
        ...current,
        [ticketId]: initialReviewForm,
      }))
      await loadDashboard()
    } catch (err) {
      setError(err.message || 'Unable to submit your review.')
    } finally {
      setSubmittingReviewId('')
    }
  }

  const updateQuoteField = (ticketId, key, value) => {
    setQuoteForms((current) => ({
      ...current,
      [ticketId]: {
        ...(current[ticketId] || {}),
        [key]: value,
      },
    }))
  }

  const respondToQuote = async (request, status) => {
    if (!window.confirm(status === 'approved' ? 'Approve this quote and create the 50% deposit invoice?' : 'Reject this quote?')) {
      return
    }

    setRespondingQuoteId(request.id)
    setError('')
    setMessage('')

    try {
      await appService.respondToTicketQuote(request.id, {
        status,
      })
      setMessage(status === 'approved' ? 'Quote approved. A 50% deposit invoice was created. Pay it before scheduling.' : 'Quote rejected.')
      await loadDashboard()
    } catch (err) {
      setError(err.message || 'Unable to update this quote.')
    } finally {
      setRespondingQuoteId('')
    }
  }

  const scheduleInstall = async (request) => {
    const form = quoteForms[request.id] || {}

    if (!form.scheduledDate) {
      setError('Choose a project start date after paying the 50% deposit.')
      return
    }

    if (!window.confirm('Check the deposit payment and schedule this project start date?')) {
      return
    }

    setRespondingQuoteId(request.id)
    setError('')
    setMessage('')

    try {
      await appService.scheduleTicketInstall(request.id, {
        scheduledDate: form.scheduledDate,
      })
      setMessage('Deposit confirmed. Your project start has been scheduled and assigned.')
      await loadDashboard()
    } catch (err) {
      setError(err.message || 'Unable to schedule this project start.')
    } finally {
      setRespondingQuoteId('')
    }
  }

  return (
    <PortalLayout title="Customer Dashboard">
      {error && <Card title="Load Error"><p>{error}</p></Card>}
      {message && <Card title="Portal Update"><p>{message}</p></Card>}
      <div className="grid grid-3">
        <StatCard label="Current Website Services" value={data.services.length} helper="Active website projects and support plans" />
        <StatCard label="Open Requests" value={data.requests.length} helper="Website changes, content, and support requests" />
        <StatCard label="Unpaid Invoices" value={money(totalDue)} helper="Pay through Zoho Books SecurePay / Square" />
      </div>

      <div className="grid grid-3 portal-grid-gap">
        <Card title="Current Website Services">
          <ul className="clean-list">
            {data.services.map((service) => (
              <li key={service.id}>{service.serviceName} <span>{service.category}</span></li>
            ))}
          </ul>
        </Card>

        <Card title="Latest Request">
          {data.requests[0] && (
            <div className="stack gap-sm">
              <strong>{data.requests[0].title || data.requests[0].category}</strong>
              <div className="sub-cell">{data.requests[0].type} - {data.requests[0].category}</div>
              <span className="badge">{formatTicketStatus(data.requests[0].status)}</span>
              <div className="sub-cell">
                Assigned To: {data.requests[0].assignedEmployee || 'Pending admin review'}
              </div>
              <p>{getLatestHistoryEntry(data.requests[0])?.note || data.requests[0].note}</p>
            </div>
          )}
        </Card>

        <Card title="Billing Snapshot">
          <div className="stack gap-sm">
            <div>Total Due: <strong>{money(totalDue)}</strong></div>
            <p>Your payment buttons open Zoho Books SecurePay. Square is available there when enabled in Zoho Books.</p>
          </div>
        </Card>
      </div>

      <Card
        title="Quotes Awaiting Your Approval"
        subtitle="Review the admin quote. Approval creates a 50% deposit invoice; scheduling unlocks after the deposit is paid."
      >
        {pendingQuotes.length ? (
          <div className="stack gap-md">
            {pendingQuotes.map((request) => {
              const form = quoteForms[request.id] || {}
              const isSubmitting = respondingQuoteId === request.id

              return (
                <div className="quote-panel" key={request.id}>
                  <div>
                    <strong>#{request.id} {request.title || request.type}</strong>
                    <p>{request.quoteText || request.note || 'Quote details are ready for review.'}</p>
                    <div className="sub-cell">Quote amount: <strong>{money(request.quoteAmount)}</strong></div>
                    <div className="sub-cell">Deposit due before scheduling: <strong>{money(Number(request.quoteAmount || 0) * 0.5)}</strong></div>
                  </div>
                  <div className="inline-actions compact-actions">
                    <button
                      className="btn btn-primary"
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => respondToQuote(request, 'approved')}
                    >
                      {isSubmitting ? 'Saving...' : 'Approve Quote'}
                    </button>
                    <button
                      className="btn btn-secondary danger-outline"
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => respondToQuote(request, 'rejected')}
                    >
                      Reject Quote
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p>No quotes are waiting for your approval right now.</p>
        )}
      </Card>

      <Card
        title="Deposit Required Before Scheduling"
        subtitle="Pay the 50% deposit from the Payments page, then choose your project start date here."
      >
        {depositPendingRequests.length ? (
          <div className="stack gap-md">
            {depositPendingRequests.map((request) => {
              const form = quoteForms[request.id] || {}
              const isSubmitting = respondingQuoteId === request.id

              return (
                <div className="quote-panel" key={request.id}>
                  <div>
                    <strong>#{request.id} {request.title || request.type}</strong>
                    <p>{request.quoteText || request.note || 'Your quote was approved. Deposit is required before scheduling.'}</p>
                    <div className="sub-cell">Quote amount: <strong>{money(request.quoteAmount)}</strong></div>
                    <div className="sub-cell">50% deposit required: <strong>{money(Number(request.quoteAmount || 0) * 0.5)}</strong></div>
                  </div>
                  <label>
                    Requested project start date
                    <input
                      type="date"
                      min={getTodayDate()}
                      value={form.scheduledDate || request.scheduledDate || ''}
                      onChange={(event) => updateQuoteField(request.id, 'scheduledDate', event.target.value)}
                    />
                  </label>
                  <div className="inline-actions compact-actions">
                    <Link className="btn btn-secondary" to="/portal/customer/payments">
                      Pay Deposit
                    </Link>
                    <button
                      className="btn btn-primary"
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => scheduleInstall(request)}
                    >
                      {isSubmitting ? 'Checking Deposit...' : 'Check Deposit & Schedule'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p>No approved quotes are waiting on a deposit right now.</p>
        )}
      </Card>

      <Card
        title="Review Requests"
        subtitle="When a website project is completed, your feedback can be submitted here and featured on the website."
      >
        {data.reviewRequests.length ? (
          <div className="stack gap-md">
            {data.reviewRequests.map((request) => {
              const form = reviewForms[request.ticketId] || initialReviewForm
              const isSubmitting = submittingReviewId === request.ticketId

              return (
                <div className="info-card stack gap-sm" key={request.ticketId}>
                  <strong>{request.serviceTitle}</strong>
                  <div className="sub-cell">{request.category}</div>
                  <label>
                    Rating
                    <select value={form.rating} onChange={(event) => updateReviewField(request.ticketId, 'rating', event.target.value)}>
                      <option value="5">5 - Excellent</option>
                      <option value="4">4 - Very Good</option>
                      <option value="3">3 - Good</option>
                      <option value="2">2 - Fair</option>
                      <option value="1">1 - Needs Improvement</option>
                    </select>
                  </label>
                  <label>
                    Review
                    <textarea
                      rows="4"
                      value={form.quote}
                      onChange={(event) => updateReviewField(request.ticketId, 'quote', event.target.value)}
                      placeholder="Tell future customers what went well."
                    />
                  </label>
                  <div className="inline-actions">
                    <button
                      className="btn btn-primary"
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => submitReview(request.ticketId)}
                    >
                      {isSubmitting ? 'Submitting Review...' : 'Submit Review'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p>Completed website projects that need your feedback will appear here automatically.</p>
        )}
      </Card>

      <Card
        title="Project Activity"
        subtitle="Track approvals, assignments, project updates, and completion notes for your requests."
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Request</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Updated</th>
                <th>Latest Note</th>
              </tr>
            </thead>
            <tbody>
              {data.requests.map((request) => {
                const latestEntry = getLatestHistoryEntry(request)

                return (
                  <tr key={request.id}>
                    <td>{request.title || request.type || request.category}</td>
                    <td>{formatTicketStatus(request.status)}</td>
                    <td>{request.assignedEmployee || 'Pending assignment'}</td>
                    <td>{request.scheduledDate ? formatDate(request.scheduledDate) : request.updatedAt || request.createdAt || '-'}</td>
                    <td>{latestEntry?.note || request.note || '-'}</td>
                  </tr>
                )
              })}
              {!data.requests.length && (
                <tr>
                  <td colSpan="5">Your website project activity will appear here after your first request.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </PortalLayout>
  )
}
