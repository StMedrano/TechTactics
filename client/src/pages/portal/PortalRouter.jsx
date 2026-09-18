import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import CustomerDashboardPage from './customer/CustomerDashboardPage'
import CustomerServicesPage from './customer/CustomerServicesPage'
import CustomerRequestHelpPage from './customer/CustomerRequestHelpPage'
import PaymentsPage from './customer/PaymentsPage'
import CustomerProfilePage from './customer/CustomerProfilePage'
import EmployeeDashboardPage from './employee/EmployeeDashboardPage'
import TimeClockPage from './employee/TimeClockPage'
import JobsPage from './employee/JobsPage'
import MyPayPage from './employee/MyPayPage'
import EmployeeProfilePage from './employee/EmployeeProfilePage'
import AdminDashboardPage from './admin/AdminDashboardPage'
import UsersPage from './admin/UsersPage'
import EmployeesPage from './admin/EmployeesPage'
import TicketsPage from './admin/TicketsPage'
import InvoicesPage from './admin/InvoicesPage'
import ZohoSetupPage from './admin/ZohoSetupPage'

export default function PortalRouter() {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />

  return (
    <Routes>
      {user.role === 'customer' && (
        <>
          <Route path="customer" element={<CustomerDashboardPage />} />
          <Route path="customer/services" element={<CustomerServicesPage />} />
          <Route path="customer/request-help" element={<CustomerRequestHelpPage />} />
          <Route path="customer/payments" element={<PaymentsPage />} />
          <Route path="customer/profile" element={<CustomerProfilePage />} />
          <Route path="*" element={<Navigate to="/portal/customer" replace />} />
        </>
      )}

      {user.role === 'employee' && (
        <>
          <Route path="employee" element={<EmployeeDashboardPage />} />
          <Route path="employee/time-clock" element={<TimeClockPage />} />
          <Route path="employee/jobs" element={<JobsPage />} />
          <Route path="employee/pay" element={<MyPayPage />} />
          <Route path="employee/profile" element={<EmployeeProfilePage />} />
          <Route path="*" element={<Navigate to="/portal/employee" replace />} />
        </>
      )}

      {user.role === 'admin' && (
        <>
          <Route path="admin" element={<AdminDashboardPage />} />
          <Route path="admin/time-clock" element={<TimeClockPage />} />
          <Route path="admin/jobs" element={<JobsPage />} />
          <Route path="admin/users" element={<UsersPage />} />
          <Route path="admin/employees" element={<EmployeesPage />} />
          <Route path="admin/tickets" element={<TicketsPage />} />
          <Route path="admin/invoices" element={<InvoicesPage />} />
          <Route path="admin/integrations" element={<ZohoSetupPage />} />
          <Route path="*" element={<Navigate to="/portal/admin" replace />} />
        </>
      )}
    </Routes>
  )
}
