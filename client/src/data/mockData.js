export const roleHomes = {
  customer: '/portal/customer',
  employee: '/portal/employee',
  admin: '/portal/admin',
}

export const sampleUsers = {
  customer: { name: 'Jordan Customer', email: 'customer@mytechtactics.com' },
  employee: { name: 'Taylor Employee', email: 'employee@mytechtactics.com' },
  admin: { name: 'Stalin Admin', email: 'stalinmedrano@mytechtactics.com' },
}

export const marketingData = {
  hero: {
    kicker: 'Web design • Development • Automation',
    title: ['WEBSITES BUILT TO', 'WIN MORE BUSINESS.'],
    text:
      'TechTactics builds modern websites for local businesses that need a stronger online presence, clearer messaging, better lead capture, and a professional experience on every screen.',
  },
  services: [
    {
      eyebrow: 'Build',
      title: 'New Business Websites',
      text: 'Professional websites for businesses that need to launch, replace a social-only presence, or finally establish a credible home online.',
    },
    {
      eyebrow: 'Improve',
      title: 'Website Redesigns',
      text: 'Modernize slow, dated, confusing, or mobile-unfriendly websites with better structure, messaging, calls to action, and performance.',
    },
    {
      eyebrow: 'Convert',
      title: 'Lead, Booking & Sales Flows',
      text: 'Turn visits into action with quote requests, appointment booking, forms, product or service pages, payments, and conversion-focused calls to action.',
    },
    {
      eyebrow: 'Connect',
      title: 'Business Integrations',
      text: 'Connect websites with tools such as CRM, invoicing, email, analytics, forms, automations, customer portals, and other business systems.',
    },
  ],
  packages: [
    {
      label: 'Essential',
      name: 'Launch',
      summary: 'A focused professional site for a local business that needs a strong foundation.',
      features: [
        'Up to 5 core pages',
        'Responsive mobile-first design',
        'Contact or quote-request flow',
        'Basic on-page SEO structure',
        'Analytics and conversion tracking setup',
      ],
    },
    {
      label: 'Most Flexible',
      name: 'Growth',
      summary: 'A larger lead-generation site for businesses ready to market multiple services or locations.',
      features: [
        'Expanded service and landing pages',
        'Conversion-focused page structure',
        'Booking, forms, or CRM connection',
        'Local SEO content structure',
        'Performance and analytics review',
      ],
    },
    {
      label: 'Advanced',
      name: 'Business Platform',
      summary: 'Custom web functionality for businesses that need more than a traditional marketing website.',
      features: [
        'Custom workflows or web app features',
        'Customer or staff portal options',
        'API and business-system integrations',
        'Automation opportunities',
        'Ongoing support options',
      ],
    },
  ],
  problems: [
    {
      title: 'No Website Yet',
      text: 'Create a professional online home so customers can understand the business, services, location, and next step.',
    },
    {
      title: 'Outdated Website',
      text: 'Replace an old visual style, weak mobile experience, broken content, or confusing navigation with a modern structure.',
    },
    {
      title: 'Traffic But Few Leads',
      text: 'Clarify the offer, strengthen calls to action, reduce friction, and make it easier for visitors to contact or book.',
    },
    {
      title: 'Too Much Manual Work',
      text: 'Connect forms, scheduling, customer data, notifications, invoicing, and other workflows where automation makes sense.',
    },
  ],
  process: [
    {
      title: '1) Review',
      text: 'We learn what the business sells, who it serves, what the current website is doing, and where customers are getting stuck.',
    },
    {
      title: '2) Build',
      text: 'We create the page structure, design, content direction, calls to action, and integrations around the agreed project scope.',
    },
    {
      title: '3) Launch & Improve',
      text: 'We test the site, launch it, connect analytics, and identify the next improvements based on real business goals.',
    },
  ],
}

export const customerServices = [
  {
    id: 1,
    serviceName: 'Website Care & Maintenance',
    category: 'Website Support',
    status: 'Active',
    startedAt: '2026-02-18',
    monthlyPrice: 29.99,
  },
  {
    id: 2,
    serviceName: 'Analytics & Conversion Tracking',
    category: 'Website Growth',
    status: 'Active',
    startedAt: '2026-01-04',
    monthlyPrice: 19.99,
  },
]

export const serviceRequests = [
  {
    id: 1042,
    customerId: 'customer-1',
    customerName: 'Jordan Customer',
    type: 'Website Update',
    category: 'Content & Page Updates',
    address: 'Prairieville, LA',
    description: 'Add a new service-area page and improve the quote-request call to action.',
    status: 'Accepted',
    assignedEmployee: 'Taylor Employee',
    updatedAt: '2026-04-11 9:30 AM',
    note: 'Content update is approved and scheduled for the next project work block.',
  },
  {
    id: 1043,
    customerId: 'customer-1',
    customerName: 'Jordan Customer',
    type: 'Website Redesign',
    category: 'Website Growth',
    address: 'Prairieville, LA',
    description: 'Need an estimate to redesign the current site, improve mobile usability, and add lead capture.',
    status: 'Quote Sent',
    assignedEmployee: 'Taylor Employee',
    updatedAt: '2026-04-10 3:10 PM',
    note: 'Website redesign quote is waiting for customer approval.',
  },
]

export const invoices = [
  {
    id: 'INV-3014',
    requestId: 1042,
    status: 'sent',
    amount: 249.0,
    invoiceNumber: 'TT-1042',
    paymentLink: 'https://example.com/pay/TT-1042',
    description: 'Website content update and conversion improvements.',
  },
  {
    id: 'INV-3015',
    requestId: 1043,
    status: 'draft',
    amount: 899.0,
    invoiceNumber: 'TT-1043',
    paymentLink: 'https://example.com/pay/TT-1043',
    description: 'Website redesign project estimate.',
  },
]

export const employeeProfile = {
  isClockedIn: true,
  activeJobsCount: 2,
  weeklyHours: 33.5,
  payType: 'Hourly',
  hourlyRate: 24.5,
  annualSalary: 0,
}

export const paychecks = [
  { id: 'PAY-9001', period: 'Mar 24 - Apr 6', gross: 1641.5, net: 1323.94, status: 'Paid' },
  { id: 'PAY-9002', period: 'Apr 7 - Apr 20', gross: 1588.75, net: 1289.6, status: 'Pending' },
]

export const employees = [
  {
    id: 1,
    email: 'employee@mytechtactics.com',
    firstName: 'Taylor',
    lastName: 'Employee',
    isActive: true,
    maxActiveJobs: 4,
    payType: 'Hourly',
    hourlyRate: 24.5,
    annualSalary: 0,
  },
  {
    id: 2,
    email: 'tech2@mytechtactics.com',
    firstName: 'Morgan',
    lastName: 'Tech',
    isActive: true,
    maxActiveJobs: 3,
    payType: 'Salary',
    hourlyRate: 0,
    annualSalary: 58000,
  },
]

export const users = [
  { id: 1, email: 'customer@mytechtactics.com', roles: ['Customer'] },
  { id: 2, email: 'employee@mytechtactics.com', roles: ['Employee'] },
  { id: 3, email: 'stalinmedrano@mytechtactics.com', roles: ['Admin'] },
]
