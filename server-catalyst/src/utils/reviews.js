function normalizeReviewArray(settings = {}) {
  return Array.isArray(settings.customer_reviews) ? settings.customer_reviews : [];
}

function toDisplayName(value) {
  const name = String(value || '').trim();
  if (!name) {
    return 'Customer';
  }

  return name.split(/\s+/)[0] || 'Customer';
}

function sortNewestFirst(left, right) {
  return String(right.submittedAt || right.requestedAt || '').localeCompare(
    String(left.submittedAt || left.requestedAt || '')
  );
}

export function getPublishedReviews(settings = {}) {
  return normalizeReviewArray(settings)
    .filter((entry) => entry.status === 'published' && entry.quote)
    .sort(sortNewestFirst)
    .map((entry) => ({
      id: entry.ticketId,
      quote: entry.quote,
      rating: Number(entry.rating || 5),
      customerName: entry.customerName || 'Customer',
      serviceTitle: entry.serviceTitle || entry.category || 'Completed service',
      submittedAt: entry.submittedAt || entry.requestedAt || ''
    }));
}

export function getCustomerReviewRequests(settings = {}, customerId) {
  return normalizeReviewArray(settings)
    .filter(
      (entry) =>
        String(entry.customerId) === String(customerId) &&
        entry.status === 'requested'
    )
    .sort(sortNewestFirst);
}

export function ensureReviewRequest(settings = {}, ticket) {
  const existing = normalizeReviewArray(settings);
  const next = [...existing];
  const index = next.findIndex((entry) => String(entry.ticketId) === String(ticket.id));
  const baseEntry = {
    ticketId: String(ticket.id),
    customerId: String(ticket.customerId || ''),
    customerName: toDisplayName(ticket.customerName),
    serviceTitle: ticket.title || ticket.type || ticket.category || 'Completed service',
    category: ticket.category || ticket.type || '',
    requestedAt: new Date().toISOString(),
    status: 'requested',
    quote: '',
    rating: 5,
    submittedAt: ''
  };

  if (index === -1) {
    next.unshift(baseEntry);
  } else {
    next[index] = {
      ...baseEntry,
      ...next[index],
      customerName: next[index].customerName || baseEntry.customerName,
      serviceTitle: next[index].serviceTitle || baseEntry.serviceTitle,
      category: next[index].category || baseEntry.category,
      requestedAt: next[index].requestedAt || baseEntry.requestedAt,
      status: next[index].status === 'published' ? 'published' : 'requested'
    };
  }

  return { customer_reviews: next };
}

export function submitCustomerReview(settings = {}, user, ticket, payload) {
  const existing = normalizeReviewArray(settings);
  const next = [...existing];
  const index = next.findIndex((entry) => String(entry.ticketId) === String(ticket.id));
  const reviewQuote = String(payload?.quote || '').trim();
  const rating = Math.min(5, Math.max(1, Number(payload?.rating || 5)));

  const reviewEntry = {
    ...(index >= 0 ? next[index] : {}),
    ticketId: String(ticket.id),
    customerId: String(user.id),
    customerName: toDisplayName(user.name),
    serviceTitle:
      ticket.title ||
      ticket.type ||
      ticket.category ||
      next[index]?.serviceTitle ||
      'Completed service',
    category: ticket.category || next[index]?.category || '',
    requestedAt: next[index]?.requestedAt || new Date().toISOString(),
    submittedAt: new Date().toISOString(),
    status: 'published',
    quote: reviewQuote,
    rating
  };

  if (index === -1) {
    next.unshift(reviewEntry);
  } else {
    next[index] = reviewEntry;
  }

  return {
    customer_reviews: next,
    review: reviewEntry
  };
}
