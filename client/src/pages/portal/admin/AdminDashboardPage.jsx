import { useEffect, useState } from 'react'
import PortalLayout from '../../../components/layout/PortalLayout'
import Card from '../../../components/ui/Card'
import StatCard from '../../../components/ui/StatCard'
import { appService } from '../../../services/appService'

export default function AdminDashboardPage() {
  const [data, setData] = useState({ users: [], employees: [], requests: [], invoices: [] })
  const [error, setError] = useState('')

  useEffect(() => {
    appService
      .getAdminDashboard()
      .then((payload) => {
        setData({
          users: payload?.users || [],
          employees: payload?.employees || [],
          requests: payload?.requests || [],
          invoices: payload?.invoices || [],
        })
      })
      .catch((err) => {
        setError(err.message || 'Unable to load admin dashboard.')
      })
  }, [])

  return (
    <PortalLayout title="Admin Dashboard">
      {error && <Card title="Load Error"><p>{error}</p></Card>}
      <div className="grid grid-4">
        <StatCard label="Users" value={data.users.length} helper="Customer, employee, and admin accounts" />
        <StatCard label="Employees" value={data.employees.length} helper="Manage staffing and pay" />
        <StatCard label="Service Tickets" value={data.requests.length} helper="Track open requests" />
        <StatCard label="Invoices" value={data.invoices.length} helper="Zoho Books billing flow" />
      </div>

      <div className="grid grid-2 mt">
        <Card title="What is ready">
          <ul>
            <li>Marketing site rebuilt in React</li>
            <li>Customer, employee, and admin portal routes</li>
            <li>Catalyst-backed auth and data APIs</li>
            <li>Payments UI ready for Zoho-hosted links</li>
          </ul>
        </Card>
        <Card title="What you plug in next">
          <ul>
            <li>Seed your Catalyst tables with production data</li>
            <li>Store hashed passwords in the Users table</li>
            <li>Connect Zoho refresh token once as admin</li>
            <li>Finalize invoice/contact payload mapping</li>
          </ul>
        </Card>
      </div>
    </PortalLayout>
  )
}
