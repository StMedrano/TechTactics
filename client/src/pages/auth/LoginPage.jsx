import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { appConfig } from '../../config'
import { assetPath } from '../../utils/assets'

export default function LoginPage() {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [ssoSubmitting, setSsoSubmitting] = useState(false)
  const { login, register, completeSsoLogin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const requestedMode = params.get('mode')
    setMode(requestedMode === 'register' ? 'register' : 'login')
  }, [location.search])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const ssoToken = params.get('sso_token')
    const ssoError = params.get('sso_error')

    if (ssoError) {
      setError(ssoError)
      return
    }

    if (!ssoToken) return

    setSsoSubmitting(true)
    setError('')

    completeSsoLogin(ssoToken)
      .then((nextUser) => {
        const fallback = location.state?.from || nextUser.home
        navigate(fallback, { replace: true })
      })
      .catch((err) => {
        setError(err.message || 'Zoho SSO failed.')
        navigate('/login', { replace: true })
      })
      .finally(() => {
        setSsoSubmitting(false)
      })
  }, [completeSsoLogin, location.search, location.state, navigate])

  const onSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const nextUser =
        mode === 'register'
          ? await register({ name, email, password, phone, address })
          : await login({ email, password })
      const fallback = location.state?.from || nextUser.home
      navigate(fallback, { replace: true })
    } catch (err) {
      setError(err.message || `${mode === 'register' ? 'Registration' : 'Login'} failed.`)
    } finally {
      setSubmitting(false)
    }
  }

  const onZohoSso = () => {
    setSsoSubmitting(true)
    setError('')
    const returnTo = location.state?.from || '/login'
    const clientAppUrl = `${window.location.origin}${window.location.pathname.replace(/\/+$/, '')}`
    window.location.href = `${appConfig.backendApiBaseUrl}/auth/zoho/start?returnTo=${encodeURIComponent(returnTo)}&clientOrigin=${encodeURIComponent(clientAppUrl)}`
  }

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={onSubmit}>
        <img src={assetPath('assets/techtactics-logo.png')} alt="TechTactics" className="auth-logo" />
        <h1>{mode === 'register' ? 'Create Account' : 'Portal Login'}</h1>
        <p>
          {mode === 'register'
            ? 'Create a customer account to access the portal.'
            : 'Sign in with your portal account or continue with Zoho.'}
        </p>

        <div className="inline-actions">
          <button className="btn btn-secondary" type="button" onClick={() => setMode('login')} disabled={mode === 'login'}>
            Login
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => setMode('register')} disabled={mode === 'register'}>
            Create Account
          </button>
        </div>

        {mode === 'register' && (
          <>
            <label>
              Full Name
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>

            <label>
              Phone
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>

            <label>
              Address
              <input value={address} onChange={(e) => setAddress(e.target.value)} />
            </label>
          </>
        )}

        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>

        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting
            ? mode === 'register'
              ? 'Creating Account...'
              : 'Signing In...'
            : mode === 'register'
              ? 'Create Account'
              : 'Continue'}
        </button>
        {mode === 'login' && (
          <button className="btn btn-secondary" type="button" disabled={ssoSubmitting} onClick={onZohoSso}>
            {ssoSubmitting ? 'Redirecting To Zoho...' : 'Continue With Zoho'}
          </button>
        )}
        {error && <p>{error}</p>}
      </form>
    </div>
  )
}
