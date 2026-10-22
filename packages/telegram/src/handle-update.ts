import type { EventSink, Logger } from '@auradapt/core'
import type { FriendRecallNoticeEvent, GroupRecallNoticeEvent } from '@auradapt/onebot'

import type { TelegramClient } from './client'
import { toOneBotMessageEvent } from './decode'
import type { MessageStore } from './message-store'
import type { Update } from './types'

export async function handleUpdate (opts: {
  update: Update
  client: TelegramClient
  store: MessageStore
  selfId: number
  emitEvent: EventSink
  logger: Logger
}): Promise<void> {
  const { update, client, store, selfId, emitEvent, logger } = opts

  const message = update.message ??
    update.edited_message ??
    update.channel_post ??
    update.edited_channel_post

  if (message && !update.edited_message && !update.edited_channel_post) {
    const event = await toOneBotMessageEvent({ client, store, selfId, message })
    if (event) {
      logger.debug('message event', event.message_type, event.message_id)
      emitEvent(event)
    }
    return
  }

  // Telegram has no native recall event for bots; leave room for future
  if (update.callback_query?.message) {
    // surface as a synthetic private/group text with button data is out of OneBot v11 core;
    // skip for now to keep protocol surface clean
    logger.debug('callback_query ignored (no OneBot mapping)')
  }
}

export function buildRecallNotice (opts: {
  selfId: number
  stored: { chatId: number, userId: number, groupId?: number, messageId: number }
  obMessageId: number
}): FriendRecallNoticeEvent | GroupRecallNoticeEvent {
  const time = Math.floor(Date.now() / 1000)
  if (opts.stored.groupId !== undefined) {
    return {
      time,
      self_id: opts.selfId,
      post_type: 'notice',
      notice_type: 'group_recall',
      group_id: opts.stored.groupId,
      user_id: opts.stored.userId,
      operator_id: opts.selfId,
      message_id: opts.obMessageId,
    }
  }
  return {
    time,
    self_id: opts.selfId,
    post_type: 'notice',
    notice_type: 'friend_recall',
    user_id: opts.stored.userId,
    message_id: opts.obMessageId,
  }
}
