# Editing my portfolio

This is a plain HTML, CSS, and JavaScript website. No React, build step, or npm command is required to run it.

## Run in VS Code

1. Open the **John-Cale-Portfolio** folder in VS Code.
2. Select **Terminal → New Terminal**.
3. Run:

```sh
python3 -m http.server 5512 --bind 127.0.0.1
```

4. Open http://127.0.0.1:5512 in your browser. Keep the terminal running.
5. Save edits in VS Code, then refresh the browser. Press Control+C in the terminal to stop the server.

If port 5512 is already being used, use 5513 and open http://127.0.0.1:5513 instead.

Project videos may not play in Safari when you preview with this command; they play normally once the site is on GitHub Pages.

## Which file do I edit?

| File | Purpose |
| --- | --- |
| `index.html` | Page text, sections, project cards, skills, contact details, and mascot drawing. |
| `styles.css` | Base styles for the page, project dialogs, navigation, and the project video player. |
| `editorial.css` | Current visual design: typography, colors, layout refinements, responsive rules, and mascot animation. Loaded after styles.css, so matching rules here take priority. |
| `app.js` | Theme switching, mobile menu, project preview content, the video player and its steps, and mascot replay. |
| `assets/` | Photos, screenshots, icons, certificates, and self-hosted fonts. |
| `assets/videos/` | Each project's walkthrough video in two formats, `.hevc.mp4` (HEVC, which Safari needs) and `.mp4` (H.264, for browsers without HEVC), plus a poster image (`.jpg`). These are generated; don't edit them by hand. |
| `tools/make_videos.py` | Builds the project videos from the screenshots in `assets/projects/` and the recordings in `tools/recordings/`. Not loaded by the website. |
| `tools/recordings/` | Real screen recordings of mAIstra (its web interface, run through the team's test harness) and Bulk Buying (its sample-data web build), with the Playwright scripts that made them. About 28 MB; not loaded by the website. |

The font `.ttf` files are assets, not code to edit. The `OFL.txt` files contain their open-source licenses. Keep them with the fonts.

## Common edits

- **Change my introduction:** in index.html, search for `hero-description`.
- **Change skills:** search for `Technical skills` in index.html.
- **Change a project card:** search for its name in index.html.
- **Change its full preview:** search for its name in app.js under `projectTemplates`.
- **Change a project video:** edit that project's steps (screens, taps, captions, timing) in `tools/make_videos.py`, then run `python3 tools/make_videos.py hydro` (or `bulk`, `maistra`, `openear`, `mesh`, `ml`, `fitsync`). It needs a Mac (it uses Apple's HEVC encoder), Python with Pillow and NumPy, and ffmpeg. Paste the `video: { ... }` entry it prints over the old one in app.js, so the step buttons match the new video.
- **Change colors:** search for `--bg` and `data-theme` in editorial.css. There are separate light and dark values.
- **Change fonts:** search for `Editorial typography` near the end of editorial.css.
- **Change the mascot:** search for `name-mascot` in index.html; animation rules start at the comment about the gripping mascot in editorial.css. To speed up or slow down the entrance, change `--grab`, `--pull` and `--pull-time` at the top of those rules; the hop and wave follow automatically. `--sit` sets when it sits down with its laptop and starts typing.
- **Change the mascot's welcome message:** search for `mascot-bubble` in index.html and edit the two lines inside it. Its look and timing are under `.mascot-bubble` in editorial.css.

JavaScript is still needed for interactive previews and buttons. It cannot be replaced by HTML or CSS without losing those features.

## Sharing on GitHub Pages

This remains a static website. Upload the contents of this folder to the root of my MLD-cmd.github.io repository, including assets and .nojekyll. The public site address stays https://mld-cmd.github.io/ when GitHub Pages is enabled.
