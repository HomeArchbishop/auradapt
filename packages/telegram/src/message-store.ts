/** Maps OneBot message_id ↔ Telegram (chat_id, message_id). */
export interface StoredMessage {
  chatId: number
  messageId: number
  userId: number
  groupId?: number
  rawMessage: string
  time: number
}

export class MessageStore {
  #byObId = new Map<number, StoredMessage>()
  #byTgKey = new Map<string, number>()
  #nextId = 1

  #key (chatId: number, messageId: number) {
    return `${chatId}:${messageId}`
  }

  remember (info: StoredMessage): number {
    const key = this.#key(info.chatId, info.messageId)
    const existing = this.#byTgKey.get(key)
    if (existing !== undefined) {
      this.#byObId.set(existing, info)
      return existing
    }
    const obId = this.#nextId++
    this.#byObId.set(obId, info)
    this.#byTgKey.set(key, obId)
    return obId
  }

  get (obMessageId: number): StoredMessage | undefined {
    return this.#byObId.get(obMessageId)
  }

  getByTelegram (chatId: number, messageId: number): number | undefined {
    return this.#byTgKey.get(this.#key(chatId, messageId))
  }
}
