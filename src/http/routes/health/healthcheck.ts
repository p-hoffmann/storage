// Modified by Trex contributors. Original Copyright (c) 2026 Supabase, Inc.
// See LICENSE for the original Apache-2.0 license.
import { FastifyInstance } from 'fastify'

export default async function routes(fastify: FastifyInstance) {
  const summary = 'healthcheck'

  fastify.get(
    '/',
    {
      schema: {
        summary,
      },
    },
    async (req, res) => {
      try {
        await req.storage.healthcheck()
        return res.send({ healthy: true })
      } catch (e) {
        if (e instanceof Error) {
          req.executionError = e
        }
        return res.send({ healthy: false })
      }
    }
  )
}
