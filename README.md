# Health Insurance Prelander

A high-converting health insurance lead generation prelander with comprehensive tracking and MaxBounty integration.

## Features

- **Facebook Pixel Integration**: Complete tracking with Conversions API
- **MaxBounty Integration**: Server-side redirect following with parameter preservation
- **Bot Detection**: FingerprintJS BotD + custom behavioral gates
- **Redis Caching**: Real user data storage for perfect attribution
- **ROAS Optimization**: Conversion value tracking for Facebook optimization

## Setup

### 1. Redis Database

You need a Redis database to store user tracking data. Options:

#### Option A: Redis Cloud (Recommended)

1. Go to [Redis Cloud](https://redis.com/try-free/)
2. Create free account (30MB free tier)
3. Create new database
4. Copy connection string
5. Add to Netlify environment variables: `REDIS_URL`

#### Option B: Railway Redis

1. Go to [Railway](https://railway.app/)
2. Create new project
3. Add Redis service
4. Copy connection string
5. Add to Netlify environment variables: `REDIS_URL`

#### Option C: Upstash Redis

1. Go to [Upstash](https://upstash.com/)
2. Create free account
3. Create Redis database
4. Copy connection string
5. Add to Netlify environment variables: `REDIS_URL`

### 2. Facebook Configuration

1. **Update Pixel ID**: Replace `YOUR_NEW_PIXEL_ID` in `netlify/functions/postback.js`
2. **Update Access Token**: Replace `YOUR_NEW_ACCESS_TOKEN` in `netlify/functions/postback.js`
3. **Set up Conversions API**: Ensure your access token has `ads_management` permissions

### 3. MaxBounty Configuration

1. **Update Callback URL**: Copy the URL from `netlify/functions/postback.js` comment
2. **Paste in MaxBounty Dashboard**: Campaign settings → Callbacks section
3. **Test the flow**: Ensure postbacks are received

### 4. Deploy to Netlify

```bash
# Install dependencies
npm install

# Deploy to Netlify
npx netlify-cli deploy --prod
```

## How It Works

### 1. User Journey

```
User clicks ad → Prelander → CTA click → MaxBounty → Landing page → Conversion
```

### 2. Tracking Flow

```
Frontend: angle, fbp, fbc, user_ip, user_agent
↓
Redis Cache: Store real user data
↓
MaxBounty: s3=angle, s4=fbp, s5=fbc
↓
Postback: Retrieve real user data from Redis
↓
Facebook: fbp, fbc, real_ip, real_user_agent
```

### 3. Attribution Benefits

- **Perfect matching**: Real user data in both frontend and postback events
- **iOS 14.5+ support**: Enhanced matching with IP and user agent
- **ROAS optimization**: Conversion value tracking for Facebook CBO

## Environment Variables

Add these to your Netlify site settings:

```
REDIS_URL=redis://username:password@host:port
FACEBOOK_PIXEL_ID=your_pixel_id
FACEBOOK_ACCESS_TOKEN=your_access_token
```

## Testing

### Test Postback

```
GET https://policypulse.online/.netlify/functions/test-postback?test=1
```

### Test Redis Cache

Check Netlify function logs for Redis operations.

## Troubleshooting

### Redis Connection Issues

- Check `REDIS_URL` environment variable
- Verify Redis database is running
- Check network connectivity

### MaxBounty Postback Issues

- Verify callback URL is correct
- Check MaxBounty campaign settings
- Monitor function logs for errors

### Facebook Pixel Issues

- Verify pixel ID and access token
- Check Conversions API permissions
- Monitor Facebook Events Manager

## Support

For issues or questions, check the function logs in Netlify dashboard or contact support.
