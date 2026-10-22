import type { MessagePayload } from './segment'

export interface ApiRequest {
  action: string
  params?: Record<string, unknown>
  echo?: string
}

export interface ApiOkResponse {
  status: 'ok'
  retcode: 0
  data: unknown
  message: string
  wording: string
  echo?: string
}

export interface ApiFailedResponse {
  status: 'failed'
  retcode: number
  data: null
  message: string
  wording: string
  echo?: string
}

export type ApiResponse = ApiOkResponse | ApiFailedResponse

export interface SendPrivateMsgParams {
  user_id: number
  message: MessagePayload
  auto_escape?: boolean
}

export interface SendGroupMsgParams {
  group_id: number
  message: MessagePayload
  auto_escape?: boolean
}

export interface SendMsgParams {
  message_type?: 'private' | 'group'
  user_id?: number
  group_id?: number
  message: MessagePayload
  auto_escape?: boolean
}

export interface DeleteMsgParams {
  message_id: number
}

export function ok (data: unknown, echo?: string): ApiOkResponse {
  return {
    status: 'ok',
    retcode: 0,
    data,
    message: '',
    wording: '',
    ...(echo !== undefined ? { echo } : {}),
  }
}

export function fail (retcode: number, message: string, echo?: string): ApiFailedResponse {
  return {
    status: 'failed',
    retcode,
    data: null,
    message,
    wording: message,
    ...(echo !== undefined ? { echo } : {}),
  }
}
