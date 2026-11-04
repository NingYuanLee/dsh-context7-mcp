import { test } from 'node:test'
import assert from 'node:assert/strict'
import { context7Endpoint, context7Headers, DEFAULT_URL, redactSecret } from '../src/connection.js'

test('default endpoint is the hosted Context7 MCP url', () => {
  const url = new URL(context7Endpoint(DEFAULT_URL))
  assert.equal(url.origin + url.pathname, DEFAULT_URL)
  assert.equal(url.username, '')
  assert.equal(url.password, '')
  assert.equal(url.hash, '')
  assert.equal([...url.searchParams.keys()].length, 0)
})

test('drops a fragment and keeps an ordinary query', () => {
  const href = context7Endpoint(`${DEFAULT_URL}?topic=docs#section`)
  const url = new URL(href)
  assert.equal(url.searchParams.get('topic'), 'docs')
  assert.equal(url.hash, '')
})

test('rejects userinfo, non-http urls, and keys in the query', () => {
  assert.throws(() => context7Endpoint('https://user:pw@mcp.context7.com/mcp'), /user info/)
  assert.throws(() => context7Endpoint('ftp://mcp.context7.com/mcp'), /http or https/)
  assert.throws(() => context7Endpoint('/mcp'), TypeError)
  assert.throws(() => context7Endpoint(`${DEFAULT_URL}?api_key=secret`), /must not carry/)
  assert.throws(() => context7Endpoint(`${DEFAULT_URL}?CONTEXT7_API_KEY=secret`), /must not carry/)
  assert.throws(() => context7Endpoint(`${DEFAULT_URL}?authorization=secret`), /must not carry/)
})

test('omits the header when there is no key', () => {
  assert.equal(context7Headers(undefined), undefined)
  assert.equal(context7Headers(null), undefined)
  assert.equal(context7Headers(''), undefined)
  assert.equal(context7Headers('   '), undefined)
})

test('sends a trimmed key only as a bearer token', () => {
  const headers = context7Headers('  test-key  ')
  assert.deepEqual(headers, { Authorization: 'Bearer test-key' })
  assert.equal(Object.keys(headers).length, 1)
  assert.equal(context7Endpoint(DEFAULT_URL).includes('test-key'), false)
})

test('rejects a key that could break the header', () => {
  assert.throws(() => context7Headers('one\ntwo'), /single line/)
})

test('redacts the key and leaves the surrounding text', () => {
  assert.equal(redactSecret('Bearer test-key failed', 'test-key'), 'Bearer [redacted] failed')
  assert.equal(redactSecret('no secret here', ''), 'no secret here')
  assert.equal(redactSecret('Bearer test-key', '  test-key  '), 'Bearer [redacted]')
})
