/* ==========================================================================
   GNMBC EVENTS DATA
   One object per event. This is the only file that changes when an event
   is added. The flyer pipeline will append entries here automatically.

   Fields:
     id          unique slug (used for the flyer filename convention)
     title       event name as it appears on the card
     date        YYYY-MM-DD (drives sorting and auto-expiry)
     time        display string like "10:00 AM" (blank = all day)
     location    display string
     category    display label shown above the title
     tags        array for the filter pills: worship, youth, womens, mens, outreach
     description one or two sentences for the card
     flyer       path to flyer image in images/flyers/ (blank = no image)
     note        small caption on the card, like "RSVP appreciated" (optional)
     sample      true = demo data; hidden when SHOW_SAMPLES=false in js/events.js

   Sample entries were removed Jul 1, 2026. Only real church events go here.
   ========================================================================== */

const GNMBC_EVENTS = [

  /* ---------- REAL EVENTS (from church Facebook flyers) ---------- */
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
    sample: false
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
    sample: false
  }

];

