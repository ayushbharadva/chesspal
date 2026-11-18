# Android validation still pending

Automated tests and a production Android bundle export verify shared logic and packaging. They do not establish native touch behavior, visual layout, performance, or physical-device storage reliability.

## When a device or emulator is available

Use the preview APK from `npx eas-cli@latest build --platform android --profile preview` after the owner has configured the Expo project and credentials. Record the build commit, Android version, device and date with each result. The current app remains a draft; none of the items below is marked passed.

- [ ] Fresh install: the welcome screen and level question appear once, Home loads, Start puzzles opens a board, all five puzzles complete, and Results shows the correct without-help count. Done returns to the tab the round started from.
- [ ] Tabs: Home, Learn, Puzzles, Openings and Progress switch without losing scroll or progress; five labels fit a small phone; the tab bar hides during rounds and lessons and clears the home indicator.
- [ ] Learn: "I'm new to chess" on first launch opens lesson one. Play a lesson of each step kind (read, choice, tap, stars, capture, move with a reply, play against the defender, puzzles); a wrong tap or move is marked without shaking the board, a hint costs a star, and finishing unlocks the next lesson. Leave a lesson part-way (back to Learn, and separately by force-closing): it starts again from step 1, and slips from finished steps still count. Stars, arrows and marked squares are readable on both board colours in both themes, and the long path scrolls smoothly.
- [ ] Learning path: Home → the opening row opens the demonstration; Play completes practice with hints; return Home → the row now offers a new position. Demonstration viewing alone does not create activity.
- [ ] Restart: leave a puzzle on its second move and an opening recall after a hint/retry, once with Android back and once by force-closing. The round resumes at the same puzzle, both start again from their first move, and help/retries are preserved. Switching briefly to another app keeps the position.
- [ ] Due recall: finish a lesson, then open on its next local calendar day. Home offers to review the lesson; move notes stay hidden until help is requested. Viewing the demonstration records assistance. An early repeat does not postpone the review.
- [ ] Day rollover: leave Home or Learn open over midnight, and resume the app after a night in the background. Due recalls and activity update without force-closing the app.
- [ ] Activity: complete only a lesson on one day and a workout on the next. Both days count; completing several items on one date adds only one practice day. Counts survive a force-close.
- [ ] Wrong-move replies: on a first move and on a second move, play a wrong move. It stays put, the reply follows after a short pause with its square in red, and the reason reads well. Only Reset shows on a first move; Back one move and Reset both work, jump back without a slide, and the puzzle then counts as with help. Both icons are clear in both themes, TalkBack reads "Back one move" and "Reset", and the first wrong move after a cold start has no noticeable delay.
- [ ] Board: legal/illegal taps, both orientations, castling, en passant and all promotion options behave correctly.
- [ ] Dragging: drag from each orientation near the board's edges on a scrolled screen. The page stays still during a drag, a drop on an illegal square returns the piece, and taps still work. Moves slide, and the opponent's reply follows after a short pause.
- [ ] Daily challenge: finish one with a hard and a normal pick, force-close at a pick and resume it, and confirm one scored run a day. Haptics fire when on and stop when turned off in Settings; Android's reduce-animations setting plays moves instantly.
- [ ] Sound: moves, captures, check and checkmate each sound right, with no delay or crackle and at a comfortable volume. Silent mode and the Settings switch both stop them, and music from another app keeps playing.
- [ ] Android back: leave and return to each flow without losing round progress or creating duplicate attempts.
- [ ] Airplane mode: puzzles, guides, exercises and saved progress work; the external reference reports a connection problem gracefully.
- [ ] Piece sets: each set in Settings changes the board, promotion choices and previews at once, keeps its shading on Android, and stays readable on light and dark squares in both themes.
- [ ] Layout/accessibility: small phone, large font scale, dark mode and TalkBack. Verify readable labels, reachable controls and no clipped board or buttons.
- [ ] Performance: record cold-start time with the 3,200-puzzle bundle and check repeated moves on a mid-range or slower Android device.

Account setup, signed APK/AAB creation and these device checks remain release gates. A JavaScript bundle export is not an installable APK.
