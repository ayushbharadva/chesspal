# Android validation still pending

Automated tests and a production Android bundle export verify shared logic and packaging. They do not establish native touch behavior, visual layout, performance, or physical-device storage reliability.

## When a device or emulator is available

Use the preview APK from `npx eas-cli@latest build --platform android --profile preview` after the owner has configured the Expo project and credentials. Record the build commit, Android version, device and date with each result. The current app remains a draft; none of the items below is marked passed.

- [ ] Fresh install: Home loads, Start practice opens a board, all ten puzzles complete, and Results shows the correct independent/assisted counts.
- [ ] Learning path: Home → Learn this line opens the demonstration; Play line completes guided practice; return Home → Apply this idea opens a separate position. Demonstration viewing alone does not create activity.
- [ ] Resume: leave a puzzle and an opening recall after a hint/retry; force-close and reopen. Resume both at the saved position, with help/retries preserved.
- [ ] Due recall: finish a lesson, then open on its next local calendar day. Home offers Recall this lesson; move notes stay hidden until help is requested. Viewing the demonstration records assistance. An early repeat does not postpone the review.
- [ ] Activity: complete only a lesson on one day and a workout on the next. Both days count; completing several items on one date adds only one practice day. Counts survive a force-close.
- [ ] Board: legal/illegal taps, both orientations, castling, en passant and all promotion options behave correctly.
- [ ] Android back: leave and resume each flow without losing position or creating duplicate attempts.
- [ ] Airplane mode: puzzles, guides, exercises and saved progress work; the external reference reports a connection problem gracefully.
- [ ] Layout/accessibility: small phone, large font scale, dark mode and TalkBack. Verify readable labels, reachable controls and no clipped board or buttons.
- [ ] Performance: record cold-start time and check repeated moves on a mid-range or slower Android device.

Account setup, signed APK/AAB creation and these device checks remain release gates. A JavaScript bundle export is not an installable APK.
