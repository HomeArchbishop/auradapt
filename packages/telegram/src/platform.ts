import type { Platform, PlatformContext } from '@auradapt/core'

import { createTelegramActions } from './actions'
import { TelegramClient } from './client'
import { MessageStore } from './message-store'
import { TelegramPolling } from './polling'

export interface TelegramPlatformConfig {
  token: string
  apiRoot?: string
  proxy?: string
  pollingTimeoutSeconds?: number
}

export function createTelegramPlatform (config: TelegramPlatformConfig): Platform {
  let client: TelegramClient | undefined
  let polling: TelegramPolling | undefined
  let me: { id: number, username?: string, first_name: string } | undefined

  return {
    name: 'telegram',

    async start (ctx: PlatformContext) {
      const log = ctx.logger.child('telegram')
      client = new TelegramClient({
        token: config.token,
        apiRoot: config.apiRoot ?? 'https://api.telegram.org',
        proxy: config.proxy,
        logger: log,
      })

      me = await client.getMe()
      ctx.setSelfId(me.id)
      log.info(`logged in as @${me.username ?? me.id} (${me.id})`)

      const store = new MessageStore()
      ctx.registerActions(createTelegramActions({
        client,
        store,
        ctx,
        getMe: () => me!,
      }))

      polling = new TelegramPolling({
        client,
        store,
        logger: log,
        emitEvent: ctx.emitEvent,
        getSelfId: () => ctx.getSelfId(),
        options: {
          timeoutSeconds: config.pollingTimeoutSeconds ?? 25,
        },
      })
      await polling.start()
    },

    async stop () {
      await polling?.stop()
      polling = undefined
      client = undefined
    },
  }
}
