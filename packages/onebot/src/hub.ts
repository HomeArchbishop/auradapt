import type { ActionHandler, Logger, PlatformContext } from '@auradapt/core'

import { ActionRegistry } from './action/registry'
import { EventBus } from './event/bus'
import { createHeartbeat } from './heartbeat'
import type { OneBotEvent } from './types'
import { createForwardWs, type ForwardWsConfig } from './ws/forward'
import { createReverseWs, type ReverseWsConfig } from './ws/reverse'
import type { WsSession } from './ws/session'

export type OneBotMode = 'forward' | 'reverse'

export interface OneBotHubConfig {
  mode: OneBotMode
  accessToken?: string
  heartbeatIntervalMs: number
  forward?: ForwardWsConfig
  reverse?: Omit<ReverseWsConfig, 'selfId'>
}

export interface OneBotHub {
  readonly registry: ActionRegistry
  readonly bus: EventBus
  createPlatformContext: (logger: Logger) => PlatformContext
  start: () => Promise<void>
  stop: () => Promise<void>
  emitEvent: (event: OneBotEvent) => void
}

export function createOneBotHub (opts: {
  logger: Logger
  config: OneBotHubConfig
}): OneBotHub {
  const log = opts.logger.child('onebot')
  const registry = new ActionRegistry()
  const bus = new EventBus()

  let selfId = 0
  let online = false
  let transport: { start: () => Promise<void>, stop: () => Promise<void>, broadcast: (e: OneBotEvent) => void } | undefined

  const heartbeat = createHeartbeat({
    bus,
    selfId: () => selfId,
    intervalMs: opts.config.heartbeatIntervalMs,
    getOnline: () => online,
  })

  bus.subscribe((event) => {
    transport?.broadcast(event)
  })

  const onClientReady = (_session: WsSession) => {
    heartbeat.emitLifecycle('connect')
  }

  const emitEvent = (event: OneBotEvent) => {
    bus.emit(event)
  }

  return {
    registry,
    bus,
    emitEvent,

    createPlatformContext (platformLogger: Logger): PlatformContext {
      return {
        logger: platformLogger,
        emitEvent: (event) => emitEvent(event as unknown as OneBotEvent),
        registerActions: (handlers: Record<string, ActionHandler>) => {
          registry.registerAll(handlers)
        },
        setSelfId: (id) => {
          selfId = id
        },
        getSelfId: () => selfId,
      }
    },

    async start () {
      if (opts.config.mode === 'forward') {
        if (!opts.config.forward) throw new Error('ONEBOT_MODE=forward requires forward config')
        transport = createForwardWs({
          logger: log,
          registry,
          config: opts.config.forward,
          onClientOpen: onClientReady,
        })
      } else {
        if (!opts.config.reverse) throw new Error('ONEBOT_MODE=reverse requires reverse config')
        transport = createReverseWs({
          logger: log,
          registry,
          config: {
            ...opts.config.reverse,
            selfId: () => selfId,
          },
          onConnected: onClientReady,
        })
      }

      online = true
      await transport.start()
      heartbeat.start()
      log.info(`hub started (${opts.config.mode})`)
    },

    async stop () {
      online = false
      heartbeat.stop()
      await transport?.stop()
      transport = undefined
      log.info('hub stopped')
    },
  }
}
