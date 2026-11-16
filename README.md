<p align="center">
  <img src="assets/readme/banner.png" alt="Chunky — read in chunks, not letters" width="100%">
</p>

<p align="center">
  <a href="https://abhinav-prabhakar.github.io/Chunky/"><img alt="Live demo" src="https://img.shields.io/badge/live-demo-ff7a5c?style=flat-square&labelColor=1a1a1e"></a>
  <a href="#the-loop"><img alt="Up to 3000 wpm" src="https://img.shields.io/badge/speed-up%20to%203000%20wpm-ff7a5c?style=flat-square&labelColor=1a1a1e"></a>
  <img alt="Vanilla JS" src="https://img.shields.io/badge/vanilla-js-ff7a5c?style=flat-square&labelColor=1a1a1e">
  <img alt="PWA" src="https://img.shields.io/badge/pwa-offline%20ready-ff7a5c?style=flat-square&labelColor=1a1a1e">
  <a href="https://github.com/Abhinav-Prabhakar/Chunky/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/Abhinav-Prabhakar/Chunky?style=flat-square&labelColor=1a1a1e&color=ff7a5c"></a>
</p>

<p align="center">
  <b>Speed reading Lab</b><br>
  <sub>RSVP word chunks &nbsp;·&nbsp; Comprehension quizzes &nbsp;·&nbsp; Stats that keep you honest</sub>
</p>

<img src="assets/readme/hero.png" alt="Chunky practice screen: a chunked phrase aligned on its pivot letter, with speed and chunk controls below" width="100%">

<h3 align="center">3,000 wpm ceiling &nbsp;·&nbsp; 1–4 word chunks &nbsp;·&nbsp; 5 modes &nbsp;·&nbsp; 16 achievements &nbsp;·&nbsp; 0 accounts</h3>

## What it does

Eye movements limit how fast you can read. Chunky removes the movement:
one chunk per fixation, aligned on a pivot letter, at whatever pace you set.

<p align="center">
  <img src="assets/readme/loop.gif" alt="Animated loop of Chunky flashing two-word chunks at 520 wpm" width="100%">
</p>

<p align="center"><sub>The app. You can also hide UI by turning on focus mode.</sub></p>

<p align="center">
  <img src="assets/readme/quiz.png" alt="Comprehension quiz with multiple choice answers and an explanation" width="100%">
</p>

<p align="center"><sub>You're asked to take a quiz after a run to measure your comprehension.</sub></p>

<p align="center">
  <img src="assets/readme/results.png" alt="Results screen showing 805 wpm, 100% comprehension and a personal best badge" width="100%">
</p>

<p align="center"><sub>Your effective WPM is calculated by multiplying raw speed with comprehension.</sub></p>

<p align="center">
  <img src="assets/readme/stats.png" alt="Stats page with mode and range filters, a daily goal bar, six summary numbers, a speed chart and a chunk size table" width="100%">
</p>

<p align="center"><sub>Stats page so know how much you improved</sub></p>

<p align="center">
  <img src="assets/readme/shelf.png" alt="Achievements grouped by sessions, speed, streaks, comprehension and practice, above a numbered catalogue of passages showing read state and difficulty" width="100%">
</p>

<p align="center"><sub>…which also contains a list of achievements to keep track!</sub></p>

## What I based this on

- **Eye movements limit your reading speed.** Skilled readers experience 200–250 ms pauses, 7–9 letters
  per jump, and a backward jump 10–15% of the time. One chunk per fixation removes
  the jumps. <sub>Rayner 1998 · Rubin & Turano 1992</sub>
- **Two words is a good chunk.** Comprehension peaks at segments of about 12
  characters, and segments cut at idea boundaries beat equal-length random cuts.
  That's why chunks are 1–4 words, two by default. <sub>Cocklin et al. 1984</sub>
- **Words are positioned slightly to the left of center.** Interestingly, words are recognized fastest slightly
  left of center; every letter away from that point costs 20–30 ms. <sub>O'Regan et al. 1984 · Brysbaert & Nazir 2005</sub>
- **Punctuation pauses.** Readers prefer punctuation and clause pauses, comprehension drops otherwise.
  Sentence ends get ~2×, commas ~1.4×. <sub>Masson 1983 · Castelhano & Muter 2001</sub>
- **Regressions are natural.** RSVP that allows self-pacing and rereading matches page
  reading; taking both away doesn't. That's why peek pauses on the last chunk and zen
  steps backward. <sub>Rahman & Muter 1999</sub>
- **Testing beats rereading.** A week later: 56% recalled after a test, 42% after a
  restudy. Feedback helps right and wrong answers both. Hence quiz, explanation,
  drill. <sub>Roediger & Karpicke 2006 · Butler & Roediger 2008</sub>
