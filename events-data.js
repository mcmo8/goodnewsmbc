/* ==========================================================================
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

   The "calendar" section is rebuilt automatically by the weekly GitHub
   Action (.github/workflows/sync-events.yml), which opens a pull request
   for review rather than pushing straight to main. Add real, flyer-backed
   events with source: "manual" so the sync script never touches them.
   ========================================================================== */

const GNMBC_EVENTS = [

  /* ---------- MANUAL: hand-curated, flyer-backed events ---------- */
  {
    id: "womens-sunday-2026-05-31",
    title: "Women's Sunday",
    date: "2026-05-31",
    time: "10:00 AM",
    location: "Sanctuary",
    category: "Women's Ministry · Worship",
    tags: ["womens", "worship"],
    description: "\"For we walk by faith and not by sight\" (2 Corinthians 5:7). Guest speakers Mother Haskins, Onawu Pickett, and Valerie Ford brought the Word as our women led worship.",
    flyer: "images/flyers/womens-sunday-2026-05-31.jpg",
    note: "",
    sample: false,
    source: "manual"
  },
  {
    id: "pastor-appreciation-2026-05-17",
    title: "Pastor & Wife 8th Appreciation Service",
    date: "2026-05-17",
    time: "3:00 PM",
    location: "Sanctuary",
    category: "Special Service",
    tags: ["worship"],
    description: "\"A Pastor whose steps are ordered by the Lord\" (Psalm 37:23). Eight years of Pastor Tyrone Morrison II and First Lady Doretha Morrison, with guest speaker Rev. Dr. Roger Tyler of Progressive M.B.C.",
    flyer: "images/flyers/pastor-appreciation-2026-05-17.jpg",
    note: "",
    sample: false,
    source: "manual"
  }

  /* ---------- CALENDAR: auto-synced by scripts/sync-events.js, do not hand-edit ----------
     Empty until the first sync runs. Trigger it manually from the repo's
     Actions tab (Sync Events from Calendar -> Run workflow) once the
     CHURCH_CALENDAR_ICS_URL secret is in place, rather than waiting for
     the weekly schedule. */

];
