#!/usr/bin/env node
// Convert an XMLTV file (as produced by iptv-org/epg) into the compact
// data/guide.json that the site reads.
//
// Usage:
//   node scripts/xmltv-to-guide.mjs <input.xml> [output.json]
//
// Channels in the XMLTV are matched to our site channels by the `epgId`
// field declared in data/channels.js. Channels with no epgId, or with no
// matching XMLTV data, are simply left out — the site synthesises those.

import { readFileSync, writeFileSync } from "node:fs";
import { CHANNELS } from "../data/channels.js";

const [, , inPath, outPath = "data/guide.json"] = process.argv;
if (!inPath) {
  console.error("Usage: node scripts/xmltv-to-guide.mjs <input.xml> [output.json]");
  process.exit(1);
}

// epgId -> our channel id
const epgToId = new Map();
for (const ch of CHANNELS) {
  if (ch.epgId) epgToId.set(ch.epgId, ch.id);
}

const xml = readFileSync(inPath, "utf8");

// Decode the handful of XML entities XMLTV uses.
function decode(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&amp;/g, "&");
}

// XMLTV time: "YYYYMMDDHHMMSS +ZZZZ" (offset optional) -> ISO string.
function parseTime(raw) {
  const m = raw
    .trim()
    .match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?\s*([+-]\d{4})?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s = "00", tz] = m;
  const offset = tz ? `${tz.slice(0, 3)}:${tz.slice(3)}` : "Z";
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}${offset}`).toISOString();
}

function firstTag(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? decode(m[1].trim()) : "";
}

const channels = {};
const programmeRe = /<programme\b([^>]*)>([\s\S]*?)<\/programme>/gi;
let match;
let count = 0;

while ((match = programmeRe.exec(xml)) !== null) {
  const attrs = match[1];
  const inner = match[2];

  const chMatch = attrs.match(/channel="([^"]+)"/);
  if (!chMatch) continue;
  const id = epgToId.get(chMatch[1]);
  if (!id) continue; // not a channel we display

  const startRaw = (attrs.match(/start="([^"]+)"/) || [])[1];
  const stopRaw = (attrs.match(/stop="([^"]+)"/) || [])[1];
  const start = startRaw && parseTime(startRaw);
  const stop = stopRaw && parseTime(stopRaw);
  if (!start || !stop) continue;

  const title = firstTag(inner, "title");
  if (!title) continue;
  const desc = firstTag(inner, "desc");

  (channels[id] ||= []).push({ title, desc, start, stop });
  count++;
}

// Sort each channel's programmes by start time.
for (const id of Object.keys(channels)) {
  channels[id].sort((a, b) => new Date(a.start) - new Date(b.start));
}

const out = {
  generated: new Date().toISOString(),
  note: "Generated from XMLTV by scripts/xmltv-to-guide.mjs.",
  channels,
};

writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
console.log(
  `Wrote ${outPath}: ${count} programmes across ${Object.keys(channels).length} channels.`
);
