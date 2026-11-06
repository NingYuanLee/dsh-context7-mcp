# dsh-context7-mcp

[![CI](https://github.com/NingYuanLee/dsh-context7-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/NingYuanLee/dsh-context7-mcp/actions/workflows/ci.yml) [![npm](https://img.shields.io/npm/v/dsh-context7-mcp.svg)](https://www.npmjs.com/package/dsh-context7-mcp) [![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE) [![Node >=22.19](https://img.shields.io/badge/node-%3E%3D22.19.0-339933.svg)](#compatibility) [![dsh](https://img.shields.io/badge/dsh-%3E%3D0.2.1--rc.2%20%3C0.3.0--0%20%7C%7C%20%3E%3D0.2.2--0%20%3C0.3.0--0-6f42c1)](#compatibility) [![topic: dsh-plugin](https://img.shields.io/badge/topic-dsh--plugin-6f42c1.svg)](https://github.com/topics/dsh-plugin) [![powered by dsh](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)

> [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的第三方社区插件，不是 DeepSeek 或 Context7 的官方产品。MIT。

[English](README.md) | 中文

接入 [Context7 托管的 MCP 服务器](https://github.com/upstash/context7)，并注册该服务器公布的工具。发布时这些工具是 `resolve-library-id` 和 `query-docs`。模型看到的名字是 `mcp__context7__*`。

## What it does

助手可以直接查询当前版本的库文档，不需要本机再跑一个 `npx` 进程。插件把 Streamable HTTP 连接交给自带的 `@deepseek-ai/dsh-mcp-client`。

Context7 允许匿名调用，限额较低。更高限额请到 [context7.com/dashboard](https://context7.com/dashboard) 创建 Key，并保存为 `CONTEXT7_API_KEY` 凭据。Key 不会写入 `cordis.patch.yml`。保存或清空凭据后会重新连接。

## How it works

1. 用 `ctx.credentials` 解析 `apiKeyEnv`（默认 `CONTEXT7_API_KEY`）。凭据库优先于进程环境变量。空值不是错误。
2. 请求 `https://mcp.context7.com/mcp`。有 Key 时只放在 `Authorization: Bearer`，不会放进 URL。
3. 挂一个 `@deepseek-ai/dsh-mcp-client` 子插件。工具名、参数和结果都来自服务器，本包不重写这些工具。
4. 同名凭据发出 `credentials/reference-updated` 时，拆掉该子插件再连一次。

单次工具调用超时 60 秒。连接断开后沿用 MCP 客户端自己的重连策略。

提问方式与 Context7 一致：给出库名，或直接给出 `/vercel/next.js` 这样的 Context7 id。还不知道 id 时先调 `resolve-library-id`，再用 `query-docs`。

## Install

在本仓库中：

```bash
dsh plugin --profile web add D:\tools\dsh-plugins\dsh-context7-mcp
```

包发布之后：

```bash
dsh plugin --profile web add dsh-context7-mcp
```

包里声明了 `dsh.bundle.patch`，`dsh plugin add` 会把 bundle 写进 profile。如果当前会话里还看不到工具，重启 DeepSeek Harness。

`CONTEXT7_API_KEY` 可选。可以在这个插件的设置里填写，也可以在启动 DeepSeek Harness 的环境里导出同名变量。

## Configuration

| 字段 | 默认值 | 含义 |
|---|---|---|
| `apiKeyEnv` | `CONTEXT7_API_KEY` | 凭据引用。值不会留在这份配置里。为空则匿名访问。 |
| `url` | `https://mcp.context7.com/mcp` | 远程 MCP 地址。只允许 `http` 和 `https`。不能带用户信息，查询串里也不能放 API Key。 |
| `serverName` | `context7` | 工具名前缀：`mcp__<serverName>__<tool>`。必须匹配 `[A-Za-z0-9_-]{1,32}`，并且在同一作用域里唯一。 |

Profile 覆盖示例。后写的 patch 会替换整个 `config`，仍需要的字段要一并写上：

```yaml
- id: context7-mcp
  config:
    apiKeyEnv: CONTEXT7_API_KEY
    url: https://mcp.context7.com/mcp
    serverName: context7
```

Cordis 行 id 是 `context7-mcp`。包名是 `dsh-context7-mcp`。

## Security

- 保存的 Key 只发给配置的地址，放在 `Authorization` 头里。
- Key 不会写入 `cordis.patch.yml`，也不会出现在本插件自己的日志里。客户端错误如果带上了解析后的 Key，会被打码。
- 库名和文档问题会发给 Context7。
- 插件不启动子进程，也不直接读取凭据文件。

详见 [SECURITY.md](SECURITY.md)。

## Compatibility

| 项目 | 值 |
|---|---|
| dsh | `>=0.2.1-rc.2 <0.3.0-0 \|\| >=0.2.2-0 <0.3.0-0` |
| Node | `>=22.19.0` |
| 已验证 | dsh `0.2.2-rc.1` |
| 服务器 | `https://mcp.context7.com/mcp` |
| 依赖 | `credentials`、`tools`，以及自带的 `@deepseek-ai/dsh-mcp-client` |

展示信息在 `locale/en.json`、`locale/zh.json` 和 `icon.svg`。没有 Web UI，也不需要构建。

## Uninstall

```bash
dsh plugin --profile <name> remove dsh-context7-mcp
```

卸掉插件会断开 MCP 并注销工具，不会删除 `CONTEXT7_API_KEY` 凭据。这个包自己不在磁盘上另存别的东西。

## Troubleshooting

**看不到 `mcp__context7__*` 工具。** 服务器拒绝了连接，或者另一个 MCP 客户端已经占用了 `serverName` `context7`。插件日志会说明是哪一种，并且不会打印 Key。

**调用返回 429。** 匿名限额用完了。保存 `CONTEXT7_API_KEY`，等待自动重连。

**`serverName` 已被占用。** 在配置里换一个 `serverName`。公开的工具名也会跟着变。

**调用超时。** 0.1.0 里单次调用上限是 60 秒，不能通过配置修改。

## Development

```bash
node --test test/*.test.js
node --check src/index.js && node --check src/connection.js
npm run check:pack
```

```text
src/connection.js  纯函数：地址、请求头和打码（有单元测试，不访问网络）
src/index.js       Cordis 插件：解析凭据并挂载 dsh-mcp-client
locale/            展示文案（en、zh）
test/              node:test，含打包不变量
```
