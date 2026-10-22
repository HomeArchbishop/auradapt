import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { OneBotMode } from '@auradapt/onebot'

export type PlatformName = 'telegram'

/** Load monorepo-root `.env` when cwd is apps/gateway (bun --filter). */
function preloadEnv (): void {
  const candidates = [
    join(import.meta.dir, '../../../../.env'),
    join(process.cwd(), '.env'),
  ]
  for (const path of candidates) {
    if (!existsSync(path)) continue
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq <= 0) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (process.env[key] === undefined) process.env[key] = value
    }
    return
  }
}


export interface AppConfig {
  platform: PlatformName
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  onebot: {
    mode: OneBotMode
    accessToken?: string
    heartbeatIntervalMs: number
    forward: {
      host: string
      port: number
      path: string
    }
    reverse: {
      url: string
      reconnectIntervalMs: number
    }
  }
  telegram: {
    token: string
    apiRoot: string
    proxy?: string
    pollingTimeoutSeconds: number
  }
}

function required (key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`Missing required env: ${key}`)
  return value
}

function optional (key: string): string | undefined {
  const value = process.env[key]
  return value || undefined
}

function int (key: string, fallback: number): number {
  const raw = process.env[key]
  if (!raw) return fallback
  const n = Number(raw)
  if (Number.isNaN(n)) throw new Error(`Invalid number for ${key}: ${raw}`)
  return n
}

export function loadConfig (): AppConfig {
  preloadEnv()

  const platform = (process.env.PLATFORM ?? 'telegram') as PlatformName
  if (platform !== 'telegram') {
    throw new Error(`Unsupported PLATFORM: ${platform}`)
  }

  const mode = (process.env.ONEBOT_MODE ?? 'reverse') as OneBotMode
  if (mode !== 'forward' && mode !== 'reverse') {
    throw new Error(`Invalid ONEBOT_MODE: ${mode}`)
  }

  const logLevel = (process.env.LOG_LEVEL ?? 'info') as AppConfig['logLevel']

  return {
    platform,
    logLevel,
    onebot: {
      mode,
      accessToken: optional('ONEBOT_ACCESS_TOKEN'),
      heartbeatIntervalMs: int('ONEBOT_HEARTBEAT_INTERVAL_MS', 5000),
      forward: {
        host: process.env.ONEBOT_WS_HOST ?? '0.0.0.0',
        port: int('ONEBOT_WS_PORT', 6700),
        path: process.env.ONEBOT_WS_PATH ?? '/',
      },
      reverse: {
        url: mode === 'reverse'
          ? required('ONEBOT_WS_URL')
          : (process.env.ONEBOT_WS_URL ?? ''),
        reconnectIntervalMs: int('ONEBOT_RECONNECT_INTERVAL_MS', 5000),
      },
    },
    telegram: {
      token: required('TELEGRAM_TOKEN'),
      apiRoot: process.env.TELEGRAM_API_ROOT ?? 'https://api.telegram.org',
      proxy: optional('TELEGRAM_PROXY'),
      pollingTimeoutSeconds: int('TELEGRAM_POLLING_TIMEOUT_S', 25),
    },
  }
}
