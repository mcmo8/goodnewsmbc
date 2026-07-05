/* ==========================================================================
   GNMBC EVENTS CALENDAR SYNC

   Pulls one-off (non-recurring) events from the church's private "Secret
   address in iCal format" calendar feed and merges them into events-data.js.

   Design decisions (read before changing behavior):

   1. Recurring events (anything with an RRULE — Sunday service, Wednesday
      Bible study, weekly choir rehearsal, etc.) are intentionally SKIPPED.
      Those are the standing weekly schedule already shown on the home page
      and visit.html. This script only manages one-off happenings (a
      meeting, a joint service, a fellowship breakfast). Adding recurring
      items here would flood the home page's "next 3 events" preview with
      the same weekly entries every run.

   2. Every event object in events-data.js carries a `source` field:
        source: "manual"    -> hand-curated (flyer, real description). Never
                                touched or removed by this script.
        source: "calendar"  -> owned by this script. Fully regenerated each
                                run from the live feed, so anything that
                                fell off the calendar (cancelled, past its
                                trailing window) is dropped automatically.
      Any entry missing a `source` field is treated as manual (safe default)
      so hand-edits made before this field existed are never destroyed.

   3. This script does NOT push to git. It only rewrites events-data.js on
      disk. The GitHub Actions workflow (.github/workflows/sync-events.yml)
      is responsible for opening a pull request with the diff so a human
      reviews auto-tagged events (especially anything tagged "needs-review")
      before they go live.

   4. All display dates/times are computed in America/Los_Angeles explicitly
      via Intl.DateTimeFormat, never via Date.getHours()/getDate()/etc.
      Those methods return the RUNNING PROCESS's local time zone, which is
      UTC on GitHub's hosted runners, not Pacific. Using them directly
      caused every synced event to display 7 hours ahead of the real time
      (confirmed: Mt. Carmel Prayer Breakfast synced as 4:00 PM instead of
      9:00 AM, the exact UTC-to-PDT offset). Do not reintroduce raw
      getHours()/getDate() calls on event start times.

   Requires env var CHURCH_CALENDAR_ICS_URL (the calendar's private secret
   iCal address — never commit this value, it's stored as a GitHub Actions
   secret).
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const ical = require("node-ical");

const EVENTS_FILE = path.join(__dirname, "..", "events-data.js");
const LOOKAHEAD_DAYS = 180;   // how far into the future to pull one-off events
const PAST_TRAIL_DAYS = 30;   // how long a passed auto-synced event lingers before pruning
const EVENT_TIMEZONE = "America/Los_Angeles"; // the church's actual timezone, not the runner's

const DEFAULT_LOCATION = "Good News MBC";
const DEFAULT_DESCRIPTION = "Details to be confirmed. Contact the church office for more information.";

/* Ordered tag-guessing rules. First match wins. Most specific ministries
   first, the broad "worship/meeting" catch-all last. */
