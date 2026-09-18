import { useEffect, useMemo, useState } from 'react'
import PortalLayout from '../../../components/layout/PortalLayout'
import Card from '../../../components/ui/Card'
import { appService } from '../../../services/appService'
import { money } from '../../../utils/formatters'

function formatStatus(value) {
  return String(value || '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function buildPurchasedItems(requests, invoices) {
  const invoiceByTicketId = new Map(
    invoices
      .filter((invoice) => invoice.ticketId)
      .map((invoice) => [String(invoice.ticketId), invoice]),
  )

  const requestItems = requests
    .filter((request) => String(request.status || '').toLowerCase() !== 'rejected')
    .map((request) => {
      const linkedInvoice = invoiceByTicketId.get(String(request.id))
      return {
        id: `request-${request.id}`,
        name: request.title || request.category || request.type || 'Service request',
        category: request.category || request.type || 'Service',
        status: formatStatus(linkedInvoice?.status || request.status || 'requested'),
        purchasedAt: request.updatedAt || request.createdAt || '',
        amount: Number(linkedInvoice?.amount || 0),
        detail: linkedInvoice?.invoiceNumber || request.type || '',
      }
    })

  const ticketIds = new Set(requests.map((request) => String(request.id)))
  const invoiceOnlyItems = invoices
    .filter((invoice) => !ticketIds.has(String(invoice.ticketId || '')))
    .map((invoice) => ({
      id: `invoice-${invoice.id}`,
      name: invoice.description || invoice.invoiceNumber || 'Purchased item',
      category: 'Billing',
      status: formatStatus(invoice.status || 'sent'),
      purchasedAt: invoice.invoiceNumber || '',
      amount: Number(invoice.amount || 0),
      detail: invoice.invoiceNumber || '',
    }))

  return [...requestItems, ...invoiceOnlyItems]
}

export default function CustomerServicesPage() {
  const [data, setData] = useState({ services: [], requests: [], invoices: [] })
  const [error, setError] = useState('')

  useEffect(() => {
    appService
      .getCustomerDashboard()
      .then((payload) => {
        setData({
          services: payload?.services || [],
          requests: payload?.requests || [],
          invoices: payload?.invoices || [],
        })
      })
      .catch((err) => {
        setError(err.message || 'Unable to load your services.')
      })
  }, [])

  const purchasedItems = useMemo(
    () => buildPurchasedItems(data.requests, data.invoices),
    [data.requests, data.invoices],
  )

  return (
    <PortalLayout title="My Services">
      {error && (
        <Card title="Load Error">
          <p>{error}</p>
        </Card>
      )}

      <div className="grid grid-2 portal-grid-gap">
        <Card title="Recurring Services" subtitle="Monthly and ongoing plans tied to your account.">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Monthly</th>
                </tr>
              </thead>
              <tbody>
                {data.services.map((service) => (
                  <tr key={service.id}>
                    <td>{service.serviceName}</td>
                    <td>{service.category}</td>
                    <td>{service.status}</td>
                    <td>{service.startedAt}</td>
                    <td>{money(service.monthlyPrice)}</td>
                  </tr>
                ))}
                {!data.services.length && (
                  <tr>
                    <td colSpan="5">No recurring services are linked to this account yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Purchased Items" subtitle="Approved requests, installs, and one-time purchases.">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Reference</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {purchasedItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.category}</td>
                    <td>{item.status}</td>
                    <td>{item.detail || item.purchasedAt || '-'}</td>
                    <td>{item.amount ? money(item.amount) : '-'}</td>
                  </tr>
                ))}
                {!purchasedItems.length && (
                  <tr>
                    <td colSpan="5">Purchased and approved items will appear here after admin review.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </PortalLayout>
  )
}
