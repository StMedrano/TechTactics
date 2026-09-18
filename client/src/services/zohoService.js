import { apiRequest } from './apiClient'

export const zohoService = {
  async getOAuthAuthorizeUrl(state = 'techtactics_portal') {
    return apiRequest(`/invoices/zoho/authorize-url?state=${encodeURIComponent(state)}`)
  },

  async exchangeCodeForToken(code) {
    return apiRequest('/invoices/zoho/token', {
      method: 'POST',
      body: JSON.stringify({ code }),
    })
  },

  async listInvoices() {
    return apiRequest('/invoices/zoho/list')
  },

  async listItems(search = '') {
    const query = search ? `?search=${encodeURIComponent(search)}` : ''
    return apiRequest(`/invoices/zoho/items${query}`)
  },

  async createInvoice({ payload }) {
    return apiRequest('/invoices/zoho/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async getHostedPaymentPage({ invoiceId }) {
    return apiRequest(`/invoices/${invoiceId}/payment-link`)
  },

  async getMailStatus() {
    return apiRequest('/settings/mail/status')
  },

  async sendTestEmail(to = '') {
    return apiRequest('/settings/mail/test', {
      method: 'POST',
      body: JSON.stringify({ to }),
    })
  },
}
