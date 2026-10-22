import type { Logger } from '@auradapt/core'

import type { ActionRegistry } from '../action/registry'
import type { OneBotEvent } from '../types'
import { authorize } from './auth'
import { createSessionHandlers, type WsSession } from './session'

export interface ForwardWsConfig {
  host: string
  port: number
  path: string
  accessToken?: string
}

export interface ForwardWs {
  start: () => Promise<void>
  stop: () => Promise<void>
  broadcast: (event: OneBotEvent) => void
}

export function createForwardWs (opts: {
  logger: Logger
  registry: ActionRegistry
  config: ForwardWsConfig
  onClientOpen?: (session: WsSession) => void
}): ForwardWs {
  const log = opts.logger.child('forward')
  const hub = createSessionHandlers({
    logger: log,
    registry: opts.registry,
    onOpen: opts.onClientOpen,
  })

  let server: ReturnType<typeof Bun.serve> | undefined
  let seq = 0

  return {
    async start () {
      const { host, port, path, accessToken } = opts.config
      server = Bun.serve({
        hostname: host,
        port,
        fetch (req, srv) {
          const url = new URL(req.url)
          if (url.pathname !== path) {
            return new Response('Not Found', { status: 404 })
          }
          if (!authorize(req, accessToken)) {
            return new Response('Forbidden', { status: 403 })
          }
          if (srv.upgrade(req, {
            data: { id: `fwd-${++seq}` },
          })) {
            return undefined as unknown as Response
          }
          return new Response('Expected WebSocket', { status: 400 })
        },
        websocket: {
          open (ws) {
            const id = (ws.data as { id: string }).id
            const session: WsSession = {
              id,
              send: (payload) => {
                ws.send(typeof payload === 'string' ? payload : JSON.stringify(payload))
              },
              close: () => ws.close(),
            }
            ;(ws as unknown as { __session: WsSession }).__session = session
            hub.attach(session)
          },
          async message (ws, message) {
            const session = (ws as unknown as { __session: WsSession }).__session
            await hub.handleMessage(session, message)
          },
          close (ws) {
            const session = (ws as unknown as { __session?: WsSession }).__session
            if (session) hub.detach(session)
          },
        },
      })
      log.info(`listening ws://${host}:${port}${path}`)
    },

    async stop () {
      hub.closeAll()
      server?.stop(true)
      server = undefined
    },

    broadcast (event) {
      hub.broadcast(event)
    },
  }
}
