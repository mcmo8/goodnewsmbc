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

   The "calendar" section below is rebuilt automatically by the weekly
   GitHub Action (.github/workflows/sync-events.yml), which opens a pull
   request for review rather than pushing straight to main. Add real,
   flyer-backed events above the CALENDAR marker with source: "manual".
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
    tags: ["womens","worship"],
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
  },


  /* ---------- CALENDAR: auto-synced by scripts/sync-events.js, do not hand-edit ---------- */
  {
    id: "outing-fellowship-baptist-church-2026-10-11",
    title: "Outing - Fellowship Baptist Church",
    date: "2026-10-11",
    time: "3:00 PM",
    location: "Fellowship Baptist Church",
    category: "Fellowship",
    tags: ["outreach"],
    description: "Details to be confirmed. Contact the church office for more information.",
    flyer: "",
    note: "",
    sample: false,
    source: "calendar"
  },

  {
    id: "church-meeting-2026-10-31",
    title: "Church Meeting",
    date: "2026-10-31",
    time: "10:00 AM",
    location: "Good News MBC",
    category: "Worship",
    tags: ["worship"],
    description: "Details to be confirmed. Contact the church office for more information.",
    flyer: "",
    note: "",
    sample: false,
    source: "calendar"
  },

  {
    id: "outing-fellowship-baptist-church-2026-11-14",
    title: "Outing - Fellowship Baptist Church",
    date: "2026-11-14",
    time: "3:00 PM",
    location: "Fellowship Baptist Church",
    category: "Fellowship",
    tags: ["outreach"],
    description: "Details to be confirmed. Contact the church office for more information.",
    flyer: "",
    note: "",
    sample: false,
    source: "calendar"
  },

  {
    id: "wedding-2026-11-21",
    title: "Wedding ???",
    date: "2026-11-21",
    time: "12:00 PM",
    location: "Good News MBC",
    category: "Uncategorized",
    tags: ["needs-review"],
    description: "Details to be confirmed. Contact the church office for more information.",
    flyer: "",
    note: "",
    sample: false,
    source: "calendar"
  }

];
