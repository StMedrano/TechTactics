import { apiRequest } from './apiClient'

export const appService = {
  async getCustomerDashboard() {
    return apiRequest('/dashboard/customer')
  },

  async getCustomerServices() {
    return apiRequest('/services')
  },

  async getCustomerInvoices() {
    return apiRequest('/invoices')
  },

  async createServiceRequest(payload) {
    return apiRequest('/tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async getEmployeeDashboard() {
    return apiRequest('/dashboard/employee')
  },

  async getAdminDashboard() {
    return apiRequest('/dashboard/admin')
  },

  async getUsers() {
    return apiRequest('/users')
  },

  async createUser(payload) {
    return apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async updateUser(userId, payload) {
    return apiRequest(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  async deleteUser(userId) {
    return apiRequest(`/users/${userId}`, {
      method: 'DELETE',
    })
  },

  async getRoles() {
    return apiRequest('/users/roles')
  },

  async createRole(payload) {
    return apiRequest('/users/roles', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async updateRole(roleKey, payload) {
    return apiRequest(`/users/roles/${encodeURIComponent(roleKey)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  async deleteRole(roleKey) {
    return apiRequest(`/users/roles/${encodeURIComponent(roleKey)}`, {
      method: 'DELETE',
    })
  },

  async getEmployees() {
    return apiRequest('/users/employees')
  },

  async getTickets() {
    return apiRequest('/tickets')
  },

  async updateTicketApproval(ticketId, payload) {
    return apiRequest(`/tickets/${ticketId}/approval`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  async sendTicketQuote(ticketId, payload) {
    return apiRequest(`/tickets/${ticketId}/quote`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  async respondToTicketQuote(ticketId, payload) {
    return apiRequest(`/tickets/${ticketId}/quote-response`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  async scheduleTicketInstall(ticketId, payload) {
    return apiRequest(`/tickets/${ticketId}/schedule`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  async updateTicketStatus(ticketId, payload) {
    return apiRequest(`/tickets/${ticketId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  async updateDispatch(ticketId, payload) {
    return apiRequest(`/tickets/${ticketId}/dispatch`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  async submitReview(ticketId, payload) {
    return apiRequest(`/reviews/${ticketId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async getPaychecks() {
    return apiRequest('/payments/paychecks')
  },

  async getProfile() {
    return apiRequest('/users/me')
  },

  async saveProfile(payload) {
    return apiRequest('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  async updateClockStatus(isClockedIn) {
    return apiRequest('/users/me/clock', {
      method: 'POST',
      body: JSON.stringify({ isClockedIn }),
    })
  },

  async updateClockStatusWithLocation(isClockedIn, location) {
    return apiRequest('/users/me/clock', {
      method: 'POST',
      body: JSON.stringify({ isClockedIn, location }),
    })
  },

  async getClockStatus() {
    return apiRequest('/users/me/clock')
  },

  async getTimeEntries() {
    return apiRequest('/users/me/time-entries')
  },

  async pushClockLocation(location) {
    return apiRequest('/users/me/clock/location', {
      method: 'POST',
      body: JSON.stringify({ location }),
    })
  },

  async getNotifications() {
    return apiRequest('/notifications')
  },

  async markNotificationRead(notificationId) {
    return apiRequest(`/notifications/${notificationId}/read`, {
      method: 'PATCH',
    })
  },

  async markAllNotificationsRead() {
    return apiRequest('/notifications/read-all', {
      method: 'PATCH',
    })
  },

  async getPushConfig() {
    return apiRequest('/push/config')
  },

  async savePushSubscription(subscription) {
    return apiRequest('/push/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ subscription }),
    })
  },

  async deletePushSubscription(endpoint) {
    return apiRequest('/push/subscriptions', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint }),
    })
  },
}
