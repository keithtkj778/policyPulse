/**
 * Centralized configuration from environment variables.
 * No defaults for secrets — set in Netlify (or .env for local dev).
 */

function getEnv(name, defaultValue = undefined) {
    const value = process.env[name];
    if (value !== undefined && value !== '') return value;
    if (defaultValue !== undefined) return defaultValue;
    return undefined;
}

function requireEnv(name) {
    const value = process.env[name];
    if (!value || value === '') {
        console.warn(`[config] Missing env: ${name}`);
        return undefined;
    }
    return value;
}

/** Facebook Pixel ID (required for CAPI). Set in Netlify env. */
const FACEBOOK_PIXEL_ID = getEnv('FACEBOOK_PIXEL_ID');

/** Facebook CAPI access token (required). Set in Netlify env. */
const FACEBOOK_ACCESS_TOKEN = getEnv('FACEBOOK_ACCESS_TOKEN');

/** Optional Redis URL for caching (if used). */
const REDIS_URL = getEnv('REDIS_URL', '');

/** Site base URL, e.g. https://yoursite.netlify.app — set in Netlify env or .env. No default. */
const SITE_URL = getEnv('SITE_URL');

/** Offer redirect URL (affiliate/offer link). Used by go-firstquote and as client fallback. */
const OFFER_REDIRECT_URL = getEnv('OFFER_REDIRECT_URL');

/** Optional fallback URL returned to client if redirect endpoint fails (no affiliate key in repo). */
const OFFER_FALLBACK_URL = getEnv('OFFER_FALLBACK_URL', '');

module.exports = {
    getEnv,
    requireEnv,
    FACEBOOK_PIXEL_ID,
    FACEBOOK_ACCESS_TOKEN,
    REDIS_URL,
    SITE_URL,
    OFFER_REDIRECT_URL,
    OFFER_FALLBACK_URL,
};
