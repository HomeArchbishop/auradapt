import {
  type GroupMessageEvent,
  type MessageSegment,
  type PrivateMessageEvent,
  segmentsToRawText,
} from '@auradapt/onebot'

import type { TelegramClient } from './client'
import type { MessageStore } from './message-store'
import type { Message, User } from './types'

function displayName (user: User): string {
  return [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || String(user.id)
}

async function mediaUrl (client: TelegramClient, fileId: string): Promise<string> {
  try {
    return await client.getFileUrl(fileId)
  } catch {
    return fileId
  }
}

export async function decodeMessageSegments (
  client: TelegramClient,
  message: Message,
): Promise<MessageSegment[]> {
  const segments: MessageSegment[] = []

  if (message.reply_to_message) {
    segments.push({
      type: 'reply',
      data: { id: String(message.reply_to_message.message_id) },
    })
  }

  if (message.text) {
    segments.push({ type: 'text', data: { text: message.text } })
  }

  if (message.photo?.length) {
    const best = message.photo[message.photo.length - 1]!
    const url = await mediaUrl(client, best.file_id)
    segments.push({ type: 'image', data: { file: url, url } })
  }

  if (message.sticker) {
    const url = await mediaUrl(client, message.sticker.file_id)
    segments.push({ type: 'image', data: { file: url, url } })
  }

  if (message.animation) {
    const url = await mediaUrl(client, message.animation.file_id)
    segments.push({ type: 'image', data: { file: url, url } })
  }

  if (message.video) {
    const url = await mediaUrl(client, message.video.file_id)
    segments.push({ type: 'video', data: { file: url, url } })
  }

  if (message.voice) {
    const url = await mediaUrl(client, message.voice.file_id)
    segments.push({ type: 'record', data: { file: url, url } })
  }

  if (message.audio) {
    const url = await mediaUrl(client, message.audio.file_id)
    segments.push({ type: 'record', data: { file: url, url } })
  }

  if (message.document) {
    const url = await mediaUrl(client, message.document.file_id)
    segments.push({
      type: 'file',
      data: {
        file: url,
        url,
        name: message.document.file_name,
      },
    })
  }

  if (message.location) {
    segments.push({
      type: 'location',
      data: {
        lat: String(message.location.latitude),
        lon: String(message.location.longitude),
      },
    })
  }

  if (message.caption) {
    segments.push({ type: 'text', data: { text: message.caption } })
  }

  if (segments.length === 0) {
    segments.push({ type: 'text', data: { text: '' } })
  }

  return segments
}

export async function toOneBotMessageEvent (opts: {
  client: TelegramClient
  store: MessageStore
  selfId: number
  message: Message
}): Promise<PrivateMessageEvent | GroupMessageEvent | null> {
  const { client, store, selfId, message } = opts
  if (!message.from) return null

  const segments = await decodeMessageSegments(client, message)
  // rewrite reply id to OneBot message id when known
  for (const seg of segments) {
    if (seg.type === 'reply') {
      const tgId = Number(seg.data.id)
      const obId = store.getByTelegram(message.chat.id, tgId)
      if (obId !== undefined) seg.data.id = String(obId)
    }
  }

  const raw = segmentsToRawText(segments)
  const isPrivate = message.chat.type === 'private'
  const time = message.date
  const userId = message.from.id

  const obMessageId = store.remember({
    chatId: message.chat.id,
    messageId: message.message_id,
    userId,
    groupId: isPrivate ? undefined : message.chat.id,
    rawMessage: raw,
    time,
  })

  if (isPrivate) {
    const event: PrivateMessageEvent = {
      time,
      self_id: selfId,
      post_type: 'message',
      message_type: 'private',
      sub_type: 'friend',
      message_id: obMessageId,
      user_id: userId,
      message: segments,
      raw_message: raw,
      font: 0,
      sender: {
        user_id: userId,
        nickname: displayName(message.from),
        sex: 'unknown',
        age: 0,
      },
    }
    return event
  }

  const event: GroupMessageEvent = {
    time,
    self_id: selfId,
    post_type: 'message',
    message_type: 'group',
    sub_type: 'normal',
    message_id: obMessageId,
    group_id: message.chat.id,
    user_id: userId,
    anonymous: null,
    message: segments,
    raw_message: raw,
    font: 0,
    sender: {
      user_id: userId,
      nickname: displayName(message.from),
      card: displayName(message.from),
      sex: 'unknown',
      age: 0,
      area: '',
      level: '',
      role: 'member',
      title: '',
    },
  }
  return event
}
