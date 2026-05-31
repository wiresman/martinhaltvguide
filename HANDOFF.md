# Session handoff — TV guide scrapers

This note exists so a **fresh Claude Code web session** can pick up exactly where
the previous one stopped. The previous session was blocked: its container had no
outbound internet (GitHub-only network policy), so it could not load the real TV
listings sites needed to build/verify scrapers.

## Why a new session is needed
The environment's network policy is read **once, when the container boots**.
Changing the policy mid-session has no effect on the running container. The owner
has updated the policy to allow general internet, so a **newly started session**
will boot a container that can reach the listings sites.

**First thing to do in the new session:** confirm internet works.
```
Test internet: fetch https://example.com and report the HTTP status.
```
If that returns 200, you're good. If it's still 403, the policy didn't take
effect — re-check the environment's network access setting at
https://code.claude.com/docs/en/claude-code-on-the-web.

## Where the work lives
- Active feature branch: `claude/tv-guide-current-next-bVyul`
- Open draft PR for it: **#4 — "Wire up Sky One to real Sky Max listings"**
- This handoff note is on its own branch/PR (additive only; no code changes).

## What's already done
- Apple-style "Now & Next" guide UI (`index.html`, `app.js`, `styles.css`).
- EPG pipeline that runs in **GitHub Actions** (not the sandbox):
  `.github/workflows/epg.yml` runs the iptv-org/epg grabber over `channels.xml`,
  then `scripts/xmltv-to-guide.mjs` converts XMLTV → `data/guide.json`.
- **17 channels verified-wired** to real free UK feeds (freeview.co.uk + EE TV):
  BBC One/Two/News, ITV, ITV4, Channel 4, Channel 5, Sky News, Sky One→Sky Max,
  CBeebies, CBBC, Nick Jr, Nickelodeon, Cartoon Network, Discovery, TLC, MTV.
- `channels.xml` and `data/channels.js` are consistent (17 ↔ 17 epgIds, no
  mismatches). Each `site_id` was taken from the grabber's own committed catalog.

## What's NOT done (the next job)
Wire up the remaining ~23 channels that currently fall back to the synthetic demo
schedule because no free UK source was found for them:
Disney Junior, Disney Channel, BabyTV, CNN, Al Jazeera, CNBC, Bloomberg,
National Geographic, Nat Geo Wild, Travel, E!, AMC, AMC Break, AXN (HD/Movies/
White), Syfy, Star (Channel/Movies/Crime/Comedy), Hollywood, MTV Live.

With real internet, the next session should:
1. Confirm internet (above).
2. Load the candidate listings sites (tvguide.co.uk, and the grabber's `sites/`
   catalogs) to find real `site_id`s for the channels above — UK and US.
3. Add verified lines to `channels.xml` and matching `epgId`s in
   `data/channels.js`. Keep the two files 1:1.
4. Do NOT fabricate site_ids — only use ids confirmed against a real catalog/grab.
5. Push to `claude/tv-guide-current-next-bVyul`; that updates PR #4.
6. Remind the owner to run **Actions → Update EPG data → Run workflow** after
   merge so `data/guide.json` repopulates.

## Key files
| File | Purpose |
|------|---------|
| `channels.xml` | Grabber input: one `<channel>` per wired channel. |
| `data/channels.js` | UI channel list; `epgId` must match `xmltv_id` in channels.xml. |
| `scripts/xmltv-to-guide.mjs` | XMLTV → `data/guide.json` converter. |
| `.github/workflows/epg.yml` | Runs the grab in Actions (has internet; sandbox doesn't). |
| `data/guide.json` | Generated listings; empty in repo, filled by the workflow. |
