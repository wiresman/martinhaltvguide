// Channel definitions, grouped exactly as requested.
//
// Each channel has:
//   id    - stable slug used to key listings + seed synthetic data
//   name  - display name
//   color - brand-ish colour for the logo chip (Apple-style gradient base)
//   epgId - (optional) id used to attach real listings from data/guide.json.
//           Only set on channels that have a VERIFIED free source in the
//           iptv-org/epg grabber's bundled channel catalog (freeview.co.uk or
//           player.ee.co.uk). Channels without an epgId are always synthesised.
//           The epgId here must match the xmltv_id in channels.xml.
//
// The `genre` on each group drives the pool of plausible programme titles
// used by the synthetic schedule generator (see data/schedule.js).

export const GROUPS = [
  {
    title: 'UK / English TV',
    genre: 'uk',
    channels: [
      { id: 'bbc-one',     name: 'BBC One',     color: '#d4001f', epgId: 'BBCOne.uk' },
      { id: 'bbc-two',     name: 'BBC Two',     color: '#0a3d62', epgId: 'BBCTwo.uk' },
      { id: 'bbc-news',    name: 'BBC News 24', color: '#bb1919', epgId: 'BBCNews.uk' },
      { id: 'itv',         name: 'ITV',         color: '#e7af00', epgId: 'ITV1.uk' },
      { id: 'itv4',        name: 'ITV4',        color: '#1b9e4b', epgId: 'ITV4.uk' },
      { id: 'channel-4',   name: 'Channel 4',   color: '#1a1a1a', epgId: 'Channel4.uk' },
      { id: 'five-hd',     name: '5 HD',        color: '#7b2ff7', epgId: 'Channel5.uk' },
      { id: 'sky-news',    name: 'Sky News',    color: '#c8102e', epgId: 'SkyNews.uk' },
      // Sky One / Sky Showcase: no verified free source -> synthesised.
      { id: 'sky-one',     name: 'Sky One',     color: '#0072c6' },
    ],
  },
  {
    title: 'Kids',
    genre: 'kids',
    channels: [
      { id: 'cbeebies',        name: 'CBeebies',        color: '#f59f00', epgId: 'CBeebies.uk' },
      { id: 'cbbc',            name: 'CBBC',            color: '#00b894', epgId: 'CBBC.uk' },
      // Disney Junior / Disney Channel: no verified free source -> synthesised.
      { id: 'disney-junior',   name: 'Disney Junior',   color: '#e84393' },
      { id: 'disney-channel',  name: 'Disney Channel',  color: '#2d3fe0' },
      { id: 'nick-jr',         name: 'Nick Jr',         color: '#ff7b00', epgId: 'NickJr.uk' },
      { id: 'nickelodeon',     name: 'Nickelodeon',     color: '#ff6a00', epgId: 'Nickelodeon.uk' },
      { id: 'cartoon-network', name: 'Cartoon Network', color: '#111111', epgId: 'CartoonNetwork.uk' },
      // BabyTV: no verified free source -> synthesised.
      { id: 'baby-tv',         name: 'BabyTV',          color: '#ff5ca8' },
    ],
  },
  {
    title: 'News / Factual',
    genre: 'factual',
    channels: [
      // CNN / Al Jazeera / CNBC / Bloomberg: no verified free source -> synthesised.
      { id: 'cnn',          name: 'CNN',                 color: '#cc0000' },
      { id: 'al-jazeera',   name: 'Al Jazeera',          color: '#fdb913' },
      { id: 'cnbc',         name: 'CNBC',                color: '#005594' },
      { id: 'bloomberg',    name: 'Bloomberg Television', color: '#1a1a2e' },
      { id: 'discovery-hd', name: 'Discovery HD',        color: '#0072ce', epgId: 'Discovery.uk' },
      // Nat Geo / Nat Geo Wild / Travel: no verified free source -> synthesised.
      { id: 'natgeo-hd',    name: 'National Geographic HD', color: '#ffcc00' },
      { id: 'natgeo-wild',  name: 'Nat Geo Wild HD',     color: '#1e824c' },
      { id: 'travel-hd',    name: 'Travel Channel HD',   color: '#00a3a3' },
      { id: 'tlc',          name: 'TLC',                 color: '#e6007e', epgId: 'TLC.uk' },
    ],
  },
  {
    title: 'Entertainment / Films',
    genre: 'entertainment',
    channels: [
      // The film/entertainment channels below have no verified free UK source in
      // the iptv-org grabber, so they are synthesised. Only MTV is wired up.
      { id: 'e-hd',          name: 'E! HD',         color: '#e4002b' },
      { id: 'amc',           name: 'AMC',           color: '#1a1a1a' },
      { id: 'amc-break',     name: 'AMC Break',     color: '#444444' },
      { id: 'axn-hd',        name: 'AXN HD',        color: '#111111' },
      { id: 'axn-movies',    name: 'AXN Movies HD', color: '#7a1f1f' },
      { id: 'axn-white',     name: 'AXN White HD',  color: '#6b6b6b' },
      { id: 'syfy',          name: 'Syfy',          color: '#6f2da8' },
      { id: 'star-channel',  name: 'Star Channel',  color: '#0a2540' },
      { id: 'star-movies',   name: 'Star Movies',   color: '#102a52' },
      { id: 'star-crime',    name: 'Star Crime',    color: '#3a0d0d' },
      { id: 'star-comedy',   name: 'Star Comedy',   color: '#d39e00' },
      { id: 'hollywood',     name: 'Hollywood',     color: '#b8860b' },
      { id: 'mtv',           name: 'MTV',           color: '#ee1d52', epgId: 'MTV.uk' },
      { id: 'mtv-live',      name: 'MTV Live',      color: '#9b1d52' },
    ],
  },
];

// Flat lookup of every channel, in display order.
export const CHANNELS = GROUPS.flatMap((g) =>
  g.channels.map((c) => ({ ...c, genre: g.genre, group: g.title }))
);
