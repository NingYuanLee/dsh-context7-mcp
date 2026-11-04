/**
 * @module dsh-context7-mcp
 *
 * Host bundle for Context7's remote MCP server
 * (https://mcp.context7.com/mcp).
 *
 * The API key never lives in cordis.patch.yml. Loader expressions are sync, so
 * this plugin resolves the credential itself and then mounts
 * `@deepseek-ai/dsh-mcp-client` as a child. A later credential write reconnects
 * without copying the secret into the profile.
 *
 * Context7 allows anonymous use at a lower rate limit. A saved key is sent
 * only as `Authorization: Bearer`, never on the URL.
 */
import { apply as connectMcp, Config as McpConfig } from '@deepseek-ai/dsh-mcp-client'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import z from '@deepseek-ai/schemastery'
import { context7Endpoint, context7Headers, DEFAULT_URL, redactSecret } from './connection.js'

export { context7Endpoint, context7Headers, DEFAULT_URL, redactSecret }

export const name = 'context7-mcp'
export const inject = ['credentials', 'tools']

const SERVER_NAME = /^[A-Za-z0-9_-]{1,32}$/
const TOOL_CALL_TIMEOUT_MS = 60_000

export const Config = z.object({
  apiKeyEnv: z.string().role('credential-ref').default('CONTEXT7_API_KEY'),
  url: z.string().default(DEFAULT_URL),
  serverName: z.string().pattern(SERVER_NAME).default('context7'),
})

const mcpPlugin = {
  name: 'context7-mcp-connection',
  inject: ['tools'],
  Config: McpConfig,
  apply: connectMcp,
}

export async function apply(ctx, config) {
  let generation = 0
  let fiber
  let queue = Promise.resolve()

  const stop = () => {
    generation += 1
    fiber?.dispose()
    fiber = undefined
  }

  async function connect(token) {
    fiber?.dispose()
    fiber = undefined
    if (token !== generation) return

    const refName = config.apiKeyEnv
    let key = ''
    try {
      key = (await ctx.credentials.resolve(credentialRef(refName)))?.value?.trim() ?? ''
    } catch (error) {
      ctx.logger.error(error)
      return
    }
    if (token !== generation) return

    let endpoint
    let headers
    try {
      endpoint = context7Endpoint(config.url)
      headers = context7Headers(key)
    } catch (error) {
      ctx.logger.error('Context7 MCP 配置无效。请检查 url，不要把 API Key 写进地址。')
      ctx.logger.error(redactSecret(error instanceof Error ? error.message : error, key))
      return
    }
    if (token !== generation) return
    if (!key) {
      ctx.logger.warn(`Context7 MCP 未设置凭据 ${refName}，按匿名限额连接。保存 API Key 后会自动重连并提高限额。`)
    }

    const next = ctx.plugin(mcpPlugin, {
      transport: 'streamable-http',
      serverName: config.serverName,
      url: endpoint,
      ...(headers ? { headers } : {}),
      toolCallTimeoutMs: TOOL_CALL_TIMEOUT_MS,
      failOnStartupError: false,
    })
    if (token !== generation) {
      next.dispose()
      return
    }
    fiber = next
    void Promise.resolve(next).catch((error) => {
      if (token !== generation) return
      ctx.logger.error('Context7 MCP 连接失败。请检查 API Key 和 url，密钥本身不会写在这条日志里。')
      const detail = error instanceof Error ? (error.stack || error.message) : error
      ctx.logger.error(redactSecret(detail, key))
    })
  }

  function schedule() {
    const token = ++generation
    const run = queue.then(() => connect(token))
    queue = run.then(() => {}, () => {})
    return run
  }

  ctx.on('credentials/reference-updated', (ref) => {
    if (String(ref) !== config.apiKeyEnv) return
    void schedule()
  })
  ctx.effect(() => stop)

  await schedule()
}
