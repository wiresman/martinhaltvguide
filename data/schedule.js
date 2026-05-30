// Synthetic schedule generator.
//
// Real EPG data is optional (see data/guide.json + the GitHub Actions pipeline).
// When a channel has no real listings, we synthesise a believable day of
// programmes so the "On now / Up next" view always looks live and correct.
//
// The generator is deterministic for a given (channelId, dateKey) pair, so the
// schedule is stable across page reloads on the same day but refreshes daily.

// --- tiny seeded RNG (mulberry32) ----------------------------------------
function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- programme pools by genre --------------------------------------------
// Each entry: [title, short description, typical duration in minutes]
const POOLS = {
  uk: [
    ["BBC News", "The latest national and international stories.", 30],
    ["Breakfast", "The day's news, sport and weather.", 90],
    ["Morning Live", "Topical magazine with the day's talking points.", 60],
    ["Bargain Hunt", "Two teams hunt for antiques bargains.", 45],
    ["Homes Under the Hammer", "Buying properties at auction.", 60],
    ["The One Show", "Topical magazine with celebrity guests.", 30],
    ["EastEnders", "Drama from London's East End.", 30],
    ["Casualty", "Drama set in an emergency department.", 50],
    ["Question Time", "Topical debate from around the country.", 60],
    ["The Repair Shop", "Restoring treasured family heirlooms.", 45],
    ["Antiques Roadshow", "Experts value hidden treasures.", 60],
    ["Match of the Day", "Highlights and analysis from the day's games.", 75],
    ["News at Ten", "The day's main news stories.", 30],
    ["Gardeners' World", "Seasonal advice from the garden.", 45],
    ["Mastermind", "The classic quiz of specialist subjects.", 30],
    ["Pointless", "The quiz where the lowest score wins.", 45],
    ["A Place in the Sun", "House-hunting in the sunshine.", 60],
  ],
  kids: [
    ["Bluey", "The Heeler family go on adventures.", 15],
    ["Hey Duggee", "The Squirrel Club earn their badges.", 10],
    ["Peppa Pig", "Peppa and her family have fun.", 10],
    ["PAW Patrol", "A pack of pups on rescue missions.", 25],
    ["Octonauts", "Undersea explorers protect ocean life.", 15],
    ["Numberblocks", "Counting and number fun.", 10],
    ["SpongeBob SquarePants", "Adventures under the sea.", 25],
    ["Teen Titans Go!", "Superhero teens cause chaos.", 15],
    ["The Loud House", "Life with ten sisters.", 25],
    ["Mickey Mouse Clubhouse", "Solving puzzles with Mickey.", 25],
    ["Bing", "Everyday adventures with Bing.", 10],
    ["Gigglebiz", "Sketches and silliness for little ones.", 15],
    ["Andy's Adventures", "Exploring the natural world.", 20],
    ["Ben 10", "A boy with an alien-powered watch.", 25],
  ],
  factual: [
    ["World News Now", "Rolling coverage of breaking stories.", 30],
    ["The Newsroom", "In-depth analysis of the day's events.", 60],
    ["Market Wrap", "The latest from the financial markets.", 60],
    ["Gold Rush", "Miners chase fortunes in the wild.", 60],
    ["How It's Made", "The manufacturing behind everyday objects.", 30],
    ["Wicked Tuna", "Fishermen compete for the biggest catch.", 60],
    ["Air Crash Investigation", "Experts uncover the truth behind disasters.", 60],
    ["Wild Africa", "The continent's most spectacular wildlife.", 60],
    ["Drain the Oceans", "Revealing what lies beneath the waves.", 60],
    ["Border Security", "On the front line at the airport.", 30],
    ["90 Day Fiance", "Couples race against the visa clock.", 60],
    ["Say Yes to the Dress", "Brides hunt for the perfect gown.", 30],
    ["Mighty Trains", "Epic rail journeys around the world.", 60],
    ["Cosmos", "A journey through space and time.", 60],
    ["Inside the Markets", "Business news and analysis.", 30],
  ],
  entertainment: [
    ["Movie: The Bourne Identity", "An amnesiac agent uncovers his past.", 120],
    ["Movie: Jurassic Park", "A theme park's dinosaurs run wild.", 130],
    ["Movie: Die Hard", "A cop battles thieves in a tower block.", 130],
    ["Movie: The Martian", "An astronaut is stranded on Mars.", 140],
    ["The Walking Dead", "Survivors face a world of the undead.", 60],
    ["Breaking Bad", "A teacher turns to the criminal world.", 60],
    ["NCIS", "Naval crimes investigated by a special team.", 60],
    ["Law & Order", "Detectives and prosecutors seek justice.", 60],
    ["Brooklyn Nine-Nine", "Comedy in a New York precinct.", 30],
    ["Modern Family", "The ups and downs of a blended family.", 30],
    ["Keeping Up with the Kardashians", "Reality with the famous family.", 60],
    ["Star Trek", "The crew explores the final frontier.", 60],
    ["Doctor Who", "Time-travelling adventures across the universe.", 50],
    ["MTV Chart Show", "The week's biggest music videos.", 60],
    ["Live Music Special", "A full-length concert performance.", 90],
    ["Movie: Inception", "A thief enters dreams to plant an idea.", 140],
  ],
};

