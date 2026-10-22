import type { MessageSegment } from './segment'

export interface EventBase {
  time: number
  self_id: number
  post_type: string
}

export interface LifecycleMetaEvent extends EventBase {
  post_type: 'meta_event'
  meta_event_type: 'lifecycle'
  sub_type: 'enable' | 'disable' | 'connect'
}

export interface HeartbeatMetaEvent extends EventBase {
  post_type: 'meta_event'
  meta_event_type: 'heartbeat'
  status: { online: boolean, good: boolean }
  interval: number
}

export type MetaEvent = LifecycleMetaEvent | HeartbeatMetaEvent

export interface PrivateMessageEvent extends EventBase {
  post_type: 'message'
  message_type: 'private'
  sub_type: 'friend' | 'group' | 'other'
  message_id: number
  user_id: number
  message: MessageSegment[]
  raw_message: string
  font: number
  sender: {
    user_id: number
    nickname: string
    sex: 'male' | 'female' | 'unknown'
    age: number
  }
}

export interface GroupMessageEvent extends EventBase {
  post_type: 'message'
  message_type: 'group'
  sub_type: 'normal' | 'anonymous' | 'notice'
  message_id: number
  group_id: number
  user_id: number
  anonymous: null
  message: MessageSegment[]
  raw_message: string
  font: number
  sender: {
    user_id: number
    nickname: string
    card: string
    sex: 'male' | 'female' | 'unknown'
    age: number
    area: string
    level: string
    role: 'owner' | 'admin' | 'member'
    title: string
  }
}

export type MessageEvent = PrivateMessageEvent | GroupMessageEvent

export interface FriendRecallNoticeEvent extends EventBase {
  post_type: 'notice'
  notice_type: 'friend_recall'
  user_id: number
  message_id: number
}

export interface GroupRecallNoticeEvent extends EventBase {
  post_type: 'notice'
  notice_type: 'group_recall'
  group_id: number
  user_id: number
  operator_id: number
  message_id: number
}

export type NoticeEvent = FriendRecallNoticeEvent | GroupRecallNoticeEvent

export type OneBotEvent = MetaEvent | MessageEvent | NoticeEvent
