// @ts-nocheck - Deno edge function
// Supabase Storage running inside the trex Deno edge runtime

// Polyfill process.cpuUsage (used by @opentelemetry/host-metrics)
if (typeof process !== 'undefined' && !process.cpuUsage) {
  process.cpuUsage = (prev) => {
    const now = { user: 0, system: 0 };
    if (prev) return { user: now.user - prev.user, system: now.system - prev.system };
    return now;
  };
}
// Polyfill process.geteuid (used by @smithy/shared-ini-file-loader)
if (typeof process !== 'undefined' && !process.geteuid) {
  process.geteuid = () => 0;
}

let app = null;
let initPromise = null;
let initError = null;

async function ensureApp() {
  if (app) return app;
  if (initError) throw initError;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // Set CWD to supabase-storage root so migrations can find ./migrations/tenant
      const fnPath = Deno.env.get("TREX_FUNCTION_PATH") || ".";
      const storageRoot = fnPath + "/supabase-storage";
      console.log("[storage] Storage root:", storageRoot);
      try { process.chdir(storageRoot); } catch (e) { console.log("[storage] chdir failed:", e.message); }

      // The postgres-migrations package resolves __dirname to the eszip compile path.
      // Read+write the SQL file to the expected location (copyFile is blocklisted).
      const compileRoot = "/var/tmp/sb-compile-trex/supabase-storage";
      try {
        const { mkdirSync, readFileSync, writeFileSync } = await import("node:fs");
        const targetDir = compileRoot + "/node_modules/postgres-migrations/dist/migrations";
        mkdirSync(targetDir, { recursive: true });
        const sql = readFileSync(
          storageRoot + "/node_modules/postgres-migrations/dist/migrations/0_create-migrations-table.sql"
        );
        writeFileSync(targetDir + "/0_create-migrations-table.sql", sql);
        console.log("[storage] Copied postgres-migrations SQL files");
      } catch (e) { console.log("[storage] SQL file setup:", e.message); }

      // Run single-tenant migrations
      const { runMigrationsOnTenant } = await import("../dist/internal/database/migrations/index.js");
      const { getConfig } = await import("../dist/config.js");
      const config = getConfig();

      console.log("[storage] Running migrations...");
      await runMigrationsOnTenant({
        databaseUrl: config.databaseURL,
      });
      console.log("[storage] Migrations complete");

      // Build Fastify app
      const { default: build } = await import("../dist/app.js");
      app = build({
        disableRequestLogging: true,
        routerOptions: { maxParamLength: 2500 },
      });
      // Add error logging hook
      app.addHook('onError', (request, reply, error, done) => {
        console.error("[storage] Fastify error:", error.message, error.stack?.split('\n').slice(0, 3).join('\n'));
        done();
      });
      await app.ready();
      console.log("[storage] Fastify app ready");
      return app;
    } catch (e) {
      initError = e;
      console.error("[storage] Init failed:", e);
      throw e;
    }
  })();

  return initPromise;
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check (lightweight, no app init required)
  if (url.pathname.endsWith("/health")) {
    if (app) {
      return Response.json({ status: "ok", runtime: "deno-edge", initialized: true });
    }
    return Response.json({ status: "ok", runtime: "deno-edge", initialized: false });
  }

  try {
    const fastifyApp = await ensureApp();

    // Build a Node-compatible request for Fastify's inject()
    // Strip the plugin route prefix to get the storage-relative path
    // The full path looks like /plugins/trex/storage-api/...
    // We need to extract the part after /storage-api
    const fullPath = url.pathname;
    const storageApiIdx = fullPath.indexOf("/storage-api");
    const storagePath = storageApiIdx >= 0
      ? fullPath.substring(storageApiIdx + "/storage-api".length) || "/"
      : fullPath;

    // Read request body
    let body = undefined;
    if (req.method !== "GET" && req.method !== "HEAD") {
      try {
        body = await req.arrayBuffer();
        if (body.byteLength === 0) body = undefined;
      } catch {
        body = undefined;
      }
    }

    // Build headers, forwarding auth
    const headers = {};
    for (const [key, value] of req.headers.entries()) {
      headers[key] = value;
    }

    // Supabase compat: convert apikey header to Authorization Bearer
    if (!headers["authorization"] && headers["apikey"]) {
      headers["authorization"] = `Bearer ${headers["apikey"]}`;
    }

    // Use Fastify inject() to process the request in-process
    const response = await fastifyApp.inject({
      method: req.method,
      url: storagePath + url.search,
      headers,
      payload: body ? Buffer.from(body) : undefined,
    });

    // Log 5xx errors for debugging
    if (response.statusCode >= 500) {
      console.error("[storage] 500 error on", req.method, storagePath, response.body);
    }

    // Convert Fastify response to Web Response
    const responseHeaders = new Headers();
    for (const [key, value] of Object.entries(response.headers)) {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          for (const v of value) responseHeaders.append(key, v);
        } else {
          responseHeaders.set(key, String(value));
        }
      }
    }
    // Add CORS
    for (const [k, v] of Object.entries(corsHeaders)) {
      responseHeaders.set(k, v);
    }

    return new Response(response.rawPayload, {
      status: response.statusCode,
      headers: responseHeaders,
    });
  } catch (e) {
    console.error("[storage] Request error:", e);
    return Response.json(
      { error: "Storage service error", message: e.message },
      { status: 500, headers: corsHeaders }
    );
  }
});
