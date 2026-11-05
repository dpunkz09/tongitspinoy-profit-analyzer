# PWA Setup Instructions

## ✅ PWA Implementation Complete

Your TongitsPinoy Profit Calculator now supports Progressive Web App features!

## What's Been Implemented:

### 1. **Service Worker** (via next-pwa)
- Automatic caching of assets
- Offline functionality
- Background sync support
- Only active in production

### 2. **Web App Manifest** (`/public/manifest.json`)
- App name: TongitsPinoy Profit Calculator
- Short name: TP Profit
- Theme color: Blue (#2563eb)
- Standalone display mode
- Portrait orientation

### 3. **Meta Tags & Icons**
- Apple Touch Icon support
- Theme color meta tags
- Viewport configuration
- Open Graph tags

### 4. **Git Ignore**
- Service worker files excluded from git
- Workbox cache files ignored

## 📝 TODO: Generate App Icons

You need to create actual icon files. The placeholders are ready at:
- `/public/icon-192.png` (192x192)
- `/public/icon-512.png` (512x512)

### Easy Way: Use an Icon Generator

1. Visit: https://www.pwabuilder.com/imageGenerator
2. Upload the TongitsPinoy logo: https://tongitspinoy.com/img_tg.png
3. Generate icons for all sizes
4. Download and replace the placeholder files

### Manual Way: Use Image Editor

```bash
# Requirements:
# - 192x192 PNG (for mobile home screen)
# - 512x512 PNG (for splash screen and app stores)
# - Should have transparent or solid background
# - Logo should be centered with padding
```

## 🚀 Testing Your PWA

### On Desktop (Chrome/Edge):
1. Build for production: `npm run build`
2. Start production server: `npm start`
3. Open browser
4. Look for install icon in address bar (⊕ icon)
5. Click "Install App"

### On Mobile:
1. Deploy to your server
2. Visit site via HTTPS (PWA requires HTTPS)
3. Browser will prompt "Add to Home Screen"
4. Install the app
5. Launch from home screen

## Features Users Get:

✅ **Install to Device** - Add app to home screen  
✅ **Offline Access** - Works without internet (cached data)  
✅ **Fast Loading** - Assets cached for instant load  
✅ **Native Feel** - Runs fullscreen like a native app  
✅ **Auto Updates** - Service worker updates in background  

## Production Notes:

- PWA is disabled in development mode
- Service worker only activates in production
- HTTPS is required for PWA features
- Make sure your server serves `/manifest.json` correctly

## Verification:

After deployment, test with:
1. Chrome DevTools > Application > Manifest
2. Chrome DevTools > Application > Service Workers
3. Lighthouse audit for PWA score

## Mobile Install Prompt:

Users will see "Install App" banner automatically when:
- Site is visited twice
- With at least 5 minutes between visits
- Site is served over HTTPS
- Has valid manifest.json
- Has registered service worker

Done! 🎉
