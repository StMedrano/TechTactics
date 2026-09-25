import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { assetPath } from '../../utils/assets'
import { appService } from '../../services/appService'

const navByRole = {
  customer: [
    { to: '/portal/customer', label: 'Dashboard', icon: 'dashboard' },
    { to: '/portal/customer/services', label: 'My Website', icon: 'services' },
    { to: '/portal/customer/request-help', label: 'Request Change', icon: 'tickets' },
    { to: '/portal/customer/payments', label: 'Payments', icon: 'payments' },
    { to: '/portal/customer/profile', label: 'Profile', icon: 'profile' },
  ],
  employee: [
    { to: '/portal/employee', label: 'Dashboard', icon: 'dashboard' },
    { to: '/portal/employee/time-clock', label: 'Time Clock', icon: 'clock' },
    { to: '/portal/employee/jobs', label: 'My Projects', icon: 'dispatch' },
    { to: '/portal/employee/pay', label: 'My Pay', icon: 'payments' },
    { to: '/portal/employee/profile', label: 'Profile', icon: 'profile' },
  ],
  admin: [
    { to: '/portal/admin', label: 'Dashboard', icon: 'dashboard' },
    { to: '/portal/admin/time-clock', label: 'Time Clock', icon: 'clock' },
    { to: '/portal/admin/jobs', label: 'My Projects', icon: 'dispatch' },
    { to: '/portal/admin/users', label: 'Users & Roles', icon: 'users' },
    { to: '/portal/admin/employees', label: 'Employees', icon: 'employees' },
    { to: '/portal/admin/tickets', label: 'Website Requests', icon: 'tickets' },
    { to: '/portal/admin/invoices', label: 'Invoices', icon: 'invoices' },
    { to: '/portal/admin/integrations', label: 'Zoho Setup', icon: 'settings' },
  ],
}

const navIconPaths = {
  dashboard: (
    <>
      <rect x="3" y="4" width="7" height="7" rx="2" />
      <rect x="14" y="4" width="7" height="5" rx="2" />
      <rect x="3" y="15" width="7" height="5" rx="2" />
      <rect x="14" y="13" width="7" height="7" rx="2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v5l3 2" />
      <path d="M7 3.8 4.8 6" />
      <path d="m17 3.8 2.2 2.2" />
    </>
  ),
  dispatch: (
    <>
      <path d="M4 15V7h10v8" />
      <path d="M14 10h3.2l2.8 3v2h-6" />
      <circle cx="8" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
      <path d="M6 11h5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.8 19c.8-3.2 2.6-5 5.2-5s4.4 1.8 5.2 5" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M15.5 14.3c2.3.3 3.8 1.8 4.5 4.7" />
    </>
  ),
  employees: (
    <>
      <rect x="5" y="4" width="14" height="16" rx="3" />
      <circle cx="12" cy="10" r="2.5" />
      <path d="M8.5 16c.6-2 1.8-3 3.5-3s2.9 1 3.5 3" />
      <path d="M9 4v3" />
      <path d="M15 4v3" />
    </>
  ),
  tickets: (
    <>
      <path d="M5 6h14v4a2 2 0 0 0 0 4v4H5v-4a2 2 0 0 0 0-4V6Z" />
      <path d="M9 9h6" />
      <path d="M9 13h6" />
      <path d="M9 17h3" />
    </>
  ),
  invoices: (
    <>
      <path d="M6 4h12v16l-3-1.5-3 1.5-3-1.5L6 20V4Z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3" />
      <path d="M12 18v3" />
      <path d="m4.2 7.5 2.6 1.5" />
      <path d="m17.2 15 2.6 1.5" />
      <path d="m19.8 7.5-2.6 1.5" />
      <path d="m6.8 15-2.6 1.5" />
    </>
  ),
  services: (
    <>
      <path d="M4 13.5 12 6l8 7.5" />
      <path d="M7 12v7h10v-7" />
      <path d="M10 19v-5h4v5" />
    </>
  ),
  payments: (
    <>
      <rect x="4" y="6" width="16" height="12" rx="3" />
      <path d="M4 10h16" />
      <path d="M8 15h4" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1-4 3.3-6 7-6s6 2 7 6" />
    </>
  ),
}

