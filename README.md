# John Cale Nombrado — Portfolio

An editable copy of my latest portfolio. This is a static HTML, CSS, and JavaScript website; no npm install or build step is required.

## Open in VS Code

1. Open Visual Studio Code.
2. Choose **File → Open Folder…**.
3. Select **Desktop → John-Cale-Portfolio**, then click **Open**.
4. If VS Code asks about workspace trust, review the folder and trust it if you recognize these files.

## Run locally on my Mac

In VS Code choose **Terminal → New Terminal**, then run:

```sh
cd "$HOME/Desktop/John-Cale-Portfolio"
python3 -m http.server 5501 --bind 127.0.0.1
```

Keep that terminal running. Open this address in a browser:

http://127.0.0.1:5501/

After saving changes, refresh the browser. If an old version persists, use Command + Shift + R.
To stop the local server, click its terminal and press **Control + C**.
If port 5501 is busy, use 5502 in the command and browser address instead.
Project videos may not play in Safari when you preview with this command; they play normally once the site is on GitHub Pages.

## What to edit

- `index.html`: landing text, sections, skill lists, and project cards.
- `styles.css`: base styles, dialogs, and the project video player.
- `editorial.css`: the current portfolio layout, spacing, typography, and responsive refinements.
- `app.js`: project descriptions, video steps, and video player behavior.
- `assets/`: project screenshots and videos, toolkit icons, fonts, and certificate files.
- `tools/`: rebuilds the project videos; see EDITING-GUIDE.md.

## Optional: Live Server

If the VS Code Live Server extension is already installed, right-click `index.html` and select **Open with Live Server**. Its address and port may differ from the Python command above. Use either server method.

## Publishing

Running locally does not publish changes. This folder is an editable snapshot without Git history; my existing GitHub-connected folder remains separate at `Desktop/MLD-cmd.github.io-upload`. Do not expect edits in one folder to automatically appear in the other.
