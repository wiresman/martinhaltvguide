# martinhaltvguide

A clean, Apple-style **TV guide** that shows, for each channel, **what's on now**
(with start/end times and a live progress bar) and **what's up next**.

It's a plain static site — no build step, no server — so it runs straight from a
browser and hosts for free on **GitHub Pages**.

## What it looks like

- Channels grouped exactly as requested: **UK / English TV**, **Kids**,
  **News / Factual**, **Entertainment / Films**.
- Each channel is a card with an **ON NOW** panel (title, time range, minutes
  left, progress bar) and an **UP NEXT** panel (title + start time).
- A live clock, channel search, light/dark mode, and a responsive grid.

## Listings data

There's no single free, official API covering this exact mix of channels, so the
app has two modes:

1. **Demo listings (default).** When no real data is present, the app
   synthesises a believable full day of programmes per channel, anchored to the
   real current time. "On now / Up next" therefore always looks live and
   correct. Great for seeing the design immediately.
2. **Live EPG.** When `data/guide.json` contains real listings for a channel,
   those are used instead (the badge in the header switches to **Live EPG**).
   Channels with no real data keep using the demo schedule, so the guide is
   never empty.

The header badge tells you which mode is active.

### Turning on real (free) data

This uses the open-source [`iptv-org/epg`](https://github.com/iptv-org/epg)
grabber, run for free on a schedule via **GitHub Actions**:

1. **Map your channels.** Edit [`channels.xml`](channels.xml). For each channel
   fill in the `site` and `site_id` from the iptv-org database
   (browse at <https://iptv-org.github.io/>; supported sites are listed at
   <https://github.com/iptv-org/epg/tree/master/sites>). The `xmltv_id` must
   match the `epgId` of the channel in [`data/channels.js`](data/channels.js).
   To wire up channels beyond the UK ones, add an `epgId` to them in
   `data/channels.js` and a matching line in `channels.xml`.
2. **Run the workflow.** Go to the repo's **Actions** tab → *Update EPG data* →
   *Run workflow*. It grabs listings, converts them with
   [`scripts/xmltv-to-guide.mjs`](scripts/xmltv-to-guide.mjs), and commits
   `data/guide.json`.
3. **Automate it.** Once you're happy with the output, uncomment the `schedule:`
   block in [`.github/workflows/epg.yml`](.github/workflows/epg.yml) to refresh
   daily.

> Coverage depends on which channels have a working public source in iptv-org.
> Some channels (e.g. regional AXN/Star feeds) may not, and will stay on demo
> listings — that's expected.

You can also convert an XMLTV file you already have:

```bash
node scripts/xmltv-to-guide.mjs path/to/guide.xml data/guide.json
```

## Running it locally

Because it uses ES modules and `fetch`, open it through a local web server
rather than `file://`:

```bash
# from the repo root
python3 -m http.server 8000
# then visit http://localhost:8000
```

(The demo schedule still works on `file://`; only `data/guide.json` loading
needs a server.)

## Hosting free on GitHub Pages

1. Repo **Settings → Pages**.
2. **Source:** *Deploy from a branch*, branch `main`, folder `/ (root)`.
3. Save. Your guide goes live at `https://<user>.github.io/martinhaltvguide/`.

## Project layout

```
index.html                  markup + header
styles.css                  Apple-style theme (light/dark)
app.js                      data layer + rendering + live refresh
data/channels.js            channel list, groups, brand colours, epg ids
data/schedule.js            synthetic schedule generator + now/next logic
data/guide.json             real listings (filled by the pipeline)
channels.xml                channel map for the iptv-org grabber
scripts/xmltv-to-guide.mjs  XMLTV -> guide.json converter
.github/workflows/epg.yml   free scheduled data refresh
```
