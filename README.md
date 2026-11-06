# dsh-context7-mcp

[![npm](https://img.shields.io/npm/v/dsh-context7-mcp.svg)](https://www.npmjs.com/package/dsh-context7-mcp) [![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE) [![Node >=22.19](https://img.shields.io/badge/node-%3E%3D22.19.0-339933.svg)](#compatibility) [![dsh](https://img.shields.io/badge/dsh-%3E%3D0.2.1--rc.2%20%3C0.3.0--0%20%7C%7C%20%3E%3D0.2.2--0%20%3C0.3.0--0-6f42c1)](#compatibility) [![topic: dsh-plugin](https://img.shields.io/badge/topic-dsh--plugin-6f42c1.svg)](https://github.com/topics/dsh-plugin) [![powered by dsh](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)

> Third-party community plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). Not an official DeepSeek or Context7 product. MIT licensed.

English | [中文](README.zh.md)

Connects [Context7's hosted MCP server](https://github.com/upstash/context7) and registers the tools that server publishes. At release time those tools are `resolve-library-id` and `query-docs`. They show up as `mcp__context7__*`.

## What it does

The agent can fetch current, version-specific library documentation without a local `npx` process. The plugin hands a Streamable HTTP connection to the built-in `@deepseek-ai/dsh-mcp-client`.

Context7 accepts anonymous calls at a lower rate limit. For a higher limit, create a key at [context7.com/dashboard](https://context7.com/dashboard) and save it as the `CONTEXT7_API_KEY` credential. The key is not stored in `cordis.patch.yml`. Saving or clearing the credential reconnects.

## How it works

1. Resolve `apiKeyEnv` (default `CONTEXT7_API_KEY`) through `ctx.credentials`. The store wins over the process environment. An empty value is not an error.
2. Call `https://mcp.context7.com/mcp`. When a key is present it is sent only as `Authorization: Bearer`. It is never placed in the URL.
3. Mount one `@deepseek-ai/dsh-mcp-client` child. Tool names, schemas, and results come from the server. This package does not reimplement them.
4. When `credentials/reference-updated` fires for the same credential name, dispose that child and connect again.

Each tool call times out after 60 seconds. A dropped connection uses the MCP client's own reconnect policy.

Ask for docs the way Context7 expects: name the library, or pass a Context7 id such as `/vercel/next.js`. The agent should call `resolve-library-id` first unless the id is already known, then `query-docs`.

## Install

From this checkout:

```bash
dsh plugin --profile web add D:\tools\dsh-plugins\dsh-context7-mcp
```

After the package is published:

```bash
dsh plugin --profile web add dsh-context7-mcp
```

The package declares `dsh.bundle.patch`, so `dsh plugin add` writes the bundle into the profile. Restart DeepSeek Harness if the tools do not appear in the current session.

`CONTEXT7_API_KEY` is optional. Set it in this plugin's settings, or export the same name in the environment that launches DeepSeek Harness.

## Configuration

| Field | Default | Meaning |
|---|---|---|
| `apiKeyEnv` | `CONTEXT7_API_KEY` | Credential reference. The value is not kept in this config. Empty means anonymous access. |
| `url` | `https://mcp.context7.com/mcp` | Remote MCP endpoint. `http` and `https` only. No user info, and no API key in the query string. |
| `serverName` | `context7` | Namespace for tool names: `mcp__<serverName>__<tool>`. Must match `[A-Za-z0-9_-]{1,32}` and be unique among MCP clients in the same scope. |

Example profile override. A later patch replaces the whole `config` object, so repeat every field you still want:

```yaml
- id: context7-mcp
  config:
    apiKeyEnv: CONTEXT7_API_KEY
    url: https://mcp.context7.com/mcp
    serverName: context7
```

The Cordis row id is `context7-mcp`. The package name is `dsh-context7-mcp`.

## Security

- A saved key is sent only to the configured endpoint, as an `Authorization` header.
- The key is not written into `cordis.patch.yml` or into this plugin's own log lines. Client errors are redacted when they contain the resolved key.
- Library names and documentation questions are sent to Context7.
- The plugin does not spawn a process and does not read the credentials file directly.

See [SECURITY.md](SECURITY.md).

## Compatibility

| Item | Value |
|---|---|
| dsh | `>=0.2.1-rc.2 <0.3.0-0 \|\| >=0.2.2-0 <0.3.0-0` |
| Node | `>=22.19.0` |
| Verified on | dsh `0.2.2-rc.1` |
| Server | `https://mcp.context7.com/mcp` |
| Requires | `credentials`, `tools`, and the shipped `@deepseek-ai/dsh-mcp-client` |

Display metadata is `locale/en.json`, `locale/zh.json`, and `icon.svg`. There is no Web UI and no build step.

## Uninstall

```bash
dsh plugin --profile <name> remove dsh-context7-mcp
```

Removing the plugin disconnects the MCP server and unregisters its tools. It does not delete the `CONTEXT7_API_KEY` credential. Nothing else is stored on disk by this package.

## Troubleshooting

**No `mcp__context7__*` tools.** The server rejected the connection, or another MCP client already reserved `serverName` `context7`. The plugin log says which case it hit and does not print the key.

**Calls return 429.** The anonymous rate limit was hit. Save `CONTEXT7_API_KEY` and wait for the reconnect.

**`serverName` is already in use.** Pick another `serverName` in config. That also changes the public tool names.

**A call times out.** The limit is 60 seconds per call and is not a config field in 0.1.0.

## Development

```bash
node --test test/*.test.js
node --check src/index.js && node --check src/connection.js
npm run check:pack
```

```text
src/connection.js  pure endpoint, header, and redaction helpers (unit-tested, no network)
src/index.js       Cordis plugin: resolve the credential and mount dsh-mcp-client
locale/            display metadata (en, zh)
test/              node:test suites, including packaging invariants
```
