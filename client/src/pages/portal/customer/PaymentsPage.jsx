import { useEffect, useState } from 'react'
import PortalLayout from '../../../components/layout/PortalLayout'
import Card from '../../../components/ui/Card'
import { appService } from '../../../services/appService'
import { zohoService } from '../../../services/zohoService'
import { money } from '../../../utils/formatters'

export default function PaymentsPage() {
  const [items, setItems] = useState([])
  const [activeLink, setActiveLink] = useState('')
  const [activeTitle, setActiveTitle] = useState('')
  const [error, setError] = useState('')
  const [loadingInvoiceId, setLoadingInvoiceId] = useState('')

  useEffect(() => {
    appService
      .getCustomerInvoices()
      .then((payload) => {
        setItems(Array.isArray(payload) ? payload : [])
        setError('')
      })
      .catch((err) => {
        setError(err.message || 'Unable to load invoices.')
      })
  }, [])

  function rememberPaymentLink(item, paymentPage) {
    setItems((current) =>
      current.map((invoice) =>
        invoice.id === item.id
          ? {
              ...invoice,
              paymentLink: paymentPage.paymentUrl || invoice.paymentLink,
              status: paymentPage.status || invoice.status,
              amount: paymentPage.amount || invoice.amount,
              balance: paymentPage.balance ?? invoice.balance,
            }
          : invoice,
      ),
    )
  }

  function openHostedPaymentPage(url, title, pendingWindow = null) {
    const openedWindow = pendingWindow || window.open(url, '_blank', 'noopener,noreferrer')
    if (pendingWindow) {
      pendingWindow.opener = null
      pendingWindow.location.href = url
    }
    setActiveLink(url)
    setActiveTitle(title)

    if (!openedWindow) {
      setError('Your browser blocked the payment window. Use the secure payment link below to continue.')
    }
  }

  async function handleOpenPayment(item) {
    const title = `Invoice ${item.invoiceNumber || item.zohoInvoiceId || item.id}`
    if (item.paymentLink) {
      openHostedPaymentPage(item.paymentLink, title)
      return
    }

    if (!item.zohoInvoiceId && !item.id) {
      setError('No payment link is available for this invoice yet.')
      return
    }

    setLoadingInvoiceId(item.id)
    setError('')
    const pendingWindow = window.open('about:blank', '_blank')
    if (pendingWindow) {
      pendingWindow.document.write('<p style="font-family: sans-serif;">Preparing your secure Zoho Books payment page...</p>')
    }

    try {
      const paymentPage = await zohoService.getHostedPaymentPage({
        invoiceId: item.zohoInvoiceId || item.id,
      })
      if (!paymentPage?.paymentUrl) {
        throw new Error('No hosted payment link is available for this invoice yet.')
      }
      rememberPaymentLink(item, paymentPage)
      openHostedPaymentPage(paymentPage.paymentUrl, title, pendingWindow)
    } catch (err) {
      if (pendingWindow) {
        pendingWindow.close()
      }
      setError(err.message || 'Unable to load the payment link.')
    } finally {
      setLoadingInvoiceId('')
    }
  }

  return (
    <PortalLayout title="Payments">
      {error && (
        <Card title="Load Error">
          <p>{error}</p>
        </Card>
      )}

      <Card title="Your Invoices" subtitle="Pay through Zoho Books SecurePay. Square appears there when enabled in Zoho Books.">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Request</th>
                <th>Invoice</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Pay</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>#{item.ticketId || '-'}<div className="sub-cell">{item.description}</div></td>
                  <td>{item.invoiceNumber}</td>
                  <td>{item.status}</td>
                  <td>{money(item.balance || item.amount)}</td>
                  <td>
                    <button
                      className="btn btn-secondary"
                      disabled={loadingInvoiceId === item.id || (!item.paymentLink && !item.zohoInvoiceId)}
                      onClick={() => handleOpenPayment(item)}
                    >
                      {loadingInvoiceId === item.id ? 'Loading...' : 'Pay Invoice'}
                    </button>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td colSpan="5">Invoices will appear here once TechTactics bills an approved request.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {activeLink && (
        <Card title={activeTitle} subtitle="Secure hosted payment page powered by Zoho Books.">
          <p>
            <a href={activeLink} target="_blank" rel="noreferrer">
              Open secure payment page
            </a>
          </p>
          <p className="sub-cell">
            If Square is enabled for online payments in Zoho Books, it will be available on this hosted page.
          </p>
          <button className="btn btn-primary mt" onClick={() => setActiveLink('')}>Hide Payment Link</button>
        </Card>
      )}
    </PortalLayout>
  )
}
