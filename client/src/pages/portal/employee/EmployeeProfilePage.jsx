import { useEffect, useState } from 'react'
import PortalLayout from '../../../components/layout/PortalLayout'
import Card from '../../../components/ui/Card'
import { appService } from '../../../services/appService'

export default function EmployeeProfilePage() {
  const [profile, setProfile] = useState({ firstName: '', lastName: '', email: '', phone: '' })
  const [message, setMessage] = useState('')

  useEffect(() => {
    appService.getProfile().then((item) => {
      setProfile({
        firstName: item.firstName || '',
        lastName: item.lastName || '',
        email: item.email || '',
        phone: item.phone || '',
      })
    })
  }, [])

  const update = (key, value) => setProfile((current) => ({ ...current, [key]: value }))

  async function saveProfile() {
    await appService.saveProfile({
      first_name: profile.firstName,
      last_name: profile.lastName,
      phone: profile.phone,
      name: `${profile.firstName} ${profile.lastName}`.trim(),
    })
    setMessage('Profile updated.')
  }

  return (
    <PortalLayout title="Profile">
      <Card title="Employee Profile">
        <div className="form-grid">
          <label><span>First Name</span><input value={profile.firstName} onChange={(e) => update('firstName', e.target.value)} /></label>
          <label><span>Last Name</span><input value={profile.lastName} onChange={(e) => update('lastName', e.target.value)} /></label>
          <label><span>Email</span><input value={profile.email} disabled /></label>
          <label><span>Phone</span><input value={profile.phone} onChange={(e) => update('phone', e.target.value)} /></label>
          <button className="btn btn-primary" type="button" onClick={saveProfile}>Save Changes</button>
        </div>
        {message && <p>{message}</p>}
      </Card>
    </PortalLayout>
  )
}
