import { GROUPS, CHANNELS } from "./data/channels.js";
import { synthesiseDay, nowAndNext } from "./data/schedule.js";

// ---------------------------------------------------------------------------
// Data layer
//
// For each channel we build today's programme list. If data/guide.json has
// real listings for that channel id, we use those; otherwise we synthesise a
// believable schedule so the "On now / Up next" view is always populated.
// ---------------------------------------------------------------------------

const state = {
  realData: {},      // channelId -> [{ title, desc, start, stop }]
  programmes: {},    // channelId -> [{ title, desc, start, stop }] (resolved)
  usingRealData: false,
};

async function loadRealData() {
  try {
    const res = await fetch("./data/guide.json", { cache: "no-store" });
    if (!res.ok) return;
    const json = await res.json();
    const channels = json.channels || {};
    for (const [id, list] of Object.entries(channels)) {
      if (!Array.isArray(list) || list.length === 0) continue;
      state.realData[id] = list
        .map((p) => ({
          title: p.title,
          desc: p.desc || p.description || "",
          start: new Date(p.start),
          stop: new Date(p.stop || p.end),
        }))
        .filter((p) => !isNaN(p.start) && !isNaN(p.stop))
        .sort((a, b) => a.start - b.start);
    }
    if (Object.keys(state.realData).length > 0) state.usingRealData = true;
  } catch (err) {
    // Offline / file:// without a server — fall back to synthetic data silently.
    console.info("No real EPG data loaded; using synthesised schedule.", err);
  }
}

function programmesFor(channel) {
  const real = state.realData[channel.id];
  if (real && real.length) return real;
  if (!state.programmes[channel.id]) {
    state.programmes[channel.id] = synthesiseDay(channel);
  }
  return state.programmes[channel.id];
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

const timeFmt = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const fullTimeFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function fmtTime(d) {
  return timeFmt.format(d);
}

function initials(name) {
  const cleaned = name.replace(/\bHD\b/g, "").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

function buildChannelCard(channel) {
  const card = el("article", "channel-card");
  card.dataset.channelId = channel.id;
  card.dataset.search = (channel.name + " " + channel.group).toLowerCase();

  // Header: logo chip + name
  const header = el("div", "channel-head");
  const logo = el("div", "logo", initials(channel.name));
  logo.style.background = channel.color;
  const nameWrap = el("div", "channel-meta");
  nameWrap.appendChild(el("div", "channel-name", channel.name));
  nameWrap.appendChild(el("div", "channel-group", channel.group));
  header.appendChild(logo);
  header.appendChild(nameWrap);
  card.appendChild(header);

  // Slots filled in by refresh()
  const body = el("div", "slots");
  body.appendChild(el("div", "slot now"));
  body.appendChild(el("div", "slot next"));
  card.appendChild(body);

  return card;
}

function renderNowSlot(slot, prog, at) {
  slot.innerHTML = "";
  slot.classList.add("now");
  if (!prog) {
    slot.appendChild(el("div", "slot-label", "ON NOW"));
    slot.appendChild(el("div", "slot-title muted", "No listing"));
    return;
  }
  slot.appendChild(el("div", "slot-label", "ON NOW"));
  slot.appendChild(el("div", "slot-title", prog.title));

  const meta = el("div", "slot-meta");
  meta.appendChild(el("span", "slot-time", `${fmtTime(prog.start)} – ${fmtTime(prog.stop)}`));
  const total = prog.stop - prog.start;
  const elapsed = Math.min(Math.max(at - prog.start, 0), total);
  const remaining = Math.round((total - elapsed) / 60000);
  meta.appendChild(el("span", "slot-remaining", remaining > 0 ? `${remaining} min left` : "ending"));
  slot.appendChild(meta);

  const bar = el("div", "progress");
  const fill = el("div", "progress-fill");
  fill.style.width = `${(elapsed / total) * 100}%`;
  bar.appendChild(fill);
  slot.appendChild(bar);

  if (prog.desc) slot.appendChild(el("div", "slot-desc", prog.desc));
}

function renderNextSlot(slot, prog) {
  slot.innerHTML = "";
  slot.classList.add("next");
  slot.appendChild(el("div", "slot-label", "UP NEXT"));
  if (!prog) {
    slot.appendChild(el("div", "slot-title muted", "—"));
    return;
  }
  slot.appendChild(el("div", "slot-title", prog.title));
  const meta = el("div", "slot-meta");
  meta.appendChild(el("span", "slot-time", fmtTime(prog.start)));
  slot.appendChild(meta);
}

function buildLayout() {
  const main = document.getElementById("guide");
  main.innerHTML = "";
  for (const group of GROUPS) {
    const section = el("section", "group");
    section.id = "group-" + group.genre;

    const heading = el("h2", "group-title", group.title);
    section.appendChild(heading);

    const grid = el("div", "channel-grid");
    for (const ch of group.channels) {
      grid.appendChild(buildChannelCard({ ...ch, genre: group.genre, group: group.title }));
    }
    section.appendChild(grid);
    main.appendChild(section);
  }
}

function refresh() {
  const at = new Date();
  for (const channel of CHANNELS) {
    const card = document.querySelector(`[data-channel-id="${channel.id}"]`);
    if (!card) continue;
    const progs = programmesFor(channel);
    const { now, next } = nowAndNext(progs, at);
    renderNowSlot(card.querySelector(".slot.now"), now, at);
    renderNextSlot(card.querySelector(".slot.next"), next);
  }
  updateClock(at);
}

// ---------------------------------------------------------------------------
// Header: clock, data source badge, search
// ---------------------------------------------------------------------------

function updateClock(at = new Date()) {
  const clock = document.getElementById("clock");
  if (clock) clock.textContent = fullTimeFmt.format(at);
}

function setSourceBadge() {
  const badge = document.getElementById("source-badge");
  if (!badge) return;
  if (state.usingRealData) {
    badge.textContent = "Live EPG";
    badge.classList.add("live");
  } else {
    badge.textContent = "Demo listings";
    badge.classList.remove("live");
  }
}

function wireSearch() {
  const input = document.getElementById("search");
  if (!input) return;
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    let anyVisibleInGroup;
    for (const group of GROUPS) {
      const section = document.getElementById("group-" + group.genre);
      anyVisibleInGroup = false;
      section.querySelectorAll(".channel-card").forEach((card) => {
        const match = !q || card.dataset.search.includes(q);
        card.style.display = match ? "" : "none";
        if (match) anyVisibleInGroup = true;
      });
      section.style.display = anyVisibleInGroup ? "" : "none";
    }
  });
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

async function init() {
  buildLayout();
  wireSearch();
  await loadRealData();
  setSourceBadge();
  refresh();
  // Re-render every 30s so progress bars and now/next stay accurate.
  setInterval(refresh, 30 * 1000);
}

init();
