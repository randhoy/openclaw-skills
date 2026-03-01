// Configuration loader for threads-publisher.
//
// Reads THREADS_* environment variables and exposes a small, non-secretful
// configuration object. Raw values must never be logged or returned.

function parseBooleanEnv(value) {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return ["1", "true", "yes", "y", "on"].includes(normalized);
}

export function loadConfig(env = process.env) {
  const appId = env.THREADS_APP_ID || "";
  const appSecret = env.THREADS_APP_SECRET || "";
  const accessToken = env.THREADS_ACCESS_TOKEN || "";
  const accountId = env.THREADS_ACCOUNT_ID || "";

  const dryRun = parseBooleanEnv(env.THREADS_PUBLISHER_DRY_RUN) || false;

  const hasRequiredConfig = Boolean(appId && appSecret && accessToken && accountId);

  return {
    appId,
    appSecret,
    accessToken,
    accountId,
    dryRun,
    hasRequiredConfig,
  };
}

export function requireConfig(env = process.env) {
  const config = loadConfig(env);
  if (!config.hasRequiredConfig && !config.dryRun) {
    const error = new Error("Missing required THREADS_* configuration");
    error.code = "CONFIG_ERROR";
    throw error;
  }
  return config;
}
