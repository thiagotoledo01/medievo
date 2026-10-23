<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- The game is plain HTML/CSS/JS in `public/` (index.html, css/, js/, assets/, icons/); the owner refuses React for the game. `/` only redirects to `/index.html`.
- Online multiplayer uses Firebase Realtime Database (owner's choice) from `public/js/online.js`; the web config is served by `src/routes/api/public/firebase-config.ts` from project secrets.
- Bump `VERSAO` in `public/sw.js` whenever game files change so installed apps update.
