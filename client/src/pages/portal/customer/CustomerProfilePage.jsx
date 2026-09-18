import { useEffect, useState } from 'react'
import PortalLayout from '../../../components/layout/PortalLayout'
import Card from '../../../components/ui/Card'
import { appService } from '../../../services/appService'

export default function CustomerProfilePage() {
  const [profile, setProfile] = useState({ name: '', email: '', phone: '', address: '' })
  const [message, setMessage] = useState('')

  useEffect(() => {
    appService.getProfile().then((item) => {
      setProfile({
        name: item.name || '',
        email: item.email || '',
        phone: item.phone || '',
        address: item.address || '',
      })
    })
  }, [])

  const update = (key, value) => setProfile((current) => ({ ...current, [key]: value }))

  async function saveProfile() {
    await appService.saveProfile({
      name: profile.name,
      phone: profile.phone,
      address: profile.address,
    })
    setMessage('Profile updated.')
  }

  return (
    <PortalLayout title="Profile">
      <Card title="Customer Profile">
        <div className="form-grid">
          <label><span>Name</span><input value={profile.name} onChange={(e) => update('name', e.target.value)} /></label>
          <label><span>Email</span><input value={profile.email} disabled /></label>
          <label><span>Phone</span><input value={profile.phone} onChange={(e) => update('phone', e.target.value)} /></label>
          <label className="full-width"><span>Address</span><input value={profile.address} onChange={(e) => update('address', e.target.value)} /></label>
          <button className="btn btn-primary" type="button" onClick={saveProfile}>Save Profile</button>
        </div>
        {message && <p>{message}</p>}
      </Card>
    </PortalLayout>
  )
}