// Programme that fills the small hours, per genre.
const OVERNIGHT = {
  uk: ["Overnight News", "Rolling news through the night."],
  kids: ["Bedtime Stories", "Gentle tales to drift off to."],
  factual: ["Through the Night", "Documentaries until morning."],
  entertainment: ["Teleshopping", "Overnight shopping showcase."],
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Build a full day (midnight -> midnight, plus a little overrun) of programmes
// for one channel. Deterministic for a given channel + date.
export function synthesiseDay(channel, day = new Date()) {
  const seed = hashString(channel.id + "|" + dateKey(day));
  const rand = mulberry32(seed);
  const pool = POOLS[channel.genre] || POOLS.entertainment;

  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  let cursor = start.getTime();
  const endOfRun = start.getTime() + DAY_MS + 3 * 60 * 60 * 1000; // run 3h past midnight

  const items = [];
  let lastIndex = -1;
  while (cursor < endOfRun) {
    const hour = new Date(cursor).getHours();
    let title, desc, mins;

    if (hour >= 1 && hour < 6) {
      // small hours: a single long overnight block
      [title, desc] = OVERNIGHT[channel.genre] || OVERNIGHT.entertainment;
      mins = 30 + Math.floor(rand() * 4) * 30; // 30-120 min blocks
    } else {
      let idx = Math.floor(rand() * pool.length);
      if (idx === lastIndex) idx = (idx + 1) % pool.length; // avoid back-to-back repeats
      lastIndex = idx;
      const entry = pool[idx];
      title = entry[0];
      desc = entry[1];
      // jitter the typical duration a little, snapped to 5-minute steps
      const jitter = Math.round((rand() - 0.5) * 2) * 5;
      mins = Math.max(10, entry[2] + jitter);
    }

    const stop = cursor + mins * 60 * 1000;
    items.push({
      title,
      desc,
      start: new Date(cursor),
      stop: new Date(stop),
    });
    cursor = stop;
  }
  return items;
}

// Find the programme on now and the one up next within a list of programmes.
export function nowAndNext(programmes, at = new Date()) {
  const t = at.getTime();
  let now = null;
  let next = null;
  for (let i = 0; i < programmes.length; i++) {
    const p = programmes[i];
    if (p.start.getTime() <= t && t < p.stop.getTime()) {
      now = p;
      next = programmes[i + 1] || null;
      break;
    }
  }
  if (!now) {
    next = programmes.find((p) => p.start.getTime() > t) || null;
  }
  return { now, next };
}