- **Speed × comprehension is the score.** Reading efficiency is defined this way in
  the literature, not by raw wpm. <sub>Rahman & Muter 1999 · Castelhano & Muter 2001</sub>
- **Practice is the only shortcut.** Reading more, across a wider range of material,
  is what reliably raises speed; RSVP comprehension itself improves over days of
  use. <sub>Rayner et al. 2016 · Cocklin et al. 1984</sub>

> Average adult silent reading is 238 wpm. Eye-movement execution alone tops out near
> 300, and past roughly 250 wpm comprehension starts to fall even when the eye
> movements are gone. 3,000 is only a practice ceiling.
> <sub>Brysbaert 2019 · Primativo et al. 2016 · Riccardi & Di Nocera 2017</sub>

<details>
<summary><sub>References</sub></summary>

- Brysbaert, M. (2019). How many words do we read per minute? A review and meta-analysis of reading rate. *Journal of Memory and Language*, 109, 104047.
- Brysbaert, M., & Nazir, T. (2005). Visual constraints in written word recognition: evidence from the optimal viewing-position effect. *Journal of Research in Reading*, 28(3), 216–228.
- Butler, A. C., & Roediger, H. L. (2008). Feedback enhances the positive effects and reduces the negative effects of multiple-choice testing. *Memory & Cognition*, 36(3), 604–616.
- Castelhano, M. S., & Muter, P. (2001). Optimizing the reading of electronic text using rapid serial visual presentation. *Behaviour & Information Technology*, 20(4), 237–247.
- Cocklin, T. G., Ward, N. J., Chen, H.-C., & Juola, J. F. (1984). Factors influencing readability of rapidly presented text segments. *Memory & Cognition*, 12(5), 431–442.
- Masson, M. E. J. (1983). Conceptual processing of text during skimming and rapid sequential reading. *Memory & Cognition*, 11(3), 262–274.
- O'Regan, J. K., Lévy-Schoen, A., Pynte, J., & Brugaillère, B. (1984). Convenient fixation location within isolated words of different length and structure. *Journal of Experimental Psychology: Human Perception and Performance*, 10(2), 250–257.
- Primativo, S., Spinelli, D., Zoccolotti, P., De Luca, M., & Martelli, M. (2016). Perceptual and cognitive factors imposing "speed limits" on reading rate: a study with the rapid serial visual presentation. *PLoS ONE*, 11(4), e0153786.
- Rahman, T., & Muter, P. (1999). Designing an interface to optimize reading with small display windows. *Human Factors*, 41(1), 106–117.
- Rayner, K. (1998). Eye movements in reading and information processing: 20 years of research. *Psychological Bulletin*, 124(3), 372–422.
- Rayner, K., Schotter, E. R., Masson, M. E. J., Potter, M. C., & Treiman, R. (2016). So much to read, so little time: how do we read, and can speed reading help? *Psychological Science in the Public Interest*, 17(1), 4–34.
- Riccardi, O., & Di Nocera, F. (2017). Not so fast: a reply to Benedetto et al. (2015). *Computers in Human Behavior*, 69, 381–385.
- Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning: taking memory tests improves long-term retention. *Psychological Science*, 17(3), 249–255.
- Rubin, G. S., & Turano, K. (1992). Reading without saccadic eye movements. *Vision Research*, 32(5), 895–901.

</details>

## Themes

Twelve themes and a custom accent, left on coral on charcoal by default.

<p align="center">
  <img src="assets/readme/mobile-dark.png" alt="Chunky on a phone in the dark theme" width="38%">
  &nbsp;&nbsp;&nbsp;
  <img src="assets/readme/mobile-light.png" alt="Chunky on a phone in the light theme" width="38%">
</p>

## Run it

There's no build step here, just do:

```sh
git clone https://github.com/Abhinav-Prabhakar/Chunky.git
cd Chunky
python3 -m http.server 4173
```

Then open <http://127.0.0.1:4173>. Or just use the
[live build](https://abhinav-prabhakar.github.io/Chunky/).

<p align="center">
  <kbd>space</kbd> start / pause &nbsp;
  <kbd>←</kbd> <kbd>→</kbd> speed &nbsp;
  <kbd>↑</kbd> <kbd>↓</kbd> chunk size &nbsp;
  <kbd>b</kbd> peek &nbsp;
  <kbd>r</kbd> restart &nbsp;
  <kbd>t</kbd> theme &nbsp;
  <kbd>f</kbd> fullscreen &nbsp;
  <kbd>?</kbd> all shortcuts
</p>

<p align="center">
  <br>
  <a href="https://abhinav-prabhakar.github.io/Chunky/"><b>Try it live →</b></a><br>
  <sub>No setup, no sign-up, works offline. If it makes you faster, star the repo.</sub>
</p>
