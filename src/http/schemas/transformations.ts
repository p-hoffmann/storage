// Modified by Trex contributors. Original Copyright (c) 2026 Supabase, Inc.
// See LICENSE for the original Apache-2.0 license.
export const transformationOptionsSchema = {
  height: { type: 'integer', examples: [100], minimum: 0 },
  width: { type: 'integer', examples: [100], minimum: 0 },
  resize: { type: 'string', enum: ['cover', 'contain', 'fill'] },
  format: { type: 'string', enum: ['origin', 'avif'] },
  quality: { type: 'integer', minimum: 20, maximum: 100 },
} as const
