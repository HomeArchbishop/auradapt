import type { ActionHandler, PlatformContext } from '@auradapt/core'
import { normalizeMessage, segmentsToRawText } from '@auradapt/onebot'

import type { TelegramClient } from './client'
import { sendSegments } from './encode'
import { buildRecallNotice } from './handle-update'
import type { MessageStore } from './message-store'

export function createTelegramActions (opts: {
  client: TelegramClient
  store: MessageStore
  ctx: PlatformContext
  getMe: () => { id: number, username?: string, first_name: string }
}): Record<string, ActionHandler> {
  const { client, store, ctx, getMe } = opts

  const resolveReply = (obId: number) => store.get(obId)?.messageId

  const rememberSend = (chatId: number, userId: number, groupId: number | undefined, msg: { message_id: number, date: number }, raw: string) => {
    return store.remember({
      chatId,
      messageId: msg.message_id,
      userId,
      groupId,
      rawMessage: raw,
      time: msg.date,
    })
  }

  const sendPrivateMsg: ActionHandler = async (params) => {
    const userId = Number(params.user_id)
    const message = params.message
    const autoEscape = Boolean(params.auto_escape)
    const results = await sendSegments(client, userId, message, {
      autoEscape,
      resolveReplyId: resolveReply,
    })
    const last = results[results.length - 1]!
    const raw = segmentsToRawText(normalizeMessage(message))
    const messageId = rememberSend(userId, ctx.getSelfId(), undefined, last, raw)
    return { message_id: messageId }
  }

  const sendGroupMsg: ActionHandler = async (params) => {
    const groupId = Number(params.group_id)
    const message = params.message
    const autoEscape = Boolean(params.auto_escape)
    const results = await sendSegments(client, groupId, message, {
      autoEscape,
      resolveReplyId: resolveReply,
    })
    const last = results[results.length - 1]!
    const raw = segmentsToRawText(normalizeMessage(message))
    const messageId = rememberSend(groupId, ctx.getSelfId(), groupId, last, raw)
    return { message_id: messageId }
  }

  const sendMsg: ActionHandler = async (params) => {
    const messageType = params.message_type as string | undefined
    if (messageType === 'private' || (params.user_id && !params.group_id)) {
      return sendPrivateMsg(params)
    }
    if (messageType === 'group' || params.group_id) {
      return sendGroupMsg(params)
    }
    throw new Error('send_msg requires message_type or user_id/group_id')
  }

  const deleteMsg: ActionHandler = async (params) => {
    const obId = Number(params.message_id)
    const stored = store.get(obId)
    if (!stored) throw new Error(`Unknown message_id: ${obId}`)
    await client.deleteMessage({ chat_id: stored.chatId, message_id: stored.messageId })
    ctx.emitEvent(buildRecallNotice({
      selfId: ctx.getSelfId(),
      stored,
      obMessageId: obId,
    }))
    return null
  }

  const getLoginInfo: ActionHandler = async () => {
    const me = getMe()
    return {
      user_id: me.id,
      nickname: me.username || me.first_name,
    }
  }

  const getStatus: ActionHandler = async () => ({
    online: true,
    good: true,
  })

  const getVersionInfo: ActionHandler = async () => ({
    app_name: 'auradapt-telegram',
    app_version: '0.0.0',
    protocol_version: 'v11',
  })

  const getGroupInfo: ActionHandler = async (params) => {
    const groupId = Number(params.group_id)
    const chat = await client.getChat({ chat_id: groupId })
    let memberCount = 0
    try {
      memberCount = await client.getChatMemberCount({ chat_id: groupId })
    } catch { /* channels may deny */ }
    return {
      group_id: groupId,
      group_name: chat.title ?? '',
      member_count: memberCount,
      max_member_count: 200000,
    }
  }

  const getGroupList: ActionHandler = async () => {
    // Telegram Bot API has no list-chats; return empty
    return []
  }

  const getFriendList: ActionHandler = async () => []

  const getStrangerInfo: ActionHandler = async (params) => {
    const userId = Number(params.user_id)
    return {
      user_id: userId,
      nickname: String(userId),
      sex: 'unknown',
      age: 0,
    }
  }

  const canSendImage: ActionHandler = async () => ({ yes: true })
  const canSendRecord: ActionHandler = async () => ({ yes: true })

  const getMsg: ActionHandler = async (params) => {
    const obId = Number(params.message_id)
    const stored = store.get(obId)
    if (!stored) throw new Error(`Unknown message_id: ${obId}`)
    return {
      time: stored.time,
      message_type: stored.groupId !== undefined ? 'group' : 'private',
      message_id: obId,
      real_id: stored.messageId,
      sender: {
        user_id: stored.userId,
        nickname: String(stored.userId),
        sex: 'unknown',
        age: 0,
      },
      message: [{ type: 'text', data: { text: stored.rawMessage } }],
    }
  }

  return {
    send_private_msg: sendPrivateMsg,
    send_group_msg: sendGroupMsg,
    send_msg: sendMsg,
    delete_msg: deleteMsg,
    get_msg: getMsg,
    get_login_info: getLoginInfo,
    get_status: getStatus,
    get_version_info: getVersionInfo,
    get_group_info: getGroupInfo,
    get_group_list: getGroupList,
    get_friend_list: getFriendList,
    get_stranger_info: getStrangerInfo,
    can_send_image: canSendImage,
    can_send_record: canSendRecord,
  }
}
