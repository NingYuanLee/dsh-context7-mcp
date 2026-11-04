/**
 * Pure helpers for the Context7 remote MCP connection.
 *
 * The API key belongs in the Authorization header, never in the URL.
 * Callers must not log the header value.
 */

export const DEFAULT_URL = 'https://mcp.context7.com/mcp'

const SECRET_QUERY = /^(api[_-]?key|access[_-]?token|token|authorization|context7[_-]?api[_-]?key)$/i

/**
 * Validate and normalize the remote MCP endpoint.
 * The result must not contain the API key.
 * @param {string} raw
 */
export function context7Endpoint(raw) {
  const url = new URL(raw)
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Context7 MCP url must use http or https')
  }
  if (url.username !== '' || url.password !== '') {
    throw new Error('Context7 MCP url must not contain user info')
  }
  for (const name of url.searchParams.keys()) {
    if (SECRET_QUERY.test(name)) {
      throw new Error('Context7 MCP url must not carry the API key')
    }
  }
  url.hash = ''
  return url.href
}

/**
 * Build request headers for an optional API key.
 * An empty key connects anonymously and returns undefined.
 * @param {string | undefined | null} apiKey
 * @returns {Record<string, string> | undefined}
 */
export function context7Headers(apiKey) {
  if (typeof apiKey !== 'string') return undefined
  const key = apiKey.trim()
  if (key === '') return undefined
  if (/[\r\n]/.test(key)) {
    throw new Error('Context7 API key must be a single line')
  }
  return { Authorization: `Bearer ${key}` }
}

/**
 * Remove a resolved key from text that might be logged.
 * @param {unknown} value
 * @param {string | undefined | null} apiKey
 */
export function redactSecret(value, apiKey) {
  const text = typeof value === 'string' ? value : String(value ?? '')
  const key = typeof apiKey === 'string' ? apiKey.trim() : ''
  if (key === '') return text
  return text.split(key).join('[redacted]')
}
