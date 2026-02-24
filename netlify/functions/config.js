// Centralized configuration for environment variables

function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        console.warn(`[config] Environment variable ${name} is not set.`);
    }
    return value;
}

const FACEBOOK_PIXEL_ID = requireEnv('FACEBOOK_PIXEL_ID') || '2268409500330056';
const FACEBOOK_ACCESS_TOKEN = requireEnv('FACEBOOK_ACCESS_TOKEN') || 'EAAQbjZBojicsBP85ZCvTbiLMQ6WA9RIlnNZCiDILZAdZAZCaqDYvVhYbqIiZBCUlZBksVpD5oi7ocZCNqjVsliyKrUKZBpaERiKi57PT9VlmyV4zulVOdPM1SlSUVibrevaf5zWUfSesinCRQureCXLPmjuqqUMKZBOq67RUooj0DRSaDcECmEa4x7QN2TuC4POcf4ilQZDZD';
const REDIS_URL = requireEnv('REDIS_URL') || '';

module.exports = {
    FACEBOOK_PIXEL_ID,
    FACEBOOK_ACCESS_TOKEN,
    REDIS_URL
};


