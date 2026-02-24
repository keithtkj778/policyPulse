/**
 * Application constants (non-sensitive).
 * Secrets and environment-specific values live in config.js.
 */

module.exports = {
    /** Domain used for ParamBuilder cookie scope (set via SITE_URL in production) */
    PARAM_BUILDER_DOMAIN: 'policypulse.online',

    /** Max redirect hops when resolving offer URL */
    MAX_REDIRECT_HOPS: 8,

    /** Retry config for external fetches */
    FETCH_MAX_RETRIES: 3,
    FETCH_RETRY_DELAY_MS: 1000,
    FETCH_TIMEOUT_MS: 10000,
};
