export interface User {
  id: number
  is_bot: boolean
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
}

export interface Chat {
  id: number
  type: 'private' | 'group' | 'supergroup' | 'channel'
  title?: string
  username?: string
  first_name?: string
  last_name?: string
}

export interface PhotoSize {
  file_id: string
  file_unique_id: string
  width: number
  height: number
  file_size?: number
}

export interface Animation {
  file_id: string
  file_unique_id: string
  width: number
  height: number
  duration: number
  file_name?: string
  mime_type?: string
  file_size?: number
}

export interface Audio {
  file_id: string
  file_unique_id: string
  duration: number
  performer?: string
  title?: string
  file_name?: string
  mime_type?: string
  file_size?: number
}

export interface Document {
  file_id: string
  file_unique_id: string
  file_name?: string
  mime_type?: string
  file_size?: number
}

export interface Video {
  file_id: string
  file_unique_id: string
  width: number
  height: number
  duration: number
  file_name?: string
  mime_type?: string
  file_size?: number
}

export interface Voice {
  file_id: string
  file_unique_id: string
  duration: number
  mime_type?: string
  file_size?: number
}

export interface Sticker {
  file_id: string
  file_unique_id: string
  type: string
  width: number
  height: number
  is_animated: boolean
  is_video: boolean
  emoji?: string
  file_size?: number
}

export interface MessageEntity {
  type: string
  offset: number
  length: number
  url?: string
  user?: User
  language?: string
}

export interface Message {
  message_id: number
  from?: User
  sender_chat?: Chat
  date: number
  chat: Chat
  message_thread_id?: number
  forward_origin?: unknown
  reply_to_message?: Message
  edit_date?: number
  media_group_id?: string
  text?: string
  entities?: MessageEntity[]
  caption?: string
  caption_entities?: MessageEntity[]
  photo?: PhotoSize[]
  animation?: Animation
  audio?: Audio
  document?: Document
  sticker?: Sticker
  video?: Video
  voice?: Voice
  location?: { latitude: number, longitude: number }
  new_chat_members?: User[]
  left_chat_member?: User
}

export interface CallbackQuery {
  id: string
  from: User
  message?: Message
  inline_message_id?: string
  chat_instance: string
  data?: string
}

export interface ChatMemberUpdated {
  chat: Chat
  from: User
  date: number
  old_chat_member: { status: string, user: User }
  new_chat_member: { status: string, user: User }
}

export interface Update {
  update_id: number
  message?: Message
  edited_message?: Message
  channel_post?: Message
  edited_channel_post?: Message
  callback_query?: CallbackQuery
  my_chat_member?: ChatMemberUpdated
  chat_member?: ChatMemberUpdated
}

export interface File {
  file_id: string
  file_unique_id: string
  file_size?: number
  file_path?: string
}

export interface TelegramResponse<T> {
  ok: boolean
  result?: T
  description?: string
  error_code?: number
}

export type ChatFullInfo = Chat & {
  description?: string
  invite_link?: string
}
