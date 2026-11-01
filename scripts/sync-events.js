/* ==========================================================================
   GNMBC EVENTS SNAPSHOT SYNC

   Writes the current one-off calendar events into events-data.js so the site
   has a FALLBACK copy if the live fetch (api/events.js) ever fails.

   This is no longer the main way events reach the site. The live path is
   api/events.js, which reads the calendar on every visit. This script just
   keeps the committed snapshot reasonably fresh (weekly, via
   .github/workflows/sync-events.yml, committed straight to main; there is no
   pull request or approval step anymore).

   All filtering and tagging rules live in lib/calendar-events.js. Do not
   add event logic here; change it there so the live path stays in step.

   Requires env var CHURCH_CALENDAR_ICS_URL (the calendar's private secret
   iCal address). Never commit that value. It lives as a GitHub Actions
   secret and as a Vercel environment variable.
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const { fetchCalendarEvents } = require("../lib/calendar-events");

const EVENTS_FILE = path.join(__dirname, "..", "events-data.js");

/* ---------- Load existing events-data.js and keep only the manual entries ---------- */
function loadManual() {
  const raw = fs.readFileSync(EVENTS_FILE, "utf8");
  const match = raw.match(/const\s+GNMBC_EVENTS\s*=\s*(\[[\s\S]*?\])\s*;/);
  if (!match) throw new Error("Could not find GNMBC_EVENTS array in " + EVENTS_FILE);
  // The array is plain data literals (strings, arrays, booleans), no
  // functions, no external references, so evaluating it directly is safe
  // in this controlled, repo-owned file.
  const arr = new Function("return " + match[1])();
  // A missing source field is treated as manual (safe default) so older
  // hand-edits are never destroyed.
  return arr.filter((e) => e.source !== "calendar");
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
                 "calendar" (owned by the calendar sync; regenerated on every
                 run, do not hand-edit these entries)

   HOW EVENTS REACH THE SITE NOW:
   The page loads this file first, then asks /api/events for the LIVE
   calendar (see api/events.js). When the live call works, the "calendar"
   entries below are replaced on screen by the live ones. When it fails,
   the entries below are what visitors see. The weekly GitHub Action
   (.github/workflows/sync-events.yml) refreshes this snapshot and commits
   it straight to main. Add real, flyer-backed events above the CALENDAR
   marker with source: "manual".
   ========================================================================== */

const GNMBC_EVENTS = [

  /* ---------- MANUAL: hand-curated, flyer-backed events ---------- */
`;

  const manualBlock = manualEvents.map((e) => serializeEvent(e, 2)).join(",\n\n");

  const middle = `

  /* ---------- CALENDAR: weekly snapshot of the church calendar, do not hand-edit ---------- */
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

  const manual = loadManual();
  const rawCalendarEvents = await fetchCalendarEvents(icsUrl);

  // A manual, flyer-backed entry always wins over an id collision with a
  // freshly-fetched calendar entry, so the same event never renders twice.
  const manualIds = new Set(manual.map((e) => e.id));
  const skippedDupes = rawCalendarEvents.filter((e) => manualIds.has(e.id));
  const calendarEvents = rawCalendarEvents.filter((e) => !manualIds.has(e.id));

  fs.writeFileSync(EVENTS_FILE, buildFile(manual, calendarEvents), "utf8");

  console.log(`Snapshot: ${calendarEvents.length} one-off calendar event(s), kept ${manual.length} manual event(s).`);
  if (skippedDupes.length) {
    console.log(`Skipped ${skippedDupes.length} calendar event(s) that collided with an existing manual id:`);
    for (const e of skippedDupes) console.log(`  - ${e.date} ${e.title}`);
  }
}

main().catch((err) => {
  console.error("Sync failed:", err.message);
  process.exit(1);
});
