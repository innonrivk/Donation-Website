const API_BASE = '/api/v1';

/**
 * Fetch wrapper with error handling
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
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch all public content (website content, donation boxes, projects, tiers)
 */
export function getContent() {
  return request('/content');
}

/**
 * Create a donation subscription
 */
export function createSubscription(data) {
  return request('/donations/subscribe', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