function NavIcon({ name }) {
  return (
    <span className="side-nav-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {navIconPaths[name] || navIconPaths.dashboard}
        </g>
      </svg>
    </span>
  )
}

function formatNotificationTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000))
  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function isDevicePushSupported() {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index)
  }

  return outputArray
}

function getPushStatusCopy(status) {
  if (status === 'enabled') return 'Device alerts are on for this device.'
  if (status === 'denied') return 'Notifications are blocked in this browser.'
  if (status === 'not_configured') return 'Device alerts need AppSail push keys.'
  if (status === 'unsupported') return 'This browser does not support PWA push alerts.'
  if (status === 'saving') return 'Turning on device alerts...'
  if (status === 'checking') return 'Checking device alert support...'
  return 'Turn this on to get alerts after leaving the app.'
}

export default function PortalLayout({ title, children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const items = navByRole[user?.role] || []
  const watchIdRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationError, setNotificationError] = useState('')
  const [pushStatus, setPushStatus] = useState('checking')
  const [pushError, setPushError] = useState('')

  const onLogout = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  const closeMenu = () => setMenuOpen(false)

  const loadNotifications = async () => {
    if (!user?.id) return
    try {
      const payload = await appService.getNotifications()
      setNotifications(payload?.notifications || [])
      setUnreadCount(Number(payload?.unreadCount || 0))
      setNotificationError('')
    } catch (error) {
      setNotificationError(error?.message || 'Unable to load notifications.')
    }
  }

  const openNotification = async (notification) => {
    if (!notification?.id) return

    if (!notification.readAt) {
      setNotifications((items) =>
        items.map((item) =>
          item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item
        )
      )
      setUnreadCount((count) => Math.max(0, count - 1))
      appService.markNotificationRead(notification.id).catch(() => loadNotifications())
    }

    setNotificationsOpen(false)
    if (notification.link) {
      navigate(notification.link)
    }
  }

  const markAllRead = async () => {
    setNotifications((items) =>
      items.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() }))
    )
    setUnreadCount(0)
    await appService.markAllNotificationsRead().catch(() => loadNotifications())
  }

  const syncExistingPushSubscription = async () => {
    if (!user?.id) return
    if (!isDevicePushSupported()) {
      setPushStatus('unsupported')
      return
    }

    try {
      const config = await appService.getPushConfig()
      if (!config?.enabled || !config?.publicKey) {
        setPushStatus('not_configured')
        return
      }

      if (Notification.permission === 'denied') {
        setPushStatus('denied')
        return
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await appService.savePushSubscription(subscription.toJSON())
        setPushStatus('enabled')
        return
      }

      setPushStatus('disabled')
    } catch (error) {
      setPushStatus('disabled')
      setPushError(error?.message || 'Unable to check device alerts.')
    }
  }

  const enableDeviceAlerts = async () => {
    setPushError('')

    if (!isDevicePushSupported()) {
      setPushStatus('unsupported')
      return
    }

    try {
      setPushStatus('saving')
      const config = await appService.getPushConfig()
      if (!config?.enabled || !config?.publicKey) {
        setPushStatus('not_configured')
        return
      }

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setPushStatus(permission === 'denied' ? 'denied' : 'disabled')
        return
      }

      const registration = await navigator.serviceWorker.ready
      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(config.publicKey),
        })
      }

      await appService.savePushSubscription(subscription.toJSON())
      setPushStatus('enabled')
    } catch (error) {
      setPushStatus('disabled')
      setPushError(error?.message || 'Unable to enable device alerts.')
    }
  }

  useEffect(() => {
    if (!['admin', 'employee'].includes(user?.role || '')) {
      return undefined
    }

    let disposed = false

    const stopWatching = () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      watchIdRef.current = null
    }

    const startWatching = () => {
      if (watchIdRef.current !== null || typeof navigator === 'undefined' || !navigator.geolocation) {
        return
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          appService.pushClockLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            capturedAt: new Date(position.timestamp || Date.now()).toISOString(),
          }).catch(() => {})
        },
        () => {},
        {
          enableHighAccuracy: true,
          maximumAge: 30000,
          timeout: 20000,
        },
      )
    }

    const syncClockState = () => {
      appService.getClockStatus()
        .then((payload) => {
          if (disposed) return
          if (payload?.isClockedIn) {
            startWatching()
            return
          }
          stopWatching()
        })
        .catch(() => {})
    }

    const handleClockStatusChange = (event) => {
      if (event.detail?.isClockedIn) {
        startWatching()
        return
      }
      stopWatching()
    }

    syncClockState()
    window.addEventListener('tt-clock-status-change', handleClockStatusChange)

    return () => {
      disposed = true
      window.removeEventListener('tt-clock-status-change', handleClockStatusChange)
      stopWatching()
    }
  }, [user?.id, user?.role])

  useEffect(() => {
    if (!user?.id) {
      setNotifications([])
      setUnreadCount(0)
      return undefined
    }

    loadNotifications()
    syncExistingPushSubscription()
    const interval = window.setInterval(loadNotifications, 45000)
    return () => window.clearInterval(interval)
  }, [user?.id])

  return (
    <div className="portal-shell">
      <aside className={`sidebar ${menuOpen ? 'menu-open' : ''}`}>
        <div className="portal-sidebar-head">
          <Link className="portal-brand" to="/" onClick={closeMenu}>
            <img src={assetPath('assets/techtactics-logo.png')} alt="TechTactics" />
          </Link>
          <button
            className="portal-menu-button"
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-expanded={menuOpen}
            aria-controls="portal-navigation"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            <span className="portal-menu-icon" aria-hidden="true">
              <span className="portal-menu-line" />
              <span className="portal-menu-line" />
              <span className="portal-menu-line" />
            </span>
            <span className="sr-only">{menuOpen ? 'Close navigation menu' : 'Open navigation menu'}</span>
          </button>
        </div>
        <div className="role-chip">{user?.role?.toUpperCase()}</div>
        <nav className="side-nav" id="portal-navigation">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end onClick={closeMenu}>
              <NavIcon name={item.icon} />
              <span className="side-nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <button className="btn btn-secondary w-full portal-logout-button" type="button" onClick={onLogout}>
          Logout
        </button>
      </aside>

      <div className="portal-content">
        <header className="portal-topbar">
          <div>
            <h1>{title}</h1>
            <p>{user?.name} - {user?.email}</p>
          </div>
          <div className="notification-center">
            <button
              className="notification-button"
              type="button"
              onClick={() => setNotificationsOpen((value) => !value)}
              aria-expanded={notificationsOpen}
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
            >
              <span>Notifications</span>
              {unreadCount > 0 && <strong>{unreadCount > 9 ? '9+' : unreadCount}</strong>}
            </button>

            {notificationsOpen && (
              <section className="notification-panel" aria-label="Portal notifications">
                <div className="notification-panel-head">
                  <div>
                    <h2>Notifications</h2>
                    <p>{unreadCount ? `${unreadCount} unread` : 'All caught up'}</p>
                  </div>
                  <button type="button" onClick={markAllRead} disabled={!unreadCount}>
                    Mark all read
                  </button>
                </div>

                {notificationError && <p className="danger-text">{notificationError}</p>}

                <div className="device-push-row">
                  <div>
                    <strong>Device alerts</strong>
                    <p>{getPushStatusCopy(pushStatus)}</p>
                    {pushError && <p className="danger-text">{pushError}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={enableDeviceAlerts}
                    disabled={['enabled', 'saving', 'unsupported', 'not_configured', 'denied'].includes(pushStatus)}
                  >
                    {pushStatus === 'enabled' ? 'Enabled' : 'Enable'}
                  </button>
                </div>

                <div className="notification-list">
                  {notifications.length ? notifications.slice(0, 12).map((notification) => (
                    <button
                      key={notification.id}
                      className={`notification-item ${notification.readAt ? '' : 'unread'}`}
                      type="button"
                      onClick={() => openNotification(notification)}
                    >
                      <span>
                        <strong>{notification.title}</strong>
                        <small>{formatNotificationTime(notification.createdAt)}</small>
                      </span>
                      <em>{notification.body}</em>
                    </button>
                  )) : (
                    <p className="empty-notifications">No notifications yet.</p>
                  )}
                </div>
              </section>
            )}
          </div>
        </header>
        <div className="portal-page">{children}</div>
      </div>
    </div>
  )
}
