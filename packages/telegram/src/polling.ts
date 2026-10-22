import type { EventSink, Logger } from '@auradapt/core'

import type { TelegramClient } from './client'
import { handleUpdate } from './handle-update'
import type { MessageStore } from './message-store'

export interface PollingOptions {
  timeoutSeconds: number
  retryIntervalMs?: number
}

export class TelegramPolling {
  #client: TelegramClient
  #store: MessageStore
  #logger: Logger
  #emitEvent: EventSink
  #getSelfId: () => number
  #timeoutSeconds: number
  #retryIntervalMs: number
  #offset = 0
  #running = false
  #timer: ReturnType<typeof setTimeout> | undefined

  constructor (opts: {
    client: TelegramClient
    store: MessageStore
    logger: Logger
    emitEvent: EventSink
    getSelfId: () => number
    options: PollingOptions
  }) {
    this.#client = opts.client
    this.#store = opts.store
    this.#logger = opts.logger.child('polling')
    this.#emitEvent = opts.emitEvent
    this.#getSelfId = opts.getSelfId
    this.#timeoutSeconds = opts.options.timeoutSeconds
    this.#retryIntervalMs = opts.options.retryIntervalMs ?? 5000
  }

  async start (): Promise<void> {
    this.#running = true

    try {
      const info = await this.#client.getWebhookInfo()
      if (info.url) {
        this.#logger.warn('webhook is set, clearing for polling')
        await this.#client.setWebhook({ url: '' })
      }
    } catch (err) {
      this.#logger.warn('getWebhookInfo failed', err)
    }

    try {
      const previous = await this.#client.getUpdates({ timeout: 0 })
      for (const u of previous) {
        this.#offset = Math.max(this.#offset, u.update_id)
      }
    } catch (err) {
      this.#logger.warn('initial getUpdates failed', err)
    }

    this.#logger.info('polling started')
    this.#loop()
  }

  async stop (): Promise<void> {
    this.#running = false
    if (this.#timer) clearTimeout(this.#timer)
    this.#timer = undefined
  }

  #loop = () => {
    if (!this.#running) return
    this.#tick().catch((err) => {
      this.#logger.error('polling tick crashed', err)
      this.#timer = setTimeout(this.#loop, this.#retryIntervalMs)
    })
  }

  async #tick () {
    try {
      const updates = await this.#client.getUpdates({
        offset: this.#offset + 1,
        timeout: this.#timeoutSeconds,
        allowed_updates: ['message', 'edited_message', 'channel_post', 'edited_channel_post'],
      })
      if (!this.#running) return

      for (const update of updates) {
        this.#offset = Math.max(this.#offset, update.update_id)
        try {
          await handleUpdate({
            update,
            client: this.#client,
            store: this.#store,
            selfId: this.#getSelfId(),
            emitEvent: this.#emitEvent,
            logger: this.#logger,
          })
        } catch (err) {
          this.#logger.error('handleUpdate failed', err)
        }
      }
      this.#timer = setTimeout(this.#loop, 0)
    } catch (err) {
      this.#logger.warn('getUpdates error, retrying', err)
      this.#timer = setTimeout(this.#loop, this.#retryIntervalMs)
    }
  }
}
