export function extractAccessToken (req: Request): string | undefined {
  const header = req.headers.get('authorization')
  if (header) {
    const match = /^Bearer\s+(.+)$/i.exec(header)
    if (match?.[1]) return match[1].trim()
  }
  const url = new URL(req.url)
  const query = url.searchParams.get('access_token')
  return query ?? undefined
}

export function authorize (req: Request, expected?: string): boolean {
  if (!expected) return true
  return extractAccessToken(req) === expected
}
