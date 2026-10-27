# Future Center mobile app prototype

This branch adds a Capacitor-based Android prototype without changing the published website or Supabase schema.

## What is included
- A sync script that copies the existing platform files into Capacitor's `www/` directory.
- Capacitor configuration for app ID `com.futurecenter.platform`.
- An Android patch script that sets `WindowManager.LayoutParams.FLAG_SECURE` on the native app window to block ordinary screenshots and screen recording on Android.
- Existing website and admin assets remain the source of the app UI.

## Build locally
1. Install Node.js 20+ and Android Studio / Android SDK.
2. Run `npm install`.
3. Run `npx cap add android` once.
4. Run `npm run mobile:sync`.
5. Run `node scripts/enable-android-screen-security.mjs`.
6. Build with `cd android && ./gradlew assembleDebug`.

Debug APK output: `android/app/build/outputs/apk/debug/app-debug.apk`.

## Important security notes
- `FLAG_SECURE` is an Android native-window control; it does not prevent a second physical camera from filming the screen and is not a guarantee against modified/rooted devices.
- This first prototype protects the entire Android app window, not only the video player.
- The current site embeds unlisted YouTube videos. A secure app window does not prevent someone from sharing a YouTube URL they obtain. For stronger content protection, video hosting/player access and tokenized playback must be reviewed separately.
- iOS requires a separate native implementation and testing. iOS does not provide a universal public API to prevent ordinary screenshots; recording/capture detection can be used to hide content in supported cases.
- No APK has been built or device-tested merely by adding these project files. Test login, course access, video playback, screenshots, recording, and app updates on physical devices before distribution.

## iOS prototype

This branch also includes `@capacitor/ios` and a GitHub Actions workflow at `.github/workflows/build-mobile-ios.yml`. The workflow builds an unsigned iOS Simulator `.app` on a macOS runner and uploads it as an artifact. This is for compile/simulator validation only; it is not an IPA and cannot be installed on a physical iPhone. Installing on a real iPhone requires an Apple signing workflow. iOS screenshot prevention is not guaranteed; see `mobile/IOS-AND-VIDEO-SECURITY.md` for the current security findings and required checks.
