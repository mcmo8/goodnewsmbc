/* ==========================================================================
   GNMBC CALENDAR EVENTS (shared logic)

   One place that knows how to turn the church's Google Calendar feed into
   the event objects the site renders. Used by two callers:

     api/events.js            -> the LIVE path. Runs on Vercel every time a
                                 visitor loads the site (cached for a short
                                 while), so a calendar change shows up on the
                                 site within about an hour, no approval step.
     scripts/sync-events.js   -> the SNAPSHOT path. Runs weekly on GitHub and
                                 writes the same events into events-data.js
                                 as a fallback, so the site still shows
                                 something sensible if the live fetch fails.

   Keep ALL filtering and tagging rules here so the two paths can never
   disagree about what an event looks like.

   Design decisions (read before changing behavior):

   1. Recurring events (anything with an RRULE: Sunday service, Wednesday
      Bible study, weekly choir rehearsal) are intentionally SKIPPED. Those
      are the standing weekly schedule already shown on the home page and
      visit.html. This only manages one-off happenings.

   2. Every event carries a `source` field. "manual" entries live in
      events-data.js, are flyer-backed and hand-written, and are never
      touched here. "calendar" entries are fully owned by this logic.

   3. All display dates/times are computed in America/Los_Angeles explicitly
      via Intl.DateTimeFormat, never via Date.getHours()/getDate(). Those
      return the RUNNING PROCESS's time zone, which is UTC on GitHub runners
      and on Vercel, and once shifted every event 7 hours ahead.

   4. Unmatched titles used to get category "Uncategorized" and a
      needs-review tag meant for a human reviewer. There is no reviewer in
      the loop anymore, so they now get the neutral, visitor-friendly label
      "Church Event" and a plain "general" tag (shows under the All pill).
   ========================================================================== */

const ical = require("node-ical");

const LOOKAHEAD_DAYS = 180;   // how far into the future to pull one-off events
const PAST_TRAIL_DAYS = 30;   // how long a passed calendar event lingers before dropping
const EVENT_TIMEZONE = "America/Los_Angeles";

const DEFAULT_LOCATION = "Good News MBC";
const DEFAULT_DESCRIPTION = "Call or email the church office for details.";

/* Ordered tag-guessing rules. First match wins. Most specific ministries
   first, the broad "worship/meeting" catch-all last. */
const TAG_RULES = [
  { re: /\bwomen'?s\b|\bwmu\b/i, tag: "womens", category: "Women's Ministry" },
  { re: /\bmen'?s\b/i, tag: "mens", category: "Men's Ministry" },
  { re: /\byouth\b|\bteen\b|\bchildren'?s\b|\bkids\b/i, tag: "youth", category: "Youth" },
  { re: /\boutreach\b|\bfellowship\b|\bbreakfast\b|\bjoint\b|\bcommunity\b|\bouting\b/i, tag: "outreach", category: "Fellowship" },
  { re: /\bworship\b|\bservice\b|\brevival\b|\bconference\b|\bmeeting\b|\bbusiness\b|\banniversary\b|\bappreciation\b/i, tag: "worship", category: "Worship" },
];

function guessTagAndCategory(title) {
  for (const rule of TAG_RULES) {
    if (rule.re.test(title)) return { tag: rule.tag, category: rule.category };
  }
  return { tag: "general", category: "Church Event" };
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
   Pacific day, so this is immune to the process time zone and DST edges. */
function pacificCalendarDayAnchor(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

/* Turn already-parsed node-ical data into site event objects. */
function eventsFromIcalData(data, now) {
  const todayParts = getZonedParts(now || new Date());
  const today = pacificCalendarDayAnchor(todayParts.year, todayParts.month, todayParts.day);
  const windowStart = new Date(today.getTime() - PAST_TRAIL_DAYS * 86400000);
  const windowEnd = new Date(today.getTime() + LOOKAHEAD_DAYS * 86400000);

  const results = [];
  for (const key of Object.keys(data)) {
    const ev = data[key];
    if (ev.type !== "VEVENT") continue;
    if (ev.rrule) continue; // recurring weekly services, deliberately skipped
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
      note: "",
      sample: false,
      source: "calendar",
    });
  }
  results.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  return results;
}

/* Fetch the private iCal feed and return site event objects. */
async function fetchCalendarEvents(icsUrl, now) {
  const data = await ical.async.fromURL(icsUrl);
  return eventsFromIcalData(data, now);
}

module.exports = {
  LOOKAHEAD_DAYS,
  PAST_TRAIL_DAYS,
  EVENT_TIMEZONE,
  TAG_RULES,
  guessTagAndCategory,
  slugify,
  getZonedParts,
  dateOnly,
  format12h,
  cleanText,
  eventsFromIcalData,
  fetchCalendarEvents,
};
