import { useEffect, useState } from 'react'
import PortalLayout from '../../../components/layout/PortalLayout'
import Card from '../../../components/ui/Card'
import { appService } from '../../../services/appService'
import { money } from '../../../utils/formatters'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([])

  useEffect(() => {
    appService.getEmployees().then(setEmployees)
  }, [])

  return (
    <PortalLayout title="Employees">
      <Card title="Employee Directory">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Active</th>
                <th>Max Jobs</th>
                <th>Pay</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td>{employee.email}</td>
                  <td>{employee.name || [employee.firstName, employee.lastName].filter(Boolean).join(' ') || '-'}</td>
                  <td>{employee.isActive ? 'Yes' : 'No'}</td>
                  <td>{employee.maxActiveJobs}</td>
                  <td>
                    {employee.payType === 'Hourly'
                      ? `Hourly: ${money(employee.hourlyRate)}`
                      : `Salary: ${money(employee.annualSalary)}`}
                  </td>
                </tr>
              ))}
              {!employees.length && (
                <tr>
                  <td colSpan="5">No staffed portal users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </PortalLayout>
  )
}
