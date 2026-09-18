import { useEffect, useState } from 'react'
import Card from '../../../components/ui/Card'
import { zohoService } from '../../../services/zohoService'

export default function ZohoSetupPage() {
  const [authorizeUrl, setAuthorizeUrl] = useState('')
  const [usingConnection, setUsingConnection] = useState(false)
  const [connectionLinkName, setConnectionLinkName] = useState('')
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [mailStatus, setMailStatus] = useState(null)
  const [testRecipient, setTestRecipient] = useState('')
  const [mailMessage, setMailMessage] = useState('')

  useEffect(() => {
    zohoService.getOAuthAuthorizeUrl().then((data) => {
      setAuthorizeUrl(data.authorizeUrl || '')
      setUsingConnection(!!data.usingConnection)
      setConnectionLinkName(data.connectionLinkName || '')
      if (data.message) {
        setMessage(data.message)
      }
    })
    zohoService.getMailStatus()
      .then((data) => setMailStatus(data))
      .catch((error) => setMailMessage(error?.message || 'Unable to load mail status.'))
  }, [])

  async function handleExchangeCode(event) {
    event.preventDefault()
    setMessage('Exchanging Zoho code...')
    const tokenResult = await zohoService.exchangeCodeForToken(code)

    if (tokenResult.usingConnection) {
      setMessage(tokenResult.message || 'Catalyst Connections is already managing Zoho Books access.')
      return
    }

    if (tokenResult.access_token || tokenResult.refresh_token) {
      setMessage('Zoho token saved in Catalyst-backed server settings.')
      return
    }

    setMessage(tokenResult.error_description || tokenResult.error || 'Zoho token exchange failed.')
  }

  async function handleTestEmail(event) {
    event.preventDefault()
    setMailMessage('Sending test email...')
    try {
      const result = await zohoService.sendTestEmail(testRecipient)
      setMailMessage(result.sent
        ? `Test email sent using ${result.provider || 'configured mail provider'}.`
        : `Test email failed: ${result.reason || result.message || 'Unknown mail error.'}`)
      if (result.status) {
        setMailStatus(result.status)
      }
    } catch (error) {
      setMailMessage(error?.message || 'Test email failed.')
    }
  }

  return (
    <div className="stack-lg">
      <Card title="Zoho API Setup">
        <p>
          {usingConnection
            ? 'Zoho Books is connected through Catalyst Connections for this deployed project.'
            : 'This version uses your Catalyst/AppSail API as the Zoho middle layer. Put your Zoho client ID, client secret, organization ID, and redirect URI in the server environment variables.'}
        </p>
      </Card>

      <Card title="Portal Email Setup">
        <p>
          Workflow emails use Catalyst Mail first, then Zoho Mail SMTP if SMTP credentials are configured.
          The sender must be verified/allowed by Zoho.
        </p>
        {mailStatus ? (
          <div className="key-value-list">
            <p><strong>Status:</strong> {mailStatus.ready ? 'Ready' : 'Needs setup'}</p>
            <p><strong>Provider:</strong> {mailStatus.provider}</p>
            <p><strong>From:</strong> {mailStatus.fromEmail || 'Not set'}</p>
            <p><strong>Reply to:</strong> {mailStatus.replyTo || 'Not set'}</p>
            <p><strong>Portal group:</strong> {mailStatus.portalGroup || 'Not set'}</p>
            <p><strong>Catalyst Mail:</strong> {mailStatus.catalystReady ? 'Ready' : 'Not ready'}</p>
            <p><strong>Zoho SMTP:</strong> {mailStatus.smtpReady ? 'Ready' : 'Not ready'}</p>
            {mailStatus.missing?.length ? (
              <p><strong>Missing:</strong> {mailStatus.missing.join(', ')}</p>
            ) : null}
          </div>
        ) : (
          <p>Loading email status...</p>
        )}
        <form className="stack-md mt" onSubmit={handleTestEmail}>
          <label>
            Test recipient
            <input
              value={testRecipient}
              onChange={(event) => setTestRecipient(event.target.value)}
              placeholder="Leave blank to send to your admin email"
            />
          </label>
          <button className="btn btn-primary" type="submit">Send Test Email</button>
        </form>
        {mailMessage && <p className={mailMessage.toLowerCase().includes('failed') ? 'danger-text' : ''}>{mailMessage}</p>}
      </Card>

      {usingConnection ? (
        <Card title="Catalyst Connection Active">
          <p>No manual Zoho Books token exchange is required.</p>
          <p>
            Connection link name: <strong>{connectionLinkName || 'books'}</strong>
          </p>
          {message && <p>{message}</p>}
        </Card>
      ) : (
        <>
          <Card title="Step 1: Authorize Zoho">
            <p>Open Zoho authorization, approve access, then paste the returned code below.</p>
            {authorizeUrl ? (
              <p>
                <a href={authorizeUrl} target="_blank" rel="noreferrer">
                  Open Zoho Authorization
                </a>
              </p>
            ) : (
              <p>Loading authorization link...</p>
            )}
          </Card>

          <Card title="Step 2: Exchange Code">
            <form className="stack-md" onSubmit={handleExchangeCode}>
              <label>
                Authorization code
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Paste Zoho code here" />
              </label>
              <button type="submit">Save Zoho Token</button>
            </form>
            {message && <p>{message}</p>}
          </Card>
        </>
      )}
    </div>
  )
}
