export const serviceRequestCatalog = {
  services: [
    {
      key: 'smart-home-installations',
      title: 'Smart Home Installations',
      requestType: 'New Install',
      summary: 'Smart devices installed, connected, and configured correctly.',
      includes: [
        'Smart thermostats',
        'Smart switches and dimmers',
        'Smart plugs',
        'Smart lighting',
        'Smart locks',
        'Voice assistant setup',
        'Smart home app setup',
      ],
    },
    {
      key: 'security-camera-systems',
      title: 'Security & Camera Systems',
      requestType: 'Security Install',
      summary: 'Protect homes and businesses with professionally installed security technology.',
      includes: [
        'Security cameras',
        'Video doorbells',
        'Alarm systems',
        'Door and window sensors',
        'Motion detectors',
        'Smart locks',
        'Remote camera viewing setup',
      ],
    },
    {
      key: 'wifi-networking',
      title: 'Wi-Fi & Networking',
      requestType: 'Networking',
      summary: 'Reliable connections for smart homes, offices, and everyday devices.',
      includes: [
        'Router setup',
        'Mesh Wi-Fi installation',
        'Wi-Fi dead zone fixes',
        'Ethernet cable runs',
        'Network troubleshooting',
        'Device connectivity repair',
        'Small business network setup',
      ],
    },
    {
      key: 'smart-audio-entertainment',
      title: 'Smart Audio & Entertainment',
      requestType: 'Audio / Entertainment',
      summary: 'Clean installs for entertainment and connected living spaces.',
      includes: [
        'TV mounting',
        'Soundbar setup',
        'Surround sound setup',
        'Smart speaker installation',
        'Whole-home audio',
        'Streaming device setup',
        'Outdoor audio setup',
      ],
    },
    {
      key: 'repairs-troubleshooting',
      title: 'Repairs & Troubleshooting',
      requestType: 'Repair',
      summary: 'Fast support when devices stop working or connections fail.',
      includes: [
        'Offline camera repair',
        'Wi-Fi troubleshooting',
        'Smart device reconnecting',
        'App/account setup issues',
        'Alarm sensor issues',
        'Thermostat issues',
        'System reconfiguration',
      ],
    },
    {
      key: 'maintenance-plans',
      title: 'Maintenance Plans',
      requestType: 'Maintenance',
      summary: 'Ongoing support to keep your home or business connected and secure.',
      includes: [
        'Quarterly system checkups',
        'Camera health checks',
        'Wi-Fi performance checks',
        'Device updates',
        'Priority scheduling',
        'Discounted service calls',
      ],
    },
  ],
  packages: [
    {
      key: 'smart-start-package',
      title: 'Smart Start Package',
      requestType: 'Service Package',
      summary: 'Perfect for customers starting their smart home setup.',
      includes: [
        '1 smart thermostat, doorbell, lock, switch, or plug installation',
        'App setup',
        'Device connection',
        'Customer walkthrough',
      ],
    },
    {
      key: 'secure-connections-package',
      title: 'Secure Connections Package',
      requestType: 'Service Package',
      summary: 'Focused on home or business security.',
      includes: [
        'Camera installation',
        'Video doorbell setup',
        'Smart lock setup',
        'Sensor setup',
        'Remote viewing configuration',
      ],
    },
    {
      key: 'connected-home-package',
      title: 'Connected Home Package',
      requestType: 'Service Package',
      summary: 'For customers struggling with Wi-Fi or smart device connection issues.',
      includes: [
        'Router or mesh Wi-Fi setup',
        'Dead zone troubleshooting',
        'Device connectivity repair',
        'Network optimization',
      ],
    },
    {
      key: 'total-techtactics-package',
      title: 'Total TechTactics Package',
      requestType: 'Service Package',
      summary: 'A full smart home and security setup.',
      includes: [
        'Smart home devices',
        'Security cameras',
        'Wi-Fi/networking setup',
        'Smart audio or entertainment setup',
        'Full customer walkthrough',
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
    note: 'Awaiting admin approval.',
  }
}
