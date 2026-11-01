/* ==========================================================================
   GNMBC LIVE EVENTS ENDPOINT  (Vercel serverless function)

   URL: /api/events

   This is the live path. The browser (js/events.js) calls this on every
   page load. It reads the church's Google Calendar feed right now, turns it
   into the same event objects events-data.js uses, and returns them as JSON.

   Why this exists: it removes the approval step. The pastor adds an event
   to the GoodNews MBC Calendar and it is on the site within about an hour,
   with nobody clicking anything.

   Caching: Vercel's edge keeps a copy for CACHE_SECONDS, then refreshes it
   in the background while still serving the old copy (stale-while-
   revalidate). So Google is asked at most about once per hour, and a
   short Google hiccup never shows visitors an error.

   Setup: the calendar's private "secret address in iCal format" must be set
   as the Vercel environment variable CHURCH_CALENDAR_ICS_URL (Production and
   Preview). Never commit that value.

   Response shape:
     { ok: true,  updatedAt: "2026-11-01T17:00:00.000Z", events: [ ... ] }
     { ok: false, error: "short reason" }     (HTTP 500 or 502)
   ========================================================================== */

const { fetchCalendarEvents } = require("../lib/calendar-events");

const CACHE_SECONDS = 3600;            // 1 hour before the edge re-asks Google
const STALE_SECONDS = 7 * 24 * 3600;   // keep serving the last good copy up to a week if Google is down

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");

  const icsUrl = process.env.CHURCH_CALENDAR_ICS_URL;
  if (!icsUrl) {
    res.setHeader("Cache-Control", "no-store");
    res.status(500).end(JSON.stringify({ ok: false, error: "CHURCH_CALENDAR_ICS_URL is not configured on Vercel." }));
    return;
  }

  try {
    const events = await fetchCalendarEvents(icsUrl);
    res.setHeader("Cache-Control", `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${STALE_SECONDS}`);
    res.status(200).end(JSON.stringify({ ok: true, updatedAt: new Date().toISOString(), events }));
  } catch (err) {
    // Do not cache failures; the browser falls back to the snapshot in events-data.js.
    res.setHeader("Cache-Control", "no-store");
    res.status(502).end(JSON.stringify({ ok: false, error: "Could not read the church calendar feed." }));
  }
};