const TAG_RULES = [
  { re: /\bwomen'?s\b|\bwmu\b/i, tag: "womens", category: "Women's Ministry" },
  { re: /\bmen'?s\b/i, tag: "mens", category: "Men's Ministry" },
  { re: /\byouth\b|\bteen\b|\bchildren'?s\b|\bkids\b/i, tag: "youth", category: "Youth" },
  { re: /\boutreach\b|\bfellowship\b|\bbreakfast\b|\bjoint\b|\bcommunity\b/i, tag: "outreach", category: "Fellowship" },
  { re: /\bworship\b|\bservice\b|\brevival\b|\bconference\b|\bmeeting\b|\bbusiness\b/i, tag: "worship", category: "Worship" },
];

function guessTagAndCategory(title) {
  for (const rule of TAG_RULES) {
    if (rule.re.test(title)) return { tag: rule.tag, category: rule.category };
  }
  return { tag: "needs-review", category: "Uncategorized" };
}

function slugify(str) {
  return String(str)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/* Reads year/month/day/hour/minute for a Date instant AS SEEN in
   EVENT_TIMEZONE, regardless of what time zone the running process is in. */
function getZonedParts(d) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: EVENT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = {};
  for (const p of fmt.formatToParts(d)) parts[p.type] = p.value;
  // Some Intl implementations report midnight as hour "24" under hour12:false.
  const hour = parts.hour === "24" ? 0 : Number(parts.hour);
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour,
    minute: Number(parts.minute),
  };
}

function dateOnly(d) {
  const p = getZonedParts(d);
  return p.year + "-" + String(p.month).padStart(2, "0") + "-" + String(p.day).padStart(2, "0");
}

function format12h(d) {
  const p = getZonedParts(d);
  let h = p.hour;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return h + ":" + String(p.minute).padStart(2, "0") + " " + ampm;
}

function cleanText(s) {
  return String(s).replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
}

/* A stable per-day boundary marker for window math, anchored to noon UTC on
   the given Pacific calendar date. Noon UTC always falls safely inside that
   Pacific day (Pacific-day UTC bounds are roughly 07:00-07:00 or 08:00-08:00
   depending on DST), so this is immune to the runner's local time zone and
   to DST edge cases, while staying simple day-granularity arithmetic. */
function pacificCalendarDayAnchor(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

/* ---------- Load existing events-data.js and split manual vs. calendar-owned ---------- */
function loadExisting() {
  const raw = fs.readFileSync(EVENTS_FILE, "utf8");
  const match = raw.match(/const\s+GNMBC_EVENTS\s*=\s*(\[[\s\S]*?\])\s*;/);
  if (!match) throw new Error("Could not find GNMBC_EVENTS array in " + EVENTS_FILE);
  // The array is plain data literals (strings, arrays, booleans) — no
  // functions, no external references — so evaluating it directly is safe
  // in this controlled, repo-owned file.
  const arr = new Function("return " + match[1])();
  const manual = arr.filter((e) => e.source !== "calendar");
  return manual;
}

/* ---------- Fetch and filter the live calendar feed ---------- */
async function fetchCalendarEvents(icsUrl) {
  const data = await ical.async.fromURL(icsUrl);

  const todayParts = getZonedParts(new Date());
  const today = pacificCalendarDayAnchor(todayParts.year, todayParts.month, todayParts.day);
  const windowStart = new Date(today.getTime() - PAST_TRAIL_DAYS * 86400000);
  const windowEnd = new Date(today.getTime() + LOOKAHEAD_DAYS * 86400000);

  const results = [];
  for (const key of Object.keys(data)) {
    const ev = data[key];
    if (ev.type !== "VEVENT") continue;
    if (ev.rrule) continue; // recurring weekly services — deliberately skipped, see header
    if (!ev.start) continue;
    const start = new Date(ev.start);
    if (start < windowStart || start > windowEnd) continue;

    const title = ev.summary ? cleanText(ev.summary) : "Untitled Event";
    const dateStr = dateOnly(start);
    const isAllDay = ev.datetype === "date";
    const { tag, category } = guessTagAndCategory(title);

    results.push({
      id: slugify(title) + "-" + dateStr,
      title,
      date: dateStr,
      time: isAllDay ? "" : format12h(start),
      location: ev.location ? cleanText(ev.location) : DEFAULT_LOCATION,
      category,
      tags: [tag],
      description: ev.description ? cleanText(ev.description) : DEFAULT_DESCRIPTION,
      flyer: "",
      // Public-facing note left blank on purpose: "auto-synced" language is
      // an internal review cue, not something a visitor needs to see. The
      // needs-review signal lives in the tags array and the PR body instead,
      // so nothing is lost by leaving this off the live card.
      note: "",
      sample: false,
      source: "calendar",
    });
  }
  return results;
}

/* ---------- Serialize back to events-data.js ---------- */
function serializeEvent(e, indent) {
  const pad = " ".repeat(indent);
  const pad2 = " ".repeat(indent + 2);
  const lines = [
    pad + "{",
    pad2 + "id: " + JSON.stringify(e.id) + ",",
    pad2 + "title: " + JSON.stringify(e.title) + ",",
    pad2 + "date: " + JSON.stringify(e.date) + ",",
    pad2 + "time: " + JSON.stringify(e.time) + ",",
    pad2 + "location: " + JSON.stringify(e.location) + ",",
    pad2 + "category: " + JSON.stringify(e.category) + ",",
    pad2 + "tags: " + JSON.stringify(e.tags) + ",",
    pad2 + "description: " + JSON.stringify(e.description) + ",",
    pad2 + "flyer: " + JSON.stringify(e.flyer) + ",",
    pad2 + "note: " + JSON.stringify(e.note) + ",",
    pad2 + "sample: " + JSON.stringify(!!e.sample) + ",",
    pad2 + "source: " + JSON.stringify(e.source || "manual"),
    pad + "}",
  ];
  return lines.join("\n");
}

function buildFile(manualEvents, calendarEvents) {
  calendarEvents.sort((a, b) => a.date.localeCompare(b.date));

  const header = `/* ==========================================================================
   GNMBC EVENTS DATA
   One object per event.

   Fields:
     id          unique slug
     title       event name as it appears on the card
     date        YYYY-MM-DD (drives sorting and auto-expiry)
     time        display string like "10:00 AM" (blank = all day)
     location    display string
     category    display label shown above the title
     tags        array for the filter pills: worship, youth, womens, mens, outreach
     description one or two sentences for the card
     flyer       path to flyer image in images/flyers/ (blank = no image)
     note        small caption on the card (optional)
     sample      true = demo data; hidden when SHOW_SAMPLES=false in js/events.js
     source      "manual" (hand-curated, never touched by the sync script) or
                 "calendar" (owned by scripts/sync-events.js — regenerated
                 on every run, do not hand-edit these entries, edits will be
                 overwritten the next time the sync runs)

   The "calendar" section below is rebuilt automatically by the weekly
   GitHub Action (.github/workflows/sync-events.yml), which opens a pull
   request for review rather than pushing straight to main. Add real,
   flyer-backed events above the CALENDAR marker with source: "manual".
   ========================================================================== */

const GNMBC_EVENTS = [

  /* ---------- MANUAL: hand-curated, flyer-backed events ---------- */
`;

  const manualBlock = manualEvents.map((e) => serializeEvent(e, 2)).join(",\n\n");

  const middle = `

  /* ---------- CALENDAR: auto-synced by scripts/sync-events.js, do not hand-edit ---------- */
`;

  const calendarBlock = calendarEvents.length
    ? calendarEvents.map((e) => serializeEvent(e, 2)).join(",\n\n")
    : "  // (no upcoming one-off calendar events in the current sync window)";

  const footer = `

];
`;

  return header + manualBlock + (manualEvents.length && calendarEvents.length ? ",\n" : "\n") + middle + calendarBlock + footer;
}

async function main() {
  const icsUrl = process.env.CHURCH_CALENDAR_ICS_URL;
  if (!icsUrl) {
    console.error("CHURCH_CALENDAR_ICS_URL is not set. Add it as a GitHub Actions secret (see PROJECT_STATUS.md).");
    process.exit(1);
  }

  const manual = loadExisting();
  const rawCalendarEvents = await fetchCalendarEvents(icsUrl);

  // Belt-and-suspenders: a manual, flyer-backed entry always wins over an
  // id collision with a freshly-fetched calendar entry, so the same event
  // never renders as two duplicate tiles.
  const manualIds = new Set(manual.map((e) => e.id));
  const skippedDupes = rawCalendarEvents.filter((e) => manualIds.has(e.id));
  const calendarEvents = rawCalendarEvents.filter((e) => !manualIds.has(e.id));

  const needsReview = calendarEvents.filter((e) => e.tags.includes("needs-review"));

  fs.writeFileSync(EVENTS_FILE, buildFile(manual, calendarEvents), "utf8");

  console.log(`Synced ${calendarEvents.length} one-off calendar event(s), kept ${manual.length} manual event(s).`);
  if (skippedDupes.length) {
    console.log(`Skipped ${skippedDupes.length} calendar event(s) that collided with an existing manual id:`);
    for (const e of skippedDupes) console.log(`  - ${e.date} ${e.title}`);
  }
  if (needsReview.length) {
    console.log(`\n${needsReview.length} event(s) need a human to verify category/details:`);
    for (const e of needsReview) console.log(`  - ${e.date} ${e.title}`);
  }
}

main().catch((err) => {
  console.error("Sync failed:", err.message);
  process.exit(1);
});
