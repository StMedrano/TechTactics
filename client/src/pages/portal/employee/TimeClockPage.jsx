import { useEffect, useState } from 'react'
import PortalLayout from '../../../components/layout/PortalLayout'
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

function formatHours(value) {
  const hours = Number(value || 0)
  return `${hours.toFixed(2)} hrs`
}

function formatMiles(value) {
  return `${Number(value || 0).toFixed(1)} mi`
}

function getCurrentLocation({ required = false } = {}) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      if (required) {
        reject(new Error('GPS access is required to clock in on this device.'))
        return
      }

      resolve(null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: new Date(position.timestamp || Date.now()).toISOString(),
        })
      },
      () => {
        if (required) {
          reject(new Error('Allow GPS access before clocking in.'))
          return
        }

        resolve(null)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 20000,
      },
    )
  })
}

export default function TimeClockPage() {
  const [clockPayload, setClockPayload] = useState({
    isClockedIn: false,
    activeEntry: null,
    trackedMiles: 0,
  })
  const [timeEntries, setTimeEntries] = useState([])
  const [totalHours, setTotalHours] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadTimeClockData = async () => {
    try {
      const [clockData, attendance] = await Promise.all([
        appService.getClockStatus(),
        appService.getTimeEntries(),
      ])

      setClockPayload({
        isClockedIn: Boolean(clockData?.isClockedIn),
        activeEntry: clockData?.activeEntry || null,
        trackedMiles: Number(clockData?.trackedMiles || 0),
      })
      setTimeEntries(Array.isArray(attendance?.entries) ? attendance.entries : [])
      setTotalHours(Number(attendance?.totalHours || 0))
      setError('')
    } catch (err) {
      setError(err.message || 'Unable to load time clock data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTimeClockData()
  }, [])

  const broadcastClockChange = (payload) => {
    window.dispatchEvent(new CustomEvent('tt-clock-status-change', { detail: payload }))
  }

  const handleClockIn = async () => {
    setSaving(true)
    setMessage('')
    setError('')

    try {
      const location = await getCurrentLocation({ required: true })
      const payload = await appService.updateClockStatusWithLocation(true, location)
      setClockPayload({
        isClockedIn: Boolean(payload?.isClockedIn),
        activeEntry: payload?.activeEntry || null,
        trackedMiles: Number(payload?.trackedMiles || 0),
      })
      broadcastClockChange(payload)
      setMessage('Clocked in and GPS mileage tracking is active.')
      await loadTimeClockData()
    } catch (err) {
      setError(err.message || 'Unable to clock in.')
    } finally {
      setSaving(false)
    }
  }

  const handleClockOut = async () => {
    setSaving(true)
    setMessage('')
    setError('')

    try {
      const location = await getCurrentLocation()
      const payload = location
        ? await appService.updateClockStatusWithLocation(false, location)
        : await appService.updateClockStatus(false)
      setClockPayload({
        isClockedIn: Boolean(payload?.isClockedIn),
        activeEntry: payload?.activeEntry || null,
        trackedMiles: Number(payload?.trackedMiles || 0),
      })
      broadcastClockChange(payload)
      setMessage('Clocked out successfully.')
      await loadTimeClockData()
    } catch (err) {
      setError(err.message || 'Unable to clock out.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PortalLayout title="Time Clock">
      {error && (
        <Card title="Time Clock Error">
          <p>{error}</p>
        </Card>
      )}

      {message && (
        <Card title="Time Clock Updated">
          <p>{message}</p>
        </Card>
      )}

      <div className="grid grid-2 portal-grid-gap">
        <Card title="Clock Status" subtitle="GPS access is required to clock in and start mileage tracking.">
          <div className="stack gap-sm">
            <div className={`status-pill ${clockPayload.isClockedIn ? 'good' : ''}`}>
              {clockPayload.isClockedIn ? 'CLOCKED IN' : 'CLOCKED OUT'}
            </div>
            <div>Tracked Mileage: <strong>{formatMiles(clockPayload.trackedMiles)}</strong></div>
            <div>
              Active Shift Started:{' '}
              <strong>{clockPayload.activeEntry?.startedAt ? formatDateTime(clockPayload.activeEntry.startedAt) : '-'}</strong>
            </div>
            <div className="inline-actions">
              <button className="btn btn-primary" type="button" disabled={saving || clockPayload.isClockedIn} onClick={handleClockIn}>
                {saving && !clockPayload.isClockedIn ? 'Clocking In...' : 'Clock In'}
              </button>
              <button className="btn btn-secondary" type="button" disabled={saving || !clockPayload.isClockedIn} onClick={handleClockOut}>
                {saving && clockPayload.isClockedIn ? 'Clocking Out...' : 'Clock Out'}
              </button>
            </div>
          </div>
        </Card>

        <Card title="Attendance Summary" subtitle="Daily time and attendance totals for payroll review.">
          <div className="stack gap-sm">
            <div>Total Logged Hours: <strong>{formatHours(totalHours)}</strong></div>
            <div>Total Logged Shifts: <strong>{timeEntries.length}</strong></div>
            <p>
              Clock-in and clock-out times are stored in Catalyst along with mileage captured while GPS tracking is active.
            </p>
          </div>
        </Card>
      </div>

      <Card title="Time and Attendance" subtitle="Review daily clock events, hours, and mileage.">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Hours</th>
                <th>Mileage</th>
              </tr>
            </thead>
            <tbody>
              {timeEntries.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDateTime(entry.startedAt).split(',')[0]}</td>
                  <td>{formatDateTime(entry.startedAt)}</td>
                  <td>{entry.endedAt ? formatDateTime(entry.endedAt) : 'Active shift'}</td>
                  <td>{formatHours(entry.durationHours)}</td>
                  <td>{formatMiles(entry.totalMiles)}</td>
                </tr>
              ))}
              {!timeEntries.length && !loading && (
                <tr>
                  <td colSpan="5">Clock-in history will appear here after your first shift.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </PortalLayout>
  )
}
