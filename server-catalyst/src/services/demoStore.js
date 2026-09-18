const demoDb = {
  users: [
    {
      id: '1',
      role: 'admin',
      email: 'stalinmedrano@mytechtactics.com',
      name: 'Stalin Medrano',
      firstName: 'Stalin',
      lastName: 'Medrano',
      passwordHash: 'Demo123!',
      phone: '225-210-9890',
      isActive: true
    },
    {
      id: '2',
      role: 'employee',
      email: 'employee@mytechtactics.com',
      name: 'Taylor Employee',
      firstName: 'Taylor',
      lastName: 'Employee',
      passwordHash: 'Demo123!',
      phone: '225-210-9891',
      isActive: true,
      payType: 'Hourly',
      hourlyRate: 24.5,
      annualSalary: 0,
      weeklyHours: 33.5,
      isClockedIn: true,
      maxActiveJobs: 4,
      directoryGroups: ['TechTactics Employees']
    },
    {
      id: '3',
      role: 'customer',
      email: 'customer@mytechtactics.com',
      name: 'Jordan Customer',
      firstName: 'Jordan',
      lastName: 'Customer',
      passwordHash: 'Demo123!',
      phone: '225-210-9892',
      isActive: true,
      address: '612 S Burnside Ave Suite B, Gonzales, LA 70737',
      zohoContactId: '1234567890',
      directoryGroups: ['TechTactics Customers']
    }
  ],
  services: [
    {
      id: 'svc-1',
      customerId: '3',
      serviceName: 'Whole-Home WiFi Optimization',
      category: 'Networking',
      status: 'Active',
      startedAt: '2026-02-18',
      monthlyPrice: 29.99
    },
    {
      id: 'svc-2',
      customerId: '3',
      serviceName: 'Front Door Camera Monitoring',
      category: 'Security',
      status: 'Active',
      startedAt: '2026-01-04',
      monthlyPrice: 19.99
    }
  ],
  tickets: [
    {
      id: '1042',
      customerId: '3',
      employeeId: '2',
      customerName: 'Jordan Customer',
      assignedEmployee: 'Taylor Employee',
      type: 'Repair',
      category: 'WiFi',
      address: '612 S Burnside Ave Suite B, Gonzales, LA 70737',
      title: 'WiFi coverage issue',
      description: 'Back bedroom has poor WiFi signal and smart TV buffering.',
      status: 'dispatched',
      note: 'Technician scheduled for Tuesday morning.',
      dispatchHistory: [
        {
          status: 'open',
          note: 'Request approved and assigned.',
          updatedBy: 'Stalin Medrano',
          actorRole: 'admin',
          occurredAt: '2026-04-10T09:30:00.000Z'
        },
        {
          status: 'dispatched',
          note: 'Technician scheduled for Tuesday morning.',
          updatedBy: 'Taylor Employee',
          actorRole: 'employee',
          occurredAt: '2026-04-11T09:30:00.000Z'
        }
      ],
      createdAt: '2026-04-10T09:30:00.000Z',
      updatedAt: '2026-04-11T09:30:00.000Z'
    }
  ],
  invoices: [
    {
      id: 'INV-3014',
      ticketId: '1042',
      customerId: '3',
      status: 'sent',
      amount: 249,
      balance: 249,
      invoiceNumber: 'TT-1042',
      paymentLink: 'https://example.com/pay/TT-1042',
      description: 'Repair and mesh tuning for WiFi coverage issue.',
      zohoInvoiceId: ''
    }
  ],
  payments: [
    {
      id: 'PAY-9001',
      employeeId: '2',
      period: 'Mar 24 - Apr 6',
      gross: 1641.5,
      net: 1323.94,
      status: 'Paid'
    },
    {
      id: 'PAY-9002',
      employeeId: '2',
      period: 'Apr 7 - Apr 20',
      gross: 1588.75,
      net: 1289.6,
      status: 'Pending'
    }
  ],
  timeEntries: [
    {
      id: 'TIME-1001',
      employeeId: '2',
      roleKey: 'employee',
      startedAt: '2026-05-02T13:00:00.000Z',
      endedAt: '',
      isActive: true,
      totalMiles: 8.4,
      lastLatitude: 30.232,
      lastLongitude: -90.9205,
      path: [
        {
          latitude: 30.2308,
          longitude: -90.9221,
          accuracy: 12,
          capturedAt: '2026-05-02T13:00:00.000Z'
        },
        {
          latitude: 30.232,
          longitude: -90.9205,
          accuracy: 10,
          capturedAt: '2026-05-02T15:30:00.000Z'
        }
      ],
      createdAt: '2026-05-02T13:00:00.000Z',
      updatedAt: '2026-05-02T15:30:00.000Z'
    },
    {
      id: 'TIME-1000',
      employeeId: '2',
      roleKey: 'employee',
      startedAt: '2026-05-01T13:30:00.000Z',
      endedAt: '2026-05-01T21:15:00.000Z',
      isActive: false,
      totalMiles: 12.7,
      lastLatitude: 30.232,
      lastLongitude: -90.9205,
      path: [],
      createdAt: '2026-05-01T13:30:00.000Z',
      updatedAt: '2026-05-01T21:15:00.000Z'
    }
  ],
  settings: {
    zoho_refresh_token: null,
    portal_roles: [],
    directory_role_mappings: {
      'TechTactics Admins': 'admin',
      'TechTactics Employees': 'employee',
      'TechTactics Customers': 'customer'
    }
  }
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export const demoStore = {
  async getUsers() {
    return clone(demoDb.users);
  },

  async getEmployees() {
    return clone(demoDb.users.filter((user) => user.role === 'admin' || user.role === 'employee'));
  },

  async getUserById(_req, userId) {
    const user = demoDb.users.find((item) => item.id === String(userId));
    return user ? clone(user) : null;
  },

  async getUserByEmail(_req, email) {
    const user = demoDb.users.find((item) => item.email.toLowerCase() === String(email).toLowerCase());
    return user ? clone(user) : null;
  },

  async createUser(_req, user) {
    const saved = {
      id: String(Date.now()),
      role: 'customer',
      isActive: true,
      directoryGroups: [],
      ...user
    };
    demoDb.users.unshift(saved);
    return clone(saved);
  },

  async updateUser(_req, userId, updates) {
    const index = demoDb.users.findIndex((item) => item.id === String(userId));
    if (index === -1) return null;
    demoDb.users[index] = { ...demoDb.users[index], ...updates };
    return clone(demoDb.users[index]);
  },

  async deleteUser(_req, userId) {
    const index = demoDb.users.findIndex((item) => item.id === String(userId));
    if (index === -1) return false;
    demoDb.users.splice(index, 1);
    return true;
  },

  async listServices(_req, user) {
    const items =
      user?.role === 'customer'
        ? demoDb.services.filter((item) => item.customerId === user.id)
        : demoDb.services;
    return clone(items);
  },

  async listTickets(_req, user) {
    let items = demoDb.tickets;
    if (user?.role === 'customer') {
      items = items.filter((item) => item.customerId === user.id);
    } else if (user?.role === 'employee') {
      items = items.filter((item) => item.employeeId === user.id);
    }
    return clone(items);
  },

  async createTicket(_req, ticket) {
    const saved = { ...ticket, id: String(Date.now()) };
    demoDb.tickets.unshift(saved);
    return clone(saved);
  },

  async getTicketById(_req, ticketId) {
    const ticket = demoDb.tickets.find((item) => item.id === String(ticketId));
    return ticket ? clone(ticket) : null;
  },

  async updateTicket(_req, ticketId, updates) {
    const index = demoDb.tickets.findIndex((item) => item.id === String(ticketId));
    if (index === -1) return null;
    demoDb.tickets[index] = { ...demoDb.tickets[index], ...updates };
    return clone(demoDb.tickets[index]);
  },

  async listInvoices(_req, user) {
    const items =
      user?.role === 'customer'
        ? demoDb.invoices.filter((item) => item.customerId === user.id)
        : demoDb.invoices;
    return clone(items);
  },

  async upsertInvoice(_req, invoice) {
    if (invoice.id) {
      const index = demoDb.invoices.findIndex((item) => item.id === invoice.id);
      if (index >= 0) {
        demoDb.invoices[index] = { ...demoDb.invoices[index], ...invoice };
        return clone(demoDb.invoices[index]);
      }
    }

    const saved = { ...invoice, id: invoice.id || `INV-${Date.now()}` };
    demoDb.invoices.unshift(saved);
    return clone(saved);
  },

  async listPayments(_req, user) {
    return clone(demoDb.payments.filter((item) => item.employeeId === user?.id));
  },

  async listTimeEntries(_req, userId) {
    return clone(
      demoDb.timeEntries.filter((item) => !userId || String(item.employeeId) === String(userId))
    );
  },

  async getActiveTimeEntry(_req, userId) {
    const entry = demoDb.timeEntries.find(
      (item) => String(item.employeeId) === String(userId) && item.isActive
    );
    return entry ? clone(entry) : null;
  },

  async createTimeEntry(_req, entry) {
    const saved = {
      id: `TIME-${Date.now()}`,
      path: [],
      ...entry
    };
    demoDb.timeEntries.unshift(saved);
    return clone(saved);
  },

  async updateTimeEntry(_req, entryId, updates) {
    const index = demoDb.timeEntries.findIndex((item) => item.id === String(entryId));
    if (index === -1) return null;
    demoDb.timeEntries[index] = { ...demoDb.timeEntries[index], ...updates };
    return clone(demoDb.timeEntries[index]);
  },

  async getSettings() {
    return clone(demoDb.settings);
  },

  async saveSettings(_req, settings) {
    demoDb.settings = { ...demoDb.settings, ...settings };
    return clone(demoDb.settings);
  }
};
