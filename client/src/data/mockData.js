import { assetPath } from '../utils/assets'

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
    kicker: 'Smart home installs • Repairs • Secure connections',
    title: ['SMART SOLUTIONS.', 'SECURE CONNECTIONS.'],
    text:
      'TechTactics designs and installs modern smart home systems—security, networking, audio/video, and automation—built clean, built safe, built right.',
  },
  services: [
    {
      title: 'Smart Security',
      text: 'Cameras, alarm systems, doorbells, sensors, and monitoring-ready setups.',
      image: assetPath('assets/service-security.png'),
    },
    {
      title: 'Networking / Wi‑Fi',
      text: 'Whole-home Wi‑Fi, wired drops, mesh tuning, and guest networks.',
      image: assetPath('assets/service-wifi.png'),
    },
    {
      title: 'Audio / Video',
      text: 'TV mounting, soundbars, whole-home audio, and clean cable management.',
      image: assetPath('assets/service-audio.png'),
    },
    {
      title: 'Smart Switches',
      text: 'Lighting control, scenes, automation, and app setup.',
      image: assetPath('assets/service-switches.png'),
    },
  ],
}

export const customerServices = [
  {
    id: 1,
    serviceName: 'Whole-Home Wi‑Fi Optimization',
    category: 'Networking',
    status: 'Active',
    startedAt: '2026-02-18',
    monthlyPrice: 29.99,
  },
  {
    id: 2,
    serviceName: 'Front Door Camera Monitoring',
    category: 'Security',
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
    type: 'Repair',
    category: 'Wi‑Fi',
    address: '612 S Burnside Ave Suite B, Gonzales, LA 70737',
    description: 'Back bedroom has poor Wi‑Fi signal and smart TV buffering.',
    status: 'Accepted',
    assignedEmployee: 'Taylor Employee',
    updatedAt: '2026-04-11 9:30 AM',
    note: 'Technician scheduled for Tuesday morning.',
  },
  {
    id: 1043,
    customerId: 'customer-1',
    customerName: 'Jordan Customer',
    type: 'New Install',
    category: 'Security',
    address: '612 S Burnside Ave Suite B, Gonzales, LA 70737',
    description: 'Need estimate for a 4-camera system with app access.',
    status: 'Waiting on Equipment',
    assignedEmployee: 'Taylor Employee',
    updatedAt: '2026-04-10 3:10 PM',
    note: 'Waiting for customer approval on equipment package.',
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
    description: 'Repair and mesh tuning for Wi‑Fi coverage issue.',
  },
  {
    id: 'INV-3015',
    requestId: 1043,
    status: 'draft',
    amount: 899.0,
    invoiceNumber: 'TT-1043',
    paymentLink: 'https://example.com/pay/TT-1043',
    description: '4-camera installation estimate.',
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
