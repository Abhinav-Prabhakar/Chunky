# chunky

A practice gym for speed readers. Chunky flashes text one word-chunk at a time on a
pivot letter, the way RSVP readers do, and then checks whether you actually understood
what went past. No build step, no framework, no account — plain HTML, CSS and JavaScript.

## What it does

- **RSVP chunk reading** with 1–4 word chunks, pivot-letter alignment, punctuation
  pauses, an adaptive speed ramp and phrase-aware "smart chunks" that avoid breaking
  on `the` / `of` / `and`.
- **Up to 3000 wpm** on a logarithmic speed slider. Change speed *or* chunk width
  mid-session — the reader keeps your place, rebuilds the chunks around the word you
  were on and carries straight on.
- **Five modes** — passage, timed, zen (manual pace), ramp (the speed climbs as you
  read) and your own pasted text.
- **Comprehension checks** with a one-line explanation per answer, an answer review,
  and a drill for the questions you missed.
- **Stats that match the premise** — performance by chunk size, effective WPM,
  speed distribution, speed-vs-comprehension scatter, a 26-week heatmap, a daily goal,
  streaks and 16 achievements.
- **12 themes** plus a custom accent, light and dark, with a pre-paint theme script so
  there is no flash on load.
- **Local-first** — everything is stored in `localStorage`; JSON/CSV export and JSON
  import for backup.
- **Touch and keyboard** — tap the stage to start, swipe for speed and chunk size,
  or use the shortcuts below.
- **PWA** — installable and usable offline once the service worker has cached it.

## Run it

Any static server works:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
# then open http://127.0.0.1:4173
```

The live build is also on GitHub Pages:
<https://Abhinav-Prabhakar.github.io/Chunky/>

Opening `index.html` directly also works, except the service worker (which needs
`http(s)`).

## Keyboard

| Key | Action |
| --- | --- |
| `space` | start / pause (zen: next chunk) |
| `enter` | start · next passage on the results screen |
| `r` | restart this passage |
| `←` `→` | speed down / up (10–100 wpm, scaled to your pace) |
| `↑` `↓` | chunk size − / + |
| `b` | peek at the previous chunk |
| `1`–`4` | answer a comprehension question |
| `v` / `m` | toggle passage / smart chunks |
| `f` | fullscreen |
| `t` / `s` / `?` | theme / settings / shortcuts |
| `esc` | quit the session or close a panel |

## Structure

```
index.html          markup for practice, quiz, results and stats
css/style.css       the whole design system (tokens per theme)
js/passages.js      bundled passages, questions and explanations
js/engine.js        pure logic: chunking, ORP, pacing, scoring, streaks, achievements
js/app.js           UI controller: reader loop, quiz, results, stats, modals, routing
manifest.json       PWA manifest
sw.js               network-first service worker
assets/icon.svg     app icon
```

`js/engine.js` deliberately has no DOM access, so `buildChunks`, `orpIndex`,
`effectiveWpm`, `computeStreaks` and `scoreSession` can be tested in isolation.

## Data

Everything lives under `chunky.*` keys in `localStorage`. The stats page can export
all of it to JSON (and import it back) or to CSV for a spreadsheet. Clearing the
browser's site data removes it permanently, so export if it matters.

## Notes

- Passage text and quiz explanations are bundled in `js/passages.js`; add new entries
  to the `PASSAGES` array and they show up in the library, the length filter and the
  daily challenge rotation automatically.
- The daily challenge is seeded by the calendar date, so everyone sees the same
  passage on the same day.
