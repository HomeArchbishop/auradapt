export type {
  ApiFailedResponse,
  ApiOkResponse,
  ApiRequest,
  ApiResponse,
  DeleteMsgParams,
  SendGroupMsgParams,
  SendMsgParams,
  SendPrivateMsgParams,
} from './action'
export { fail, ok } from './action'
export type {
  EventBase,
  FriendRecallNoticeEvent,
  GroupMessageEvent,
  GroupRecallNoticeEvent,
  HeartbeatMetaEvent,
  LifecycleMetaEvent,
  MessageEvent,
  MetaEvent,
  NoticeEvent,
  OneBotEvent,
  PrivateMessageEvent,
} from './event'
export type {
  AtSegment,
  FileSegment,
  ImageSegment,
  MessagePayload,
  MessageSegment,
  RecordSegment,
  ReplySegment,
  TextSegment,
  VideoSegment,
} from './segment'
export { normalizeMessage, segmentsToRawText } from './segment'
