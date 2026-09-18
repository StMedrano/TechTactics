import { useMemo, useState } from 'react'
import PortalLayout from '../../../components/layout/PortalLayout'
import Card from '../../../components/ui/Card'
import { appService } from '../../../services/appService'
import {
  buildServiceRequestPayload,
  getCatalogEntries,
  getCatalogEntry,
} from '../../../data/serviceCatalog'

const initialForm = {
  catalogType: 'services',
  offerKey: 'smart-home-installations',
  requestedItem: '',
  address: '',
  description: '',
}

export default function CustomerRequestHelpPage() {
  const [form, setForm] = useState(initialForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const entries = useMemo(() => getCatalogEntries(form.catalogType), [form.catalogType])
  const selectedEntry = useMemo(
    () => getCatalogEntry(form.catalogType, form.offerKey),
    [form.catalogType, form.offerKey],
  )

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const onCatalogTypeChange = (value) => {
    const nextEntries = getCatalogEntries(value)
    setForm((current) => ({
      ...current,
      catalogType: value,
      offerKey: nextEntries[0]?.key || '',
      requestedItem: '',
    }))
  }

  const onOfferChange = (value) => {
    setForm((current) => ({
      ...current,
      offerKey: value,
      requestedItem: '',
    }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')
    setError('')

    try {
      const payload = buildServiceRequestPayload(form, selectedEntry)
      await appService.createServiceRequest(payload)
      setMessage('Service request submitted for admin quote review and approval.')
      setForm({
        ...initialForm,
        catalogType: form.catalogType,
        offerKey: getCatalogEntries(form.catalogType)[0]?.key || initialForm.offerKey,
      })
    } catch (err) {
      setError(err.message || 'Unable to submit the service request.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PortalLayout title="Request Assistance">
      <div className="grid grid-2 portal-grid-gap">
        <Card
          title="New Service Request"
          subtitle="Request a service or package and send Zoho-ready details through your portal ticket for admin quote review."
        >
          <form className="form-grid" onSubmit={onSubmit}>
            <label>
              Request Type
              <select value={form.catalogType} onChange={(event) => onCatalogTypeChange(event.target.value)}>
                <option value="services">Service</option>
                <option value="packages">Service Package</option>
              </select>
            </label>

            <label>
              Requested Offering
              <select value={form.offerKey} onChange={(event) => onOfferChange(event.target.value)}>
                {entries.map((entry) => (
                  <option key={entry.key} value={entry.key}>
                    {entry.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="full-width">
              Specific Need
              <select value={form.requestedItem} onChange={(event) => update('requestedItem', event.target.value)}>
                <option value="">Full service / not sure yet</option>
                {selectedEntry.includes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="full-width">
              Service Address
              <input value={form.address} onChange={(event) => update('address', event.target.value)} />
            </label>

            <label className="full-width">
              Additional Details
              <textarea
                rows="5"
                value={form.description}
                onChange={(event) => update('description', event.target.value)}
                placeholder="Tell us about the install, issue, or outcome you want."
              />
            </label>

            <div className="full-width inline-actions">
              <button className="btn btn-primary" type="submit" disabled={submitting}>
                {submitting ? 'Submitting Request...' : 'Submit Request'}
              </button>
            </div>
          </form>

          {message && <p className="success-text">{message}</p>}
          {error && <p>{error}</p>}
        </Card>

        <Card
          title={selectedEntry.title}
          subtitle={`${selectedEntry.requestType} - ${selectedEntry.summary}`}
        >
          <div className="stack gap-sm">
            <strong>Included services</strong>
            <ul className="clean-list bullets request-includes">
              {selectedEntry.includes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <div className="request-preview">
              <strong>Zoho Books request label</strong>
              <div className="sub-cell">
                {form.requestedItem ? `${selectedEntry.title} - ${form.requestedItem}` : selectedEntry.title}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </PortalLayout>
  )
}
