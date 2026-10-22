import type { Logger } from '@auradapt/core'

import type { ActionRegistry } from '../action/registry'
import type { OneBotEvent } from '../types'
import { createSessionHandlers, type WsSession } from './session'

export interface ReverseWsConfig {
  url: string
  accessToken?: string
  selfId: () => number
  reconnectIntervalMs: number
}

export interface ReverseWs {
  start: () => Promise<void>
  stop: () => Promise<void>
  broadcast: (event: OneBotEvent) => void
}

export function createReverseWs (opts: {
  logger: Logger
  registry: ActionRegistry
  config: ReverseWsConfig
  onConnected?: (session: WsSession) => void
}): ReverseWs {
  const log = opts.logger.child('reverse')
  const hub = createSessionHandlers({
    logger: log,
    registry: opts.registry,
    onOpen: opts.onConnected,
  })

  let stopped = false
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined
  let current: WebSocket | undefined
  let session: WsSession | undefined

  const connect = () => {
    if (stopped) return

    const selfId = opts.config.selfId()
    const headers: Record<string, string> = {
      'X-Self-ID': String(selfId),
      'X-Client-Role': 'Universal',
      'User-Agent': 'auradapt',
    }
    if (opts.config.accessToken) {
      headers.Authorization = `Bearer ${opts.config.accessToken}`
    }

    log.info(`connecting ${opts.config.url}`)
    const ws = new WebSocket(opts.config.url, { headers })
    current = ws

    ws.addEventListener('open', () => {
      log.info('connected')
      session = {
        id: `rev-${selfId}`,
        send: (payload) => {
          ws.send(typeof payload === 'string' ? payload : JSON.stringify(payload))
        },
        close: () => ws.close(),
      }
      hub.attach(session)
    })

    ws.addEventListener('message', (ev) => {
      if (!session) return
      hub.handleMessage(session, String(ev.data)).catch((err) => {
        log.warn('handleMessage failed', err)
      })
    })

    ws.addEventListener('close', () => {
      if (session) {
        hub.detach(session)
        session = undefined
      }
      current = undefined
      if (stopped) return
      log.warn(`disconnected, retry in ${opts.config.reconnectIntervalMs}ms`)
      reconnectTimer = setTimeout(connect, opts.config.reconnectIntervalMs)
    })

    ws.addEventListener('error', (err) => {
      log.warn('socket error', err)
    })
  }

  return {
    async start () {
      stopped = false
      connect()
    },

    async stop () {
      stopped = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      reconnectTimer = undefined
      try {
        current?.close()
      } catch { /* ignore */ }
      current = undefined
      hub.closeAll()
    },

    broadcast (event) {
      hub.broadcast(event)
    },
  }
}
