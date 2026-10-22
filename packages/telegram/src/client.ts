import type { Logger } from '@auradapt/core'

import type {
  ChatFullInfo,
  File,
  Message,
  TelegramResponse,
  Update,
  User,
} from './types'

export interface TelegramClientConfig {
  token: string
  apiRoot: string
  proxy?: string
  logger: Logger
}

export class TelegramClient {
  #token: string
  #apiRoot: string
  #proxy?: string
  #logger: Logger

  constructor (config: TelegramClientConfig) {
    this.#token = config.token
    this.#apiRoot = config.apiRoot.replace(/\/$/, '')
    this.#proxy = config.proxy || undefined
    this.#logger = config.logger.child('api')
  }

  get fileBase (): string {
    return `${this.#apiRoot}/file/bot${this.#token}`
  }

  async call<T> (method: string, body?: Record<string, unknown>): Promise<T> {
    const url = `${this.#apiRoot}/bot${this.#token}/${method}`
    const init: RequestInit = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }
    if (this.#proxy) {
      // Bun supports proxy via undici-like dispatcher; use env HTTP_PROXY fallback
      ;(init as RequestInit & { proxy?: string }).proxy = this.#proxy
    }

    const res = await fetch(url, init)
    const json = await res.json() as TelegramResponse<T>
    if (!json.ok) {
      throw new Error(`Telegram ${method} failed: ${json.error_code} ${json.description}`)
    }
    return json.result as T
  }

  async callForm<T> (method: string, form: FormData): Promise<T> {
    const url = `${this.#apiRoot}/bot${this.#token}/${method}`
    const init: RequestInit = { method: 'POST', body: form }
    if (this.#proxy) {
      ;(init as RequestInit & { proxy?: string }).proxy = this.#proxy
    }
    const res = await fetch(url, init)
    const json = await res.json() as TelegramResponse<T>
    if (!json.ok) {
      throw new Error(`Telegram ${method} failed: ${json.error_code} ${json.description}`)
    }
    return json.result as T
  }

  getMe = () => this.call<User>('getMe')

  getUpdates = (params: {
    offset?: number
    timeout?: number
    allowed_updates?: string[]
  }) => this.call<Update[]>('getUpdates', params)

  setWebhook = (params: { url: string }) => this.call<boolean>('setWebhook', params)

  getWebhookInfo = () => this.call<{ url: string }>('getWebhookInfo')

  sendMessage = (params: {
    chat_id: number | string
    text: string
    reply_to_message_id?: number
    parse_mode?: string
  }) => this.call<Message>('sendMessage', params)

  sendPhoto = (params: FormData | Record<string, unknown>) =>
    params instanceof FormData
      ? this.callForm<Message>('sendPhoto', params)
      : this.call<Message>('sendPhoto', params)

  sendDocument = (params: FormData | Record<string, unknown>) =>
    params instanceof FormData
      ? this.callForm<Message>('sendDocument', params)
      : this.call<Message>('sendDocument', params)

  sendAudio = (params: FormData | Record<string, unknown>) =>
    params instanceof FormData
      ? this.callForm<Message>('sendAudio', params)
      : this.call<Message>('sendAudio', params)

  sendVideo = (params: FormData | Record<string, unknown>) =>
    params instanceof FormData
      ? this.callForm<Message>('sendVideo', params)
      : this.call<Message>('sendVideo', params)

  sendVoice = (params: FormData | Record<string, unknown>) =>
    params instanceof FormData
      ? this.callForm<Message>('sendVoice', params)
      : this.call<Message>('sendVoice', params)

  sendLocation = (params: {
    chat_id: number | string
    latitude: number
    longitude: number
    reply_to_message_id?: number
  }) => this.call<Message>('sendLocation', params)

  deleteMessage = (params: { chat_id: number | string, message_id: number }) =>
    this.call<boolean>('deleteMessage', params)

  getChat = (params: { chat_id: number | string }) =>
    this.call<ChatFullInfo>('getChat', params)

  getChatMemberCount = (params: { chat_id: number | string }) =>
    this.call<number>('getChatMemberCount', params)

  getFile = (params: { file_id: string }) =>
    this.call<File>('getFile', params)

  async getFileUrl (fileId: string): Promise<string> {
    const file = await this.getFile({ file_id: fileId })
    if (!file.file_path) throw new Error(`No file_path for ${fileId}`)
    return `${this.fileBase}/${file.file_path}`
  }
}
