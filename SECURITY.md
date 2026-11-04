# Security policy

## Reporting a vulnerability

Please report security issues privately through GitHub Security Advisories on this repository
(`Security` → `Report a vulnerability`). Do not open a public issue that includes an API key
or a request that still contains one.

Include the DeepSeek Harness version, the profile, and reproduction steps. Redact
`Authorization` values. Expected first response within 7 days.

## Scope

`dsh-context7-mcp` connects the official `@deepseek-ai/dsh-mcp-client` to Context7's hosted MCP
server so the agent can call that server's tools.

- The plugin reads one credential reference, `CONTEXT7_API_KEY` by default, through
  `ctx.credentials.resolve`. It does not read `$DSH_HOME/.credentials.yaml` itself.
- The resolved key is sent only to the configured endpoint (default `https://mcp.context7.com/mcp`),
  as `Authorization: Bearer`. The URL is rejected when it contains user info or a query
  parameter that looks like an API key.
- The key is not written into `cordis.patch.yml` or into this plugin's own log lines.
  If a client error still contains the resolved key, this plugin redacts that value before
  logging. Treat any remaining raw client error as secret.
- Library names and documentation questions are sent to Context7. Context7's retention and
  rate-limit rules apply. This plugin does not add another outbound destination.
- The plugin spawns no process and opens no local listener.
- An empty credential still connects, anonymously, and registers the server's tools at the
  anonymous rate limit.

## Supported versions

Security fixes target the latest `0.1.x` release on the `>=0.2.1-rc.2 <0.3.0-0` DeepSeek
Harness range.
