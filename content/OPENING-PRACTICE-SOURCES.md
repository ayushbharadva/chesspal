# Opening practice sources and verification

The extra lines in `opening-practice.json` expand the three existing guides. All
move-by-move reasons, descriptions, hints and transfer prompts were written for
ChessPal. No commercial course annotations, screenshots or exercise text were
copied. Opening names and established move sequences describe shared chess
positions; their inclusion does not imply endorsement by the referenced sites.

## Branch references

Checked 22 October 2026. Chess.com's own opening pages establish the variations
and explain their broad ideas. Lichess's official CC0 opening dataset verifies
the longer sequences, with the exact snapshot pinned below.

| Guide and branch         | Primary opening reference                                                                                                                                                                                       | Full move-sequence cross-check                                                                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Italian: Two Knights     | [Two Knights Defense](https://www.chess.com/openings/Italian-Game-Two-Knights-Defense), Modern Bishop's Opening with 4.d3 Be7                                                                                   | [Lichess c.tsv, C55](https://github.com/lichess-org/chess-openings/blob/a6189a30dc273ccb21fc2536a9a2fefd5592a67a/c.tsv#L960)                                      |
| Italian: Evans Gambit    | [Evans Gambit](https://www.chess.com/openings/Giuoco-Piano-Game-Evans-Gambit)                                                                                                                                   | First six moves of [Lichess c.tsv, Morphy Attack](https://github.com/lichess-org/chess-openings/blob/a6189a30dc273ccb21fc2536a9a2fefd5592a67a/c.tsv#L874)         |
| Caro-Kann: Classical     | [Classical Variation](https://www.chess.com/openings/Caro-Kann-Defense-Classical-Variation) and [Caro-Kann overview](https://www.chess.com/openings/Caro-Kann-Defense), which describes the 3.Nd2 transposition | [Lichess b.tsv, B19 Classical](https://github.com/lichess-org/chess-openings/blob/a6189a30dc273ccb21fc2536a9a2fefd5592a67a/b.tsv#L370)                            |
| Caro-Kann: Exchange      | [Exchange Variation](https://www.chess.com/openings/Caro-Kann-Defense-Exchange-Variation)                                                                                                                       | First five moves of [Lichess b.tsv, Rubinstein Variation](https://github.com/lichess-org/chess-openings/blob/a6189a30dc273ccb21fc2536a9a2fefd5592a67a/b.tsv#L325) |
| Queen's Gambit: Declined | First six moves of [Orthodox Rubinstein Attack](https://www.chess.com/openings/Queens-Gambit-Declined-Orthodox-Rubinstein-Attack)                                                                               | First six moves of [Lichess d.tsv, Rubinstein Variation](https://github.com/lichess-org/chess-openings/blob/a6189a30dc273ccb21fc2536a9a2fefd5592a67a/d.tsv#L529)  |
| Queen's Gambit: Slav     | [Slav Defense](https://www.chess.com/openings/Slav-Defense), Main Line through 7.Bxc4                                                                                                                           | The primary page prints this complete sequence                                                                                                                    |

The official Lichess dataset's [CC0 dedication](https://github.com/lichess-org/chess-openings/blob/a6189a30dc273ccb21fc2536a9a2fefd5592a67a/COPYING.txt)
applies to its move data. ChessPal does not copy Chess.com prose. The branch
lines are examples of supported play, not claims that every alternative is a
mistake or that the line forces a favourable outcome.

## Transfer exercises

The six transfer positions were assembled as original teaching examples. Each
starts from the normal initial position and includes its legal setup moves.
Its final board position, side to move, castling rights and en-passant state must
not match any position already shown in that guide's main example or added
branches. Move counters are excluded from this novelty comparison.

Each prompt names a specific goal: castle, support d4 with c3, develop the bishop
with a pin, develop the b8 knight to support f6, or recover c4 while developing a
bishop. An accepted answer satisfies that goal; other legal or sound moves may
exist. These exercises do not label every other move a chess mistake or claim
that their answer is always the engine's unique best move. No refutation lines
are supplied.

Run from the repository root:

```sh
npx tsx scripts/content/verify-opening-practice.ts
```

The verifier uses the existing local **Stockfish 19 Lite**, one thread, a 16 MB
hash, a cleared hash before each search and depth **14**. For every transfer it
compares an unrestricted root search with a root search restricted to each
accepted answer (`searchmoves`). Scores are centipawns from the learner's side
to move. Stored loss is `max(0, bestScoreCp - answerScoreCp)`. The conservative
acceptance limit is **35 centipawns**. Separate searches can return slightly
different scores, including a higher score for the restricted search; negative
estimated loss is therefore reported as zero.

Metadata is written only after the complete verification succeeds. Add `--check`
to rerun all engine and legality checks without rewriting content. The JSON
records the actual check time, engine, depth, unconstrained best move/score and
the score/loss for every accepted answer. This is finite-depth soundness
evidence, not a mathematical proof, a unique-move guarantee or a learner outcome
study. The branches themselves receive complete legality checks and source
cross-checks, rather than a claim that every opening ply is engine-optimal.
