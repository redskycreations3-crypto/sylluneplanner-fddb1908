# Packaging Syllune for Android (Capacitor)

The Android app wraps the existing web app — no features are duplicated or rebuilt.

```bash
npm run build          # production build of the web app
npx cap add android    # first time only
npx cap sync android
npx cap open android   # or build via CI / Android Studio
```

- App ID: `com.syllune.study`
- App name: `Syllune`
- Icons: `public/icon-192.png`, `public/icon-512.png` (copy into
  `android/app/src/main/res` or generate with `@capacitor/assets`).
- `capacitor.config.ts` points the WebView at the deployed app URL so
  authentication redirects, cloud sync and the AI photo import keep working.
  Offline use is handled by the service worker + local persistence already in
  the app. Change `server.url` if you deploy to a custom domain.
