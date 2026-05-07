// Modified by Trex contributors. Original Copyright (c) 2026 Supabase, Inc.
// See LICENSE for the original Apache-2.0 license.
import { defaultPreparePayload } from 'pino-logflare'
import { PayloadMeta } from 'pino-logflare/dist/httpStream'

export function onPreparePayload(payload: Record<string, object>, meta: PayloadMeta) {
  const item = defaultPreparePayload(payload, meta)
  item.project = payload.project
  return item
}

export function onError(_payload: Record<string, object>, err: Error) {
  console.error(`[Logflare][Error] ${err.message} - ${err.stack}`)
}
