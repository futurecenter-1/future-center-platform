# Future Center iOS and lecture-protection audit

## Work completed on this branch
- Added `@capacitor/ios` while keeping the existing Android prototype and production `main` branch unchanged.
- Added a macOS GitHub Actions workflow that generates the Capacitor iOS project and builds an unsigned iOS Simulator app.
- The workflow artifact is for simulator validation only. It is **not an installable iPhone IPA** and does not provide App Store/TestFlight distribution.

## Important limits
- iOS does not provide a public API that reliably blocks ordinary screenshots. Native capture/recording detection can hide content in supported recording/mirroring cases, but cannot guarantee prevention of screenshots.
- This branch does not yet claim capture protection for iOS; that requires a native implementation and testing on real devices.
- The current app embeds YouTube videos using `youtube-nocookie.com`. Embedding and visual watermarks can discourage casual sharing but are not DRM; anyone who obtains the video URL may share it. Consider a protected video provider with signed playback and domain/app restrictions if stronger protection is required.
- `controlsList="nodownload"` and `disablePictureInPicture` are browser UI hints, not security boundaries.

## Security checks required before release
1. Verify Supabase RLS policies on `lectures`, `lecture_files`, `subscriptions`, student profiles, and enrollment tables. Client-side access checks are not sufficient by themselves.
2. Review the legacy standalone `lecture.html`: it queries active lectures and files using the public client key and does not visibly check the current user's session or course subscription before rendering. Confirm that RLS blocks unauthorized requests; otherwise retire or harden this route before sharing protected course URLs.
3. Audit every file delivery path. Private Storage objects should be delivered only through short-lived signed URLs after server-side authorization; avoid storing private file links as public HTTPS URLs.
4. Test with an unapproved student account and a signed-out session, not only an administrator account.
5. Add iOS capture/recording detection as a best-effort native feature only after the simulator build succeeds and real-device testing is available.

## Free testing path
- GitHub Actions can compile the simulator app without a paid Apple developer membership.
- To install on a physical iPhone, an Apple development workflow and signing are required; direct and long-term distribution has additional Apple restrictions. A simulator artifact cannot be installed on an iPhone.
