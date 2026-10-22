import {
  type MessageSegment,
  normalizeMessage,
} from '@auradapt/onebot'

import type { TelegramClient } from './client'
import type { Message } from './types'

function isHttpUrl (value: string): boolean {
  return /^https?:\/\//i.test(value)
}

function isBase64File (value: string): boolean {
  return value.startsWith('base64://')
}

async function resolveFileInput (file: string): Promise<string | Blob> {
  if (isHttpUrl(file)) return file
  if (isBase64File(file)) {
    const b64 = file.slice('base64://'.length)
    const bytes = Buffer.from(b64, 'base64')
    return new Blob([bytes])
  }
  if (file.startsWith('file://')) {
    const path = file.slice('file://'.length)
    const bytes = await Bun.file(path).arrayBuffer()
    return new Blob([bytes])
  }
  // treat as local path or raw file id
  try {
    const f = Bun.file(file)
    if (await f.exists()) {
      return new Blob([await f.arrayBuffer()])
    }
  } catch { /* fallthrough */ }
  return file
}

function appendForm (
  form: FormData,
  chatId: number,
  field: string,
  file: string | Blob,
  filename: string,
  replyTo?: number,
) {
  form.set('chat_id', String(chatId))
  if (replyTo) form.set('reply_to_message_id', String(replyTo))
  if (typeof file === 'string' && isHttpUrl(file)) {
    form.set(field, file)
  } else if (typeof file === 'string') {
    form.set(field, file)
  } else {
    form.set(field, file, filename)
  }
}

export async function sendSegments (
  client: TelegramClient,
  chatId: number,
  rawMessage: unknown,
  options: {
    autoEscape?: boolean
    /** Resolve OneBot reply message_id → Telegram message_id */
    resolveReplyId?: (obMessageId: number) => number | undefined
  } = {},
): Promise<Message[]> {
  const { autoEscape = false, resolveReplyId } = options
  const segments = autoEscape && typeof rawMessage === 'string'
    ? [{ type: 'text' as const, data: { text: rawMessage } }]
    : normalizeMessage(rawMessage)

  let replyTo: number | undefined
  const textParts: string[] = []
  const media: MessageSegment[] = []

  for (const seg of segments) {
    switch (seg.type) {
      case 'reply': {
        const id = Number(seg.data.id)
        if (Number.isNaN(id)) break
        replyTo = resolveReplyId?.(id) ?? id
        break
      }
      case 'text':
        textParts.push(seg.data.text)
        break
      case 'at':
        textParts.push(`@${seg.data.qq}`)
        break
      case 'image':
      case 'record':
      case 'video':
      case 'file':
        media.push(seg)
        break
      case 'location': {
        const msg = await client.sendLocation({
          chat_id: chatId,
          latitude: Number(seg.data.lat),
          longitude: Number(seg.data.lon),
          reply_to_message_id: replyTo,
        })
        return [msg]
      }
      default:
        textParts.push(`[${seg.type}]`)
    }
  }

  const results: Message[] = []
  const caption = textParts.join('')

  if (media.length === 0) {
    if (!caption) throw new Error('Empty message')
    results.push(await client.sendMessage({
      chat_id: chatId,
      text: caption,
      reply_to_message_id: replyTo,
    }))
    return results
  }

  for (let i = 0; i < media.length; i++) {
    const seg = media[i]!
    const isFirst = i === 0
    const fileField = seg.type === 'image'
      ? 'photo'
      : seg.type === 'record'
        ? 'voice'
        : seg.type === 'video'
          ? 'video'
          : 'document'
    const fileValue = await resolveFileInput(
      seg.type === 'image' || seg.type === 'record' || seg.type === 'video' || seg.type === 'file'
        ? (seg.data.url || seg.data.file)
        : '',
    )
    const form = new FormData()
    appendForm(
      form,
      chatId,
      fileField,
      fileValue,
      seg.type === 'file' ? (seg.data.name || 'file') : seg.type,
      isFirst ? replyTo : undefined,
    )
    if (isFirst && caption) form.set('caption', caption)

    let msg: Message
    if (seg.type === 'image') msg = await client.sendPhoto(form)
    else if (seg.type === 'record') msg = await client.sendVoice(form)
    else if (seg.type === 'video') msg = await client.sendVideo(form)
    else msg = await client.sendDocument(form)
    results.push(msg)
  }

  return results
}
