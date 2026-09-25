export const serviceRequestCatalog = {
  services: [
    {
      key: 'new-website-build',
      title: 'New Website Build',
      requestType: 'Website Build',
      summary: 'Launch a professional website built around your business goals, customers, and next action.',
      includes: [
        'Homepage and core page structure',
        'Mobile-first responsive design',
        'Contact or quote-request flow',
        'Basic on-page SEO structure',
        'Analytics and conversion tracking setup',
        'Launch support',
      ],
    },
    {
      key: 'website-redesign',
      title: 'Website Redesign',
      requestType: 'Website Redesign',
      summary: 'Modernize an outdated, confusing, slow, or mobile-unfriendly website.',
      includes: [
        'Visual redesign',
        'Navigation and page-structure cleanup',
        'Messaging and call-to-action improvements',
        'Mobile usability improvements',
        'Performance review',
        'Migration and relaunch planning',
      ],
    },
    {
      key: 'content-page-updates',
      title: 'Content & Page Updates',
      requestType: 'Website Update',
      summary: 'Add, revise, or improve website pages and business content without rebuilding the whole site.',
      includes: [
        'New service pages',
        'Text and image updates',
        'Team or about-page updates',
        'Location or service-area updates',
        'Landing pages',
        'Call-to-action improvements',
      ],
    },
    {
      key: 'lead-booking-flows',
      title: 'Lead, Booking & Sales Flows',
      requestType: 'Website Conversion',
      summary: 'Make it easier for visitors to contact, book, request a quote, or buy.',
      includes: [
        'Quote-request forms',
        'Appointment booking',
        'Lead capture',
        'Payment or checkout connections',
        'Conversion-focused landing pages',
        'Follow-up workflow planning',
      ],
    },
    {
      key: 'integrations-automation',
      title: 'Business Integrations & Automation',
      requestType: 'Website Integration',
      summary: 'Connect the website to the systems your business already uses.',
      includes: [
        'CRM integrations',
        'Zoho integrations',
        'Email and notification workflows',
        'Analytics integrations',
        'API connections',
        'Customer or staff portal features',
      ],
    },
    {
      key: 'website-care-support',
      title: 'Website Care & Support',
      requestType: 'Website Support',
      summary: 'Ongoing help for updates, troubleshooting, maintenance, and improvements.',
      includes: [
        'Content updates',
        'Issue troubleshooting',
        'Performance checks',
        'Form and integration checks',
        'Analytics review',
        'Ongoing improvement requests',
      ],
    },
  ],
  packages: [
    {
      key: 'launch-package',
      title: 'Launch Package',
      requestType: 'Website Package',
      summary: 'A focused professional site for a local business that needs a strong foundation.',
      includes: [
        'Up to 5 core pages',
        'Responsive mobile-first design',
        'Contact or quote-request flow',
        'Basic SEO structure',
        'Analytics and conversion tracking setup',
      ],
    },
    {
      key: 'growth-package',
      title: 'Growth Package',
      requestType: 'Website Package',
      summary: 'A larger lead-generation site for businesses with multiple services, locations, or campaigns.',
      includes: [
        'Expanded service and landing pages',
        'Conversion-focused page structure',
        'Booking, forms, or CRM connection',
        'Local SEO content structure',
        'Performance and analytics review',
      ],
    },
    {
      key: 'business-platform-package',
      title: 'Business Platform Package',
      requestType: 'Website Package',
      summary: 'Custom web functionality for businesses that need more than a traditional marketing website.',
      includes: [
        'Custom workflows or web app features',
        'Customer or staff portal options',
        'API and business-system integrations',
        'Automation opportunities',
        'Ongoing support options',
      ],
    },
  ],
}

export function getCatalogEntries(catalogType) {
  return serviceRequestCatalog[catalogType] || serviceRequestCatalog.services
}

export function getCatalogEntry(catalogType, entryKey) {
  return getCatalogEntries(catalogType).find((entry) => entry.key === entryKey) || getCatalogEntries(catalogType)[0]
}

export function buildServiceRequestPayload(form, selectedEntry) {
  const requestedItem = String(form.requestedItem || '').trim()
  const customerNotes = String(form.description || '').trim()
  const zohoLabel = requestedItem ? `${selectedEntry.title} - ${requestedItem}` : selectedEntry.title
  const detailLines = [
    selectedEntry.summary,
    requestedItem ? `Requested focus: ${requestedItem}` : '',
    `Zoho Books service label: ${zohoLabel}`,
    'Included services:',
    ...selectedEntry.includes.map((item) => `- ${item}`),
    customerNotes ? '' : '',
    customerNotes ? 'Customer notes:' : '',
    customerNotes || '',
  ].filter(Boolean)

  return {
    serviceType: selectedEntry.requestType,
    category: selectedEntry.title,
    title: requestedItem || selectedEntry.title,
    address: String(form.address || '').trim(),
    description: detailLines.join('\n'),
    note: 'Awaiting admin review.',
  }
}
