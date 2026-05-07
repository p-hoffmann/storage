// Modified by Trex contributors. Original Copyright (c) 2026 Supabase, Inc.
// See LICENSE for the original Apache-2.0 license.
import fastifyPlugin from 'fastify-plugin'
import { getConfig } from '../../config'

export default fastifyPlugin(
  async (fastify) => {
    const { adminApiKeys } = getConfig()
    const apiKeys = new Set(adminApiKeys.split(','))
    fastify.addHook('onRequest', async (request, reply) => {
      if (typeof request.headers.apikey !== 'string' || !apiKeys.has(request.headers.apikey)) {
        return reply.status(401).send()
      }
    })
  },
  { name: 'auth-admin-api-key' }
)
