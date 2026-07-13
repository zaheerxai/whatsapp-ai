# Render Deployment Guide for WhatsApp AI Agent

## Problem Fixed
The Chrome/Chromium browser was not being downloaded during the Render build process, causing the app to crash with:
```
Could not find Chrome (ver. 146.0.7680.31)
```

## What Changed

### 1. `.puppeteerrc.cjs` (NEW)
- Explicit Puppeteer configuration file
- Tells Puppeteer where to cache Chrome and to download it
- Respects environment variables set by Render

### 2. `package.json`
- Updated `postinstall` script to explicitly download Chrome using `npx puppeteer browsers install chrome`
- Sets required environment variables during the build

### 3. `render.yaml`
- Added `PUPPETEER_CACHE_DIR` - where Chrome will be stored
- Added `PUPPETEER_EXECUTABLE_PATH` - exact path to Chrome executable
- Added `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false` - forces download
- Includes Puppeteer buildpack for system dependencies

### 4. `scripts/clean-puppeteer-cache.js`
- Now clears all possible Puppeteer cache directories
- Sets the environment variable before npm modules are used

## Deployment Steps

1. **Commit all changes:**
   ```bash
   git add .
   git commit -m "Fix Chrome download on Render deployment"
   git push
   ```

2. **On Render:**
   - Go to your service dashboard
   - Click "Environment" in the sidebar
   - Verify these environment variables are set:
     - `NODE_ENV` = `production`
     - `GROQ_API_KEY` = your key
     - `SUPABASE_URL` = your URL
     - `SUPABASE_SERVICE_ROLE_KEY` = your key
     - `TARGET_GROUP_ID` = (optional)
     - `QR_SECRET` = your secret
     - `PORT` = `3000`

3. **Trigger a new deploy:**
   - Go to "Deploys" tab
   - Click "Deploy latest commit"
   - Watch the logs carefully for:
     - Build step: Should see `npx puppeteer browsers install chrome` downloading
     - Runtime step: Should see `[init]` diagnostic logs, then "WhatsApp client ready"

## Expected Build Log Output

You should now see Chrome being downloaded during build:
```
==> Running build command 'npm install'...
> whatsapp-group-ai-agent@1.0.0 postinstall
> node scripts/clean-puppeteer-cache.js && PUPPETEER_CACHE_DIR=... npx puppeteer@latest browsers install chrome

Cleared /opt/render/project/src/.puppeteer (if it existed)...
Downloading Chrome...
Chrome downloaded successfully to: /opt/render/project/src/.puppeteer/...
```

## Troubleshooting

**Still seeing "Could not find Chrome"?**
- Force a new deploy (don't rebuild from cache)
- Check Render dashboard "Environment" section for missing env vars
- Verify the buildpack is using the latest Puppeteer buildpack

**Seeing "Chrome crashed"?**
- Render's free tier has limited memory (512MB)
- Consider upgrading to a paid plan with more resources
- Chrome + Node.js + Supabase connections need ~1GB minimum

**Build is taking too long?**
- Chrome download is ~150-200MB, can take 2-5 minutes on Render
- This is normal and only happens once per deploy
