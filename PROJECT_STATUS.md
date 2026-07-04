# GNMBC Website Rebuild -- Project Status

Last updated: July 4, 2026 (session 4 updates below)

## Session 4 updates (July 4, 2026)
- Pastor Morrison replied to the outstanding gifting/bulletin questions (email, 7/3/26):
  - Printed bulletins: confirmed the church does NOT do weekly printed
    bulletins; he makes them verbally off the calendar. No site change
    needed, nothing to build here.
  - Give page platforms confirmed: keep Realm (already primary), keep
    Cash App, ADD Zelle, REMOVE PayPal and Venmo. give.html updated:
    Venmo/PayPal QR cards deleted, Zelle QR card added, qr-grid now
    2-column, admin banner updated to reflect the confirmed platform
    list. STILL OPEN: Cash App handle ($GoodNewsMBC) is a placeholder,
    and Zelle handle (phone or email) has not been given yet -- both
    still needed before the QR codes can be real.
  - Virtual-connect info added to index.html: pastor pointed to the
    evergreen "You're Invited" flyer's phone/video info and said the
    home page could use it too. Added a Worship by Phone / Worship
    Online row to the home page schedule card (matches visit.html) plus
    a "Join Online" button, hyperlinked to
    https://join.freeconferencecall.com/goodnewsmbc.
  - Pastor also offered to send a flyer for upcoming events and more
    photos. Not yet received; when it arrives, feed it into the flyer
    extraction pipeline (still not built, see Session 3 notes) and/or
    drop new photos into images/.

## Session 3 updates (July 1, 2026, later)
- EVENTS ARE NOW DATA-DRIVEN with auto-expiry. Three pieces:
  - events-data.js (repo root): one object per event, the ONLY file that
    changes when an event is added. Real events only; all fake/sample
    events were deleted per Mike.
  - js/events.js: renderer. Future dates = upcoming (soonest becomes the
    featured Next Up card; if the event has a flyer, the flyer IS the
    featured image). Past dates move to the "Recently at Good News"
    flyer wall automatically and fall off after 180 days
    (PAST_WINDOW_DAYS). Empty upcoming = friendly "join us Sunday" state.
  - events.html + index.html render from containers (#featured-slot,
    #events-list, #flyer-wall, #home-events).
- "Add to Calendar" buttons generate real Google Calendar template links.
- Removed per Mike: Live from Google Sheets pill, the fake "This Summer"
  events, the Google Calendar / iCal subscribe section.
- Hero ribbon: dots removed, items centered, symmetric 3-column layout.
- Real flyer images are in images/flyers/ (Mike replaced the placeholders).
- GOTCHA (tooling, not site): use var-style or bash-side writes for JS
  files; a truncated sync once broke js/events.js silently. Also
  events-data.js must stay a plain script (const is fine; renderer reads
  it via typeof, not window.*).
- NEXT UP: the flyer extraction pipeline (email/bulletin -> events-data.js
  entry + flyer image), then hosting/DNS cutover.

## Session 2 updates (July 1, 2026)
- SOURCE OF TRUTH: the church's evergreen "You're Invited" Facebook flyer.
  Extracted facts applied sitewide:
  - Sunday Worship is 10:00 AM (site previously said 10:30). Fixed on
    index, about, events, visit. variant2.html NOT fixed (archived draft).
  - Remote attendance added to visit.html schedule: Worship by Phone
    (Wed & Sun, dial 313-209-8800, ID 209-835-6156) and Worship Online
    (Sundays, join.freeconferencecall.com/goodnewsmbc)
  - Give link corrected to https://onrealm.org/GoodNews/Give (was the
    longer /-/form/give/now path)
- EVENTS DIRECTION DECIDED: flyers are the data source, not Google
  Calendar and not an admin page. The church already makes a flyer per
  event and posts it to Facebook. Pipeline plan (not yet built):
  A) Facebook feed embed as announcement wall (zero new habits), plus
  B) flyer extraction: AI reads flyer image, extracts date/time/place,
     dated flyers become event cards, evergreen flyers become
     standing-info diffs flagged to Mike, low confidence never
     auto-publishes
- events.html now has a "Recently at Good News" flyer wall section with
  two real past events: Women's Sunday (May 31, 2026, 10 AM, speakers
  Mother Haskins / Onawu Pickett / Valerie Ford, 2 Cor 5:7) and Pastor &
  Wife 8th Appreciation (May 17, 2026, 3 PM, guest Rev. Dr. Roger Tyler,
  Progressive M.B.C., Psalm 37:23)
