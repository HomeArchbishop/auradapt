import type { Logger } from '@auradapt/core'

import type { ActionRegistry } from '../action/registry'
import type { ApiRequest, OneBotEvent } from '../types'

export interface WsSession {
  readonly id: string
  send: (payload: unknown) => void
  close: () => void
}

export function createSessionHandlers (opts: {
  logger: Logger
  registry: ActionRegistry
  onOpen?: (session: WsSession) => void
  onClose?: (session: WsSession) => void
}) {
  const sessions = new Map<string, WsSession>()

  const attach = (session: WsSession) => {
    sessions.set(session.id, session)
    opts.logger.info(`client connected: ${session.id}`)
    opts.onOpen?.(session)
  }

  const detach = (session: WsSession) => {
    if (!sessions.has(session.id)) return
    sessions.delete(session.id)
    opts.logger.info(`client disconnected: ${session.id}`)
    opts.onClose?.(session)
  }

  const broadcast = (event: OneBotEvent) => {
    const raw = JSON.stringify(event)
    for (const session of sessions.values()) {
      try {
        session.send(raw)
      } catch (err) {
        opts.logger.warn(`broadcast failed to ${session.id}:`, err)
      }
    }
  }

  const handleMessage = async (session: WsSession, data: string | Buffer) => {
    let request: ApiRequest
    try {
      request = JSON.parse(String(data)) as ApiRequest
    } catch {
      session.send(JSON.stringify({
        status: 'failed',
        retcode: 1400,
        data: null,
        message: 'Invalid JSON',
        wording: 'Invalid JSON',
      }))
      return
    }

    if (!request.action) {
      session.send(JSON.stringify({
        status: 'failed',
        retcode: 1400,
        data: null,
        message: "Missing 'action' field",
        wording: "Missing 'action' field",
        echo: request.echo,
      }))
      return
    }

    opts.logger.debug(`action ${request.action}`, request.params)
    const response = await opts.registry.dispatch(request)
    session.send(JSON.stringify(response))
  }

  const closeAll = () => {
    for (const session of [...sessions.values()]) {
      try {
        session.close()
      } catch { /* ignore */ }
      detach(session)
    }
  }

  return {
    sessions,
    attach,
    detach,
    broadcast,
    handleMessage,
    closeAll,
    get size () {
      return sessions.size
    },
  }
}

export type SessionHub = ReturnType<typeof createSessionHandlers>
