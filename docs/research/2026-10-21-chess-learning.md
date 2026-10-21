# RookieReps: REA investigation and learning direction

Research date: 21 October 2026. Starting app: pushed MVP `eff08b9`, PR #1.
Audience remains beginners who know the rules. Android, offline learning, no required account.

## Decision

Build a focused session that explains an idea, gives practice, and checks independent recall later.
The product hypothesis is **less setup and a clearer learning path**, not that offline practice,
explanations or spaced repetition are new. Those features already exist across the products below.

Provisional promise: **Ten clear chess reps, with explanations and review, ready offline.**
Ten is a session size, not a daily cap. This research establishes useful references; it does not yet
establish an unserved market or prove improved learning outcomes.

## What was actually investigated

| Question                                          | Result                                                                 | Evidence boundary                                                      |
| ------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Can REA work here?                                | Yes: project-local `rea-agents` 6.7.0 CLI ran successfully.            | Static JavaScript path only; global MCP configuration was not changed. |
| Can it inspect a shipped chess-learning artifact? | Yes: Listudy's publicly served tactics bundle was captured and parsed. | One asset, not the complete website or its backend.                    |
| Which implementations are useful?                 | Five source repositories were examined and pinned below.               | Source inspection, not binary decompilation or runtime testing.        |
| What do competitors already offer?                | Official feature pages and store listings were reviewed.               | Documented capabilities, not hands-on usability comparisons.           |
| Does the proposed combination improve learning?   | Unresolved; a small novice pilot is required.                          | Do not infer a market gap from a missing marketing claim.              |

### REA experiment

