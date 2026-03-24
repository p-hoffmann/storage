// Stub for @opentelemetry/host-metrics: not available in Deno edge runtime.
// HostMetrics uses process.cpuUsage() which is not polyfilled in the edge runtime.
export class HostMetrics {
  constructor() {}
  start() {}
  stop() {}
}
export default { HostMetrics };
