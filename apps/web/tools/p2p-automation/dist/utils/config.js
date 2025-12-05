import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
// Load .env file
dotenvConfig({ path: resolve(process.cwd(), '.env') });
function getEnv(key, defaultValue) {
    const value = process.env[key];
    if (value === undefined) {
        if (defaultValue !== undefined)
            return defaultValue;
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}
function getEnvBool(key, defaultValue) {
    const value = process.env[key];
    if (value === undefined)
        return defaultValue;
    return value.toLowerCase() === 'true';
}
function getEnvInt(key, defaultValue) {
    const value = process.env[key];
    if (value === undefined)
        return defaultValue;
    const parsed = parseInt(value, 10);
    if (isNaN(parsed))
        return defaultValue;
    return parsed;
}
export const config = {
    // Supabase
    supabaseUrl: getEnv('SUPABASE_URL', 'https://pisqjmoklivzpwufhscx.supabase.co'),
    supabaseKey: getEnv('SUPABASE_SERVICE_KEY', ''),
    // Browser profiles
    binanceProfile: getEnv('BINANCE_PROFILE', '/home/edu/.binance-browser-profile'),
    mpProfile: getEnv('MP_PROFILE', '/home/edu/.mercadopago-browser-profile'),
    // Telegram
    telegramBotToken: getEnv('TELEGRAM_BOT_TOKEN', ''),
    telegramChatId: getEnv('TELEGRAM_CHAT_ID', ''),
    telegramEnabled: getEnvBool('TELEGRAM_ENABLED', false),
    // Timing
    pollIntervalMs: getEnvInt('POLL_INTERVAL_MS', 30000),
    qrTimeoutMs: getEnvInt('QR_TIMEOUT_MS', 120000),
    // Display
    display: getEnv('DISPLAY', ':0'),
    headless: getEnvBool('HEADLESS', false),
    // Logging
    logLevel: getEnv('LOG_LEVEL', 'info'),
    logFile: getEnv('LOG_FILE', '/tmp/p2p-automation.log'),
};
export default config;
//# sourceMappingURL=config.js.map