The [Listudy English page](https://listudy.org/en) served
`/js/tactics-1300e2c0bb457d850356d0e7d22a0777.js?vsn=d`.
The captured asset is 68,124 bytes; SHA-256:
`08c110ca43fbbca3cd948852779ae7b7132f9cbffeced1c0043fb40b44492b6a`.

REA Evidence ID: `ev_1c7ce97021f11ef83b3503f2e2df33a1f6645e56ad3e5e1f512f757d378ca5f5`.
It parsed one JavaScript file without parse failures and identified three bundled modules.
Two precise syntax observations are `localStorage.getItem` and `localStorage.setItem` for
`achievements_tactics_solved`, at line 2, columns 66814–66865 and 66869–66932 respectively.
These observations show a client-storage mechanism in this artifact. They do not prove when it runs,
how reviews are scheduled, or that Listudy lacks other persistence.

REA reports partial structural coverage and dynamic unknowns. The bundle was parsed as inert text;
its bootstrap was not executed. The experiment validates the inspection workflow, not educational
effectiveness. Raw evidence remains local and ignored; a compact manifest records identity and limits.

REA's [own routing instructions](https://github.com/morluto/rea/blob/f801b2fbfd28f4e3713adefddc7bd73db44c284c/.agents/skills/reverse-engineer-anything/SKILL.md)
recommend ordinary tools for complete source repositories. That is why the following findings use
source permalinks rather than unnecessary decompilation.

## Repositories worth studying

| Priority  | Repository and pinned commit                                                                          | What to learn                                                     | License and REA fit                                                                                                                                                                                                             |
| --------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | [Lichess Mobile](https://github.com/lichess-org/mobile/tree/5599f91235c64be577b056489f5286156eef74ef) | Durable offline attempts, queue updates, session recovery.        | [GPLv3](https://github.com/lichess-org/mobile/blob/5599f91235c64be577b056489f5286156eef74ef/LICENSE), with additional notices in COPYING. Dart source: read directly; Flutter artifact inspection has narrower recovery limits. |
| 1         | [Listudy](https://github.com/ArneVogel/listudy/tree/804b69bc5ef436e7786c8b96dadcb3ef756c06ec)         | Teach a line, gradually remove help, explain moves with comments. | [AGPLv3](https://github.com/ArneVogel/listudy/blob/804b69bc5ef436e7786c8b96dadcb3ef756c06ec/LICENSE). JavaScript source plus deployed bundle makes a useful REA comparison target.                                              |
| 2         | [Lila](https://github.com/lichess-org/lila/tree/e30aebb975e4d1e6e2718b9c4a9beb8d2867ef1e)             | Puzzle solve/retry/review states and first-attempt outcomes.      | [AGPLv3](https://github.com/lichess-org/lila/blob/e30aebb975e4d1e6e2718b9c4a9beb8d2867ef1e/LICENSE), with asset exceptions in COPYING. Read TypeScript UI source; REA can inspect a selected deployed JS artifact.              |
| 3         | [Chessli](https://github.com/pwenker/chessli/tree/e9c17d236745b98686c1e0b897313c84a9ca44f7)           | Turn annotated personal games into mistake cards.                 | [MIT](https://github.com/pwenker/chessli/blob/e9c17d236745b98686c1e0b897313c84a9ca44f7/LICENSE). Python/Anki workflow: direct source reading fits; no packaged binary was investigated.                                         |
| Reference | [Chessdriller](https://github.com/gtim/chessdriller/tree/b0de0f32e6a406c78af2564d59c9fe5aafa570e4)    | Due-move selection, line continuity and review updates.           | No LICENSE/COPYING found in the inspected full tree. Archived 3 October 2026. Use conceptual observations, not copied implementation. JS/TS/Svelte bundle inspection is possible if an artifact is selected.                    |

Specific findings:

- **Mobile:** its [queue filler](https://github.com/lichess-org/mobile/blob/5599f91235c64be577b056489f5286156eef74ef/lib/src/model/puzzle/puzzle_queue_filler.dart#L79-L135)
  avoids refilling around pending solves and rereads queue state before merging a response. This is a
  future synchronization reference; RookieReps currently needs local persistence rather than networking.
- **Listudy:** [move handling](https://github.com/ArneVogel/listudy/blob/804b69bc5ef436e7786c8b96dadcb3ef756c06ec/assets/js/study.js#L113-L205)
  supports repertoire alternatives and reduces arrow assistance after repetitions;
  [comments explain moves](https://github.com/ArneVogel/listudy/blob/804b69bc5ef436e7786c8b96dadcb3ef756c06ec/assets/js/study.js#L319-L345).
  The inspected [progress helper](https://github.com/ArneVogel/listudy/blob/804b69bc5ef436e7786c8b96dadcb3ef756c06ec/assets/js/modules/tree_utils.js#L68-L95)
  alone does not establish a full calendar scheduler.
- **Lila:** [outcome transitions](https://github.com/lichess-org/lila/blob/e30aebb975e4d1e6e2718b9c4a9beb8d2867ef1e/ui/puzzle/src/ctrl.ts#L423-L445)
  preserve the difference between a first failure and later retry success.
  [Hints and reveals](https://github.com/lichess-org/lila/blob/e30aebb975e4d1e6e2718b9c4a9beb8d2867ef1e/ui/puzzle/src/ctrl.ts#L628-L648)
  affect assisted outcomes. RookieReps should continue treating completion and independent success separately.
- **Chessli:** [mistake extraction](https://github.com/pwenker/chessli/blob/e9c17d236745b98686c1e0b897313c84a9ca44f7/chessli/mistakes.py#L95-L128)
  retains position, played move and a better continuation from annotated PGNs. This is a later import
  feature, not a reason to add accounts or remote analysis now.
- **Chessdriller:** [selection](https://github.com/gtim/chessdriller/blob/b0de0f32e6a406c78af2564d59c9fe5aafa570e4/src/lib/scheduler.ts#L24-L65)
  and [review updates](https://github.com/gtim/chessdriller/blob/b0de0f32e6a406c78af2564d59c9fe5aafa570e4/src/routes/api/study/move/%2Bserver.js#L66-L139)
  are useful conceptual references. No code from these files was imported.

All new RookieReps logic is independently written. Keep original artwork and lesson text, and record
any future component reuse with its actual license and notices. Public source availability alone is
not a reuse license. The existing CC0 puzzle-data provenance remains separate from app-source licenses.

## What other apps already do

| Product                                                                              | Verified on its official sources                                                                                                                         | Product implication                                                                             |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [Chessbook](https://chessbook.com/)                                                  | No-signup start, practical level-specific openings, coverage, spaced repetition, plans and optional game-linked feedback.                                | A simpler opening path is an execution hypothesis; account-free starts and plans already exist. |
| [ChessTempo mobile](https://chesstempo.com/mobile)                                   | Winning/defensive tactics, past-mistake sets, spaced repetition and opening repertoires. Custom tactic sets require website creation and premium access. | Automatic on-phone workout composition could remove a documented setup step.                    |
| [Aimchess](https://aimchess.com/)                                                    | Personalized training from games, retry mistakes, plans and several defensive/decision exercise types.                                                   | Personalization is established; our narrower scope can personalize from local practice first.   |
| [Dr. Wolf](https://learnchesswithdrwolf.com/)                                        | Beginner explanations, lessons, hints and repeat practice of mistakes.                                                                                   | Do not claim competing apps fail to explain why. Make our explanations demonstrably useful.     |
| [Chessable](https://play.google.com/store/apps/details?id=com.chessable.chessable)   | MoveTrainer, explanations, progress/streaks and downloadable offline courses with PRO.                                                                   | Offline access and spaced repetition are established; avoid novelty claims.                     |
| [Lichess mobile](https://play.google.com/store/apps/details?id=org.lichess.mobileV2) | Offline themed puzzles and studies; [v0.29.1](https://github.com/lichess-org/mobile/releases/tag/v0.29.1) adds basics and practice.                      | Free offline puzzles and beginner lessons already have strong alternatives.                     |

These pages establish presence of features. They do not establish absence of unlisted features or
prove that beginners find a particular app difficult.

## Concrete development sequence

### First slice: scheduled independent recall

The starting RookieReps review queue only included the latest assisted completions. A subsequent
independent success removed a puzzle from that queue, so it did not provide a later recall check.

Add a deterministic calendar schedule derived from the existing attempt log. Start with next-day
review, lengthen after successful due recalls, and reset after assistance. Same-day or early success
must not move a review farther away. Reserve three workout places for due reviews; fill with fresh
positions, with familiar-content fallback when necessary. Keep a dedicated review path.

Use a transparent 1/3/7/14/30-day pilot policy. It is not FSRS, a personalized memory model, a
competitor's recovered algorithm, or an empirically optimal spacing claim. Existing saved history
supplies the schedule without a schema migration. Keep ten unique puzzles and unlimited sessions.
If the finite collection is exhausted, additional due puzzles may fill the round.

Acceptance: due independent solves return; future reviews wait while new content exists; assistance
resets the schedule; early repeats do not postpone it; local calendar boundaries and reloads work;
Home and the review session agree on eligibility.

### Next: explain and verify understanding

Author a short explanation of the threat, purpose and consequence. Prepare relevant opponent replies
with the existing engine-verification pipeline. For a wrong move without a verified counterline,
show a neutral retry prompt rather than inventing a refutation. Follow assistance with a later
unaided check, and report it separately from completion.

### Then: connect an opening to a practical decision

For each existing guide, add one plan, one common opponent deviation and related original exercises.
Use demonstrate → guided recall → unaided recall. Check transfer with an unfamiliar position, not
only memorization of the same twelve moves. Alternatives require verified content and chess rules.

### Later: learn from a player's games

Consider optional local PGN import and engine-verified mistake cards after the small learning loop
has evidence of value. Online account sync, multiplayer, a live AI coach, payments and broad content
expansion are separate decisions, not prerequisites for this iteration.

## Validate the gap before expanding

Run a small moderated pilot with 5–8 beginners who know the rules. Observe first-session start time,
completion, ability to explain the move and unaided recall after at least 24 hours. Ask what the user
would do next without prompting. Include an unfamiliar transfer position to distinguish learning
from recognition. Record assistance separately from success.

Use these observations to choose the next content/UX change; streaks and total puzzles solved alone
do not establish learning. Initial evidence can be recorded manually without an analytics SDK.
