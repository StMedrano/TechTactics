import { useEffect, useState } from 'react'
import PortalLayout from '../../../components/layout/PortalLayout'
import StatCard from '../../../components/ui/StatCard'
import Card from '../../../components/ui/Card'
import { appService } from '../../../services/appService'

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export default function EmployeeDashboardPage() {
  const [data, setData] = useState({ profile: {}, jobs: [], paychecks: [], timeEntries: [] })
  const [error, setError] = useState('')

  useEffect(() => {
    appService
      .getEmployeeDashboard()
      .then((payload) => {
        setData({
          profile: payload?.profile || {},
          jobs: payload?.jobs || [],
          paychecks: payload?.paychecks || [],
          timeEntries: payload?.timeEntries || [],
        })
      })
      .catch((err) => {
        setError(err.message || 'Unable to load employee dashboard.')
      })
  }, [])

  return (
    <PortalLayout title="Employee Dashboard">
      {error && <Card title="Load Error"><p>{error}</p></Card>}
      <div className="grid grid-3">
        <StatCard label="Time Clock" value={data.profile.isClockedIn ? 'Clocked In' : 'Clocked Out'} helper="Jobs stay hidden until clocked in" />
        <StatCard label="Active Jobs" value={data.jobs.length} helper="Assigned service requests" />
        <StatCard label="Weekly Hours" value={data.profile.weeklyHours || 0} helper="Current pay period hours" />
      </div>

      <div className="grid grid-2 portal-grid-gap">
        <Card title="Assigned Jobs">
          <ul className="clean-list">
            {data.jobs.map((job) => (
              <li key={job.id}>#{job.id} • {job.type} • {job.category} <span>{job.status}</span></li>
            ))}
            {!data.jobs.length && <li>No jobs are assigned yet.</li>}
          </ul>
        </Card>
        <Card title="Current Shift">
          <p>
            Active Shift Started:{' '}
            <strong>{data.profile.activeTimeEntry?.startedAt ? formatDateTime(data.profile.activeTimeEntry.startedAt) : '-'}</strong>
          </p>
          <p>{data.profile.payType} technician compensation is displayed in the pay section.</p>
          <p>Total Recorded Shifts: <strong>{data.timeEntries.length}</strong></p>
        </Card>
      </div>
    </PortalLayout>
  )
}