- ACTION FOR MIKE: the flyer images in images/flyers/ are generated
  placeholders. Save the real flyers from Facebook over them, keeping
  the exact filenames:
  - images/flyers/womens-sunday-2026-05-31.jpg
  - images/flyers/pastor-appreciation-2026-05-17.jpg
- Still true: the 6 upcoming event cards on events.html and 3 on
  index.html are SAMPLE data. The "Live from Google Sheets" pill on
  events.html is cosmetic and outdated (plan is flyers now); remove or
  reword it before launch.
- Open question for pastor: does Noon Prayer (Wed 12 PM) and Tue Choir
  7 PM still happen? Evergreen flyer doesn't mention them; kept on site.

## What this is
Rebuild of goodnewsmbc.org for Good News Missionary Baptist Church (Tracy, CA).
Static HTML/CSS site in this repo, replacing the GoDaddy Website Builder site.
Design system: Fraunces + Inter, oxblood/navy/cream palette, shared styles.css.

## Core architecture decision
The site is a stable shell nobody has to touch. The pastor's team updates only
two things they already use: Facebook (news, photos, live video) and Google
Calendar (events). The site pulls from those automatically. Core pages (visit,
give, about, ministries) change maybe once a year.

## Pages
- index.html, about.html, ministries.html, events.html, visit.html, give.html
- variant2.html is an old design draft, not part of the live set
- images/ holds all local assets including hero-praise.jpg (localized from GoDaddy CDN)

## Done (July 1, 2026 session)
1. Mobile hamburger nav added to all 6 pages (styles.css had a half-built
   .menu-toggle; completed it, inline onclick toggles .nav-links.open)
2. Mobile hero fixed: schedule strip no longer clips the second CTA
   (hero goes flex-column on mobile, strip position relative, margin-top auto)
3. Hero image localized to images/hero-praise.jpg (was hotlinked to
   img1.wsimg.com, would have broken when GoDaddy is cancelled)
4. Contact form on visit.html now works via mailto to contact@goodnewsmbc.org
   (interim; upgrade to Formspree free tier for in-page submits)
5. Stale June 15 event replaced on events.html (featured card now Women's
   Conference Jul 12) and index.html (card now Youth Service Day Jul 19)
6. All fixes verified with Playwright mobile screenshots (390px)

## On hold / waiting on
- CALENDAR INTEGRATION: on hold. Mike first wants to see what the pastor's
  team actually uses (Google Calendar vs Sheets vs something else) so the
  pipeline matches their real habits with zero extra steps. The events page
  still has hard-coded cards and a cosmetic "Live from Google Sheets" pill.
  Remove or wire that pill before launch.
- Facebook integration: direction discussed, not built. Decision: NO Meta
  Graph API (token maintenance trap). Use free Facebook Page Plugin embed or
  a widget service (Elfsight/EmbedSocial). FB page: facebook.com/GNMBCTracy77
  (must stay a public Page for embeds to work).
- Better photography: current photos are low-res holdovers from the old site.
  Biggest visual upgrade available. Ask church for recent FB photos or one
  Sunday phone shoot.
- Give page QR codes: placeholders. Need confirmed Cash App / Venmo / PayPal
  handles from Pastor Morrison (see yellow admin banner on give.html).
- Hosting: plan is free GitHub Pages or Netlify, point goodnewsmbc.org DNS,
  drop the GoDaddy builder. Not started.
- Admin banners: yellow "for Mike's eyes only" banners on events.html and
  give.html must be removed before launch.

## Known facts
- Live site: GoDaddy Website Builder, goodnewsmbc.org
- Service times: Sunday School 9 AM, Worship 10:30 AM, Tue Choir 7 PM,
  Wed Prayer 12 PM, Wed Bible Study 7 PM
- Address: 77 West 1st Street, Tracy, CA 95376
- Founded Dec 7, 1947, oldest African-American church in Tracy
- Pastor: Tyrone L. Morrison II, installed March 2018
- Church updates Facebook more reliably than the website; that behavior is
  the anchor for the whole content strategy

## Repo notes
- Git repo, last commit "Full-width section subheadlines". The July 1 fixes
  are uncommitted; commit them as a checkpoint.
