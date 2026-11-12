// Thin fetch wrapper: same-origin /api (proxied to Express), cookies included,
// and every error surfaces as an Error with the server's message.
export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = {};
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok || json.success === false) {
    throw new ApiError(json.message || `Request failed (${res.status})`, res.status, json.details);
  }
  return json.data;
}

export function errorText(err) {
  if (err?.details?.length) return err.details.map((d) => `${d.field ? d.field + ': ' : ''}${d.message}`).join(' · ');
  return err?.message || 'Something went wrong';
}
