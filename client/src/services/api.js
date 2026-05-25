const API_BASE = '/api/v1';

/**
 * Fetch wrapper with structured error handling.
 * Parses backend JSON error responses and attaches error codes.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: 'request_failed' }));
    const err = new Error(errorBody.message || errorBody.error || `HTTP ${response.status}`);
    err.errorCode = errorBody.error || null;
    err.fields = errorBody.fields || null;
    throw err;
  }

  return response.json();
}

/**
 * Fetch all public content (website content, donation boxes, projects, tiers, milestones)
 */
export function getContent() {
  return request('/content');
}

/**
 * Create a donation subscription.
 * Sends amount in DOLLARS — backend converts to cents.
 */
export function createSubscription(data) {
  return request('/donations/subscribe', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
