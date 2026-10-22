export interface TextSegment {
  type: 'text'
  data: { text: string }
}

export interface FaceSegment {
  type: 'face'
  data: { id: string }
}

export interface ImageSegment {
  type: 'image'
  data: {
    file: string
    type?: 'flash'
    url?: string
    cache?: '0' | '1'
    proxy?: '0' | '1'
    timeout?: number
  }
}

export interface RecordSegment {
  type: 'record'
  data: {
    file: string
    magic?: '0' | '1'
    url?: string
  }
}

export interface VideoSegment {
  type: 'video'
  data: {
    file: string
    url?: string
  }
}

export interface AtSegment {
  type: 'at'
  data: { qq: string | 'all' }
}

export interface ReplySegment {
  type: 'reply'
  data: { id: string }
}

export interface FileSegment {
  type: 'file'
  data: {
    file: string
    name?: string
    url?: string
  }
}

export interface ShareSegment {
  type: 'share'
  data: {
    url: string
    title: string
    content?: string
    image?: string
  }
}

export interface LocationSegment {
  type: 'location'
  data: {
    lat: string
    lon: string
    title?: string
    content?: string
  }
}

export type MessageSegment =
  | TextSegment
  | FaceSegment
  | ImageSegment
  | RecordSegment
  | VideoSegment
  | AtSegment
  | ReplySegment
  | FileSegment
  | ShareSegment
  | LocationSegment

export type MessagePayload = string | MessageSegment | MessageSegment[]

export function normalizeMessage (raw: unknown): MessageSegment[] {
  if (raw === null || raw === undefined) return []
  if (typeof raw === 'string') {
    return [{ type: 'text', data: { text: raw } }]
  }
  if (Array.isArray(raw)) {
    return raw as MessageSegment[]
  }
  if (typeof raw === 'object' && raw !== null && 'type' in raw) {
    return [raw as MessageSegment]
  }
  return [{ type: 'text', data: { text: String(raw) } }]
}

export function segmentsToRawText (segments: MessageSegment[]): string {
  return segments.map((seg) => {
    switch (seg.type) {
      case 'text':
        return seg.data.text
      case 'at':
        return `@${seg.data.qq}`
      case 'image':
        return '[图片]'
      case 'record':
        return '[语音]'
      case 'video':
        return '[视频]'
      case 'file':
        return '[文件]'
      case 'reply':
        return ''
      default:
        return `[${seg.type}]`
    }
  }).join('')
}
