// Stub for @smithy/shared-ini-file-loader: uses process.geteuid() which
// requires --allow-sys in Deno edge runtime. AWS config file loading is
// not needed when credentials are provided via env vars.
export function getHomeDir() { return "/tmp"; }
export function getCredentialsFilepath() { return "/tmp/.aws/credentials"; }
export function getConfigFilepath() { return "/tmp/.aws/config"; }
export async function loadSharedConfigFiles() { return { configFile: {}, credentialsFile: {} }; }
export async function getSSOTokenFromFile() { return null; }
export async function parseKnownFiles() { return {}; }
export default { getHomeDir, loadSharedConfigFiles, getSSOTokenFromFile, parseKnownFiles, getCredentialsFilepath, getConfigFilepath };
