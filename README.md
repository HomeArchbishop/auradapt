# auradapt

OneBot v11 ↔ 消息平台适配器（Bun + TypeScript monorepo）。

把 Telegram 等平台的消息桥接到 OneBot 协议，供 NoneBot / Koishi / aurorax 等框架使用。

## 结构

```
apps/gateway              # 部署入口（bun start）
packages/core             # Platform 接口、logger
packages/onebot           # OneBot v11 类型、action 路由、正/反向 WS、heartbeat
packages/telegram         # Telegram Bot API、polling、编解码、actions
```

平台能力各自独立成 package；新增平台时实现 `@auradapt/core` 的 `Platform` 接口，并在 `apps/gateway` 注册即可。

## 要求

- [Bun](https://bun.sh) ≥ 1.3

## 快速开始

```bash
bun install
cp .env.example .env
# 编辑 PLATFORM / ONEBOT_* / TELEGRAM_TOKEN
bun start
```

## 配置（`.env`）

| 变量 | 说明 |
|------|------|
| `PLATFORM` | 平台，目前仅 `telegram` |
| `ONEBOT_MODE` | `forward` 或 `reverse` |
| `ONEBOT_ACCESS_TOKEN` | 可选，Bearer / `?access_token=` |
| `ONEBOT_WS_HOST` / `PORT` / `PATH` | **正向**：本机监听 |
| `ONEBOT_WS_URL` | **反向**：连出到框架的 WS 地址 |
| `ONEBOT_RECONNECT_INTERVAL_MS` | 反向断线重连间隔 |
| `ONEBOT_HEARTBEAT_INTERVAL_MS` | 心跳间隔 |
| `TELEGRAM_TOKEN` | BotFather token |
| `TELEGRAM_API_ROOT` | 默认 `https://api.telegram.org` |
| `TELEGRAM_PROXY` | 可选代理 |
| `TELEGRAM_POLLING_TIMEOUT_S` | long-polling 超时（秒） |
| `LOG_LEVEL` | `debug` / `info` / `warn` / `error` |

## OneBot 模式

从 **适配器（本项目）** 视角：

| 模式 | 适配器角色 | 框架侧 |
|------|-----------|--------|
| **forward** | WS **服务端** | 主动连入 `ws://host:port/path` |
| **reverse** | WS **客户端** | 开服务端，适配器连 `ONEBOT_WS_URL` |

反向连接头：

- `X-Self-ID`
- `X-Client-Role: Universal`
- `Authorization: Bearer <token>`（若配置了 token）

正向鉴权：`Authorization: Bearer` 或查询参数 `access_token`。

连接后会推送 `meta_event`：`lifecycle`（connect）与周期性 `heartbeat`。

## Telegram 已实现

**事件：** 私聊 / 群聊 `message`（文本、图片、贴纸、动图、视频、语音、文件、位置、回复）

**Action：**

- `send_msg` / `send_private_msg` / `send_group_msg`
- `delete_msg` / `get_msg`
- `get_login_info` / `get_status` / `get_version_info`
- `get_group_info` / `get_group_list` / `get_friend_list` / `get_stranger_info`
- `can_send_image` / `can_send_record`

说明：Bot API 无法列举全部对话，故 `get_group_list` / `get_friend_list` 返回空数组。消息 ID 经内部映射（OneBot `message_id` ↔ Telegram `chat_id` + `message_id`）。

收消息使用 **long-polling**（`getUpdates`）；若已设置 webhook 会在启动时自动清除。

## 脚本

```bash
bun start       # 启动 gateway
bun run lint    # ESLint
bun run lint:fix
```

## License

MIT
