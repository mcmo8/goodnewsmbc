/* ==========================================================================
   GNMBC EVENT RENDERER
   Reads GNMBC_EVENTS from events-data.js. No server, no rebuilds:
   - events dated today or later render as upcoming (soonest is featured)
   - events in the past move to the flyer wall automatically
   - past events fall off entirely after PAST_WINDOW_DAYS
   ========================================================================== */
(function () {
  var SHOW_SAMPLES = true;      /* set to false to hide all sample:true events for launch */
  var PAST_WINDOW_DAYS = 180;   /* past events disappear from the wall after this many days */

  var MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  var DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

  var today = new Date(); today.setHours(0, 0, 0, 0);

  function parseDate(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function mon3(d) { return MONTHS[d.getMonth()].slice(0, 3); }
  function longDate(d) { return DAYS[d.getDay()] + ", " + MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear(); }
  function shortDate(d) { return DAYS[d.getDay()] + ", " + MONTHS[d.getMonth()].slice(0, 3) + " " + d.getDate(); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function gcalLink(e) {
    var d = parseDate(e.date), datesParam;
    var m = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(e.time || "");
    if (m) {
      var h = (+m[1] % 12) + (/pm/i.test(m[3]) ? 12 : 0);
      var start = new Date(d); start.setHours(h, +m[2]);
      var end = new Date(start.getTime() + 90 * 60000);
      var fmt = function (t) { return "" + t.getFullYear() + pad(t.getMonth() + 1) + pad(t.getDate()) + "T" + pad(t.getHours()) + pad(t.getMinutes()) + "00"; };
      datesParam = fmt(start) + "/" + fmt(end);
    } else {
      var next = new Date(d.getTime() + 86400000);
      var fd = function (t) { return "" + t.getFullYear() + pad(t.getMonth() + 1) + pad(t.getDate()); };
      datesParam = fd(d) + "/" + fd(next);
    }
    return "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      "&text=" + encodeURIComponent(e.title + " · Good News MBC") +
      "&dates=" + datesParam +
      "&location=" + encodeURIComponent("Good News Missionary Baptist Church, 77 West 1st Street, Tracy, CA 95376") +
      "&details=" + encodeURIComponent(e.description || "");
  }

  var all = (typeof GNMBC_EVENTS !== "undefined" ? GNMBC_EVENTS : []).filter(function (e) { return SHOW_SAMPLES || !e.sample; });
  var upcoming = all
    .filter(function (e) { return parseDate(e.date) >= today; })
    .sort(function (a, b) { return parseDate(a.date) - parseDate(b.date); });
  var past = all
    .filter(function (e) {
      var d = parseDate(e.date);
      return d < today && (today - d) / 86400000 <= PAST_WINDOW_DAYS;
    })
    .sort(function (a, b) { return parseDate(b.date) - parseDate(a.date); });

  function sampleChip(e) {
    return e.sample
      ? ' <span style="display:inline-block;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;background:#FEF3C7;color:#92400E;border:1px solid #F59E0B;border-radius:3px;padding:2px 6px;vertical-align:middle;">Sample</span>'
      : "";
  }

  /* ---------- Featured card (events page) ---------- */
  var featuredSlot = document.getElementById("featured-slot");
  if (featuredSlot && upcoming.length) {
    var f = upcoming[0], fdate = parseDate(f.date);
    /* if the event has a flyer, the flyer IS the left panel; otherwise decorative date block */
    var mediaHtml = f.flyer
      ? '<div class="featured-img" style="padding:0;position:relative;">' +
          '<img src="' + f.flyer + '" alt="' + f.title + ' flyer" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" />' +
          '<span class="featured-label" style="position:absolute;top:24px;left:24px;background:rgba(31,31,31,0.6);z-index:2;">Next Up</span>' +
        '</div>'
      : '<div class="featured-img"><span class="featured-label">Next Up</span>' +
          '<div><div class="featured-date">' + fdate.getDate() + '</div>' +
          '<div class="featured-date-sub">' + longDate(fdate) + '</div></div></div>';
    featuredSlot.innerHTML =
      '<div class="featured-card">' +
        mediaHtml +
        '<div class="featured-body">' +
          '<div class="featured-cat">' + f.category + sampleChip(f) + '</div>' +
          '<h2>' + f.title + '</h2>' +
          '<div class="featured-meta">' +
            '<div class="featured-meta-item">' + longDate(fdate) + '</div>' +
            '<div class="featured-meta-item">' + (f.time || "All day") + '</div>' +
            '<div class="featured-meta-item">' + (f.location || "Good News MBC") + '</div>' +
          '</div>' +
          '<p>' + f.description + '</p>' +
          '<a href="' + gcalLink(f) + '" target="_blank" class="btn btn-primary">Add to Calendar</a>' +
        '</div>' +
      '</div>';
  }

  /* ---------- Upcoming list + filter pills (events page) ---------- */
  var list = document.getElementById("events-list");
  function renderList(filter) {
    if (!list) return;
    if (!upcoming.length) {
      list.innerHTML =
        '<div style="grid-column:1/-1;background:linear-gradient(140deg, var(--navy) 0%, #16334F 55%, var(--oxblood-deep) 100%);border-radius:var(--radius);padding:10px;box-shadow:var(--shadow-md);">' +
          '<div style="border:1px solid rgba(226,200,135,0.5);border-radius:6px;text-align:center;padding:60px 28px;color:var(--cream);">' +
            '<span style="display:inline-block;font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:var(--gold-soft);border:1px solid rgba(226,200,135,0.4);border-radius:999px;padding:7px 18px;margin-bottom:26px;">You&rsquo;re Invited</span>' +
            '<h3 style="font-family:\'Fraunces\',serif;font-size:clamp(24px,3.4vw,34px);font-weight:600;line-height:1.3;margin-bottom:18px;color:var(--cream);">Nothing special is on the calendar right now.<br/>But church is never closed to you.</h3>' +
            '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#E2C887" stroke-width="1.6" style="margin:2px auto 18px;display:block;"><path d="M12 3v18M6 9h12"/></svg>' +
            '<p style="font-size:15px;color:rgba(250,246,238,0.85);max-width:520px;margin:0 auto 30px;line-height:1.7;">A place of hope. A people of faith. A purpose in love. Come as you are.</p>' +
            '<div style="display:flex;gap:36px;justify-content:center;flex-wrap:wrap;margin-bottom:34px;">' +
              '<div><div style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:var(--gold-soft);margin-bottom:5px;">Sunday</div><div style="font-weight:600;font-size:14.5px;">School 9:00 AM &nbsp;&middot;&nbsp; Worship 10:00 AM</div></div>' +
              '<div><div style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:var(--gold-soft);margin-bottom:5px;">Wednesday</div><div style="font-weight:600;font-size:14.5px;">Prayer 12:00 PM &nbsp;&middot;&nbsp; Bible Study 7:00 PM</div></div>' +
            '</div>' +
            '<a href="visit.html" class="btn btn-primary">Plan Your Visit</a>' +
          '</div>' +
        '</div>';
      return;
    }
    var items = (filter === "all")
      ? upcoming.slice(1)
      : upcoming.filter(function (e) { return (e.tags || []).indexOf(filter) >= 0; });
    if (!items.length) {
      list.innerHTML = '<div class="event-item" style="grid-column:1/-1;text-align:center;padding:34px;"><p class="event-desc">No upcoming events in this category yet. Check back soon.</p></div>';
      return;
    }
    list.innerHTML = items.map(function (e) {
      var d = parseDate(e.date);
      return '<article class="event-item">' +
        '<div class="event-top">' +
          '<div class="ev-date-block"><div class="m">' + mon3(d) + '</div><div class="d">' + pad(d.getDate()) + '</div></div>' +
          '<div><div class="ev-cat">' + e.category + sampleChip(e) + '</div>' +
          '<h3>' + e.title + '</h3>' +
          '<div class="event-meta">' + shortDate(d) + (e.time ? " · " + e.time : "") + (e.location ? " · " + e.location : "") + '</div></div>' +
        '</div>' +
        '<p class="event-desc">' + e.description + '</p>' +
        '<div class="event-actions">' +
          '<a href="' + gcalLink(e) + '" target="_blank" class="btn-ghost">Add to calendar</a>' +
          (e.note ? '<span style="font-size:11px;color:var(--muted);letter-spacing:0.08em;text-transform:uppercase;">' + e.note + '</span>' : "") +
        '</div></article>';
    }).join("");
  }
  renderList("all");

  var pills = document.querySelectorAll(".pill");
  Array.prototype.forEach.call(pills, function (p) {
    p.addEventListener("click", function () {
      Array.prototype.forEach.call(pills, function (x) { x.classList.remove("active"); });
      p.classList.add("active");
      renderList(p.getAttribute("data-cat") || "all");
    });
  });

  /* ---------- Past flyer wall (events page) ---------- */
  var wall = document.getElementById("flyer-wall");
  if (wall) {
    if (!past.length) {
      var ps = document.getElementById("past-section");
      if (ps) ps.style.display = "none";
    } else {
      wall.innerHTML = past.map(function (e) {
        var d = parseDate(e.date);
        return '<figure class="flyer-card">' +
          (e.flyer ? '<img src="' + e.flyer + '" alt="' + e.title + ' flyer" loading="lazy" />' : "") +
          '<figcaption><div class="ev-cat">' + e.category + sampleChip(e) + '</div>' +
          '<h3>' + e.title + '</h3>' +
          '<div class="event-meta">' + shortDate(d) + (e.time ? " · " + e.time : "") + (e.location ? " · " + e.location : "") + '</div>' +
          '<p>' + e.description + '</p></figcaption></figure>';
      }).join("");
    }
  }

  /* ---------- Home page: next three upcoming ---------- */
  var home = document.getElementById("home-events");
  if (home) {
    var cardStyle = "background: rgba(250,246,238,0.06); border-color: rgba(250,246,238,0.12); color: var(--cream);";
    if (!upcoming.length) {
      home.innerHTML =
        '<article class="card" style="grid-column:1/-1;background:rgba(250,246,238,0.05);border:1px solid rgba(226,200,135,0.35);color:var(--cream);"><div class="card-body" style="text-align:center;padding:44px 28px;">' +
        '<span style="display:inline-block;font-size:10px;letter-spacing:0.24em;text-transform:uppercase;color:var(--gold-soft);margin-bottom:14px;">You&rsquo;re Invited</span>' +
        '<h3 class="card-title" style="color: var(--cream);font-size:26px;">Join us this Sunday.</h3>' +
        '<p class="card-text" style="color: rgba(250,246,238,0.82);margin-top:8px;">Sunday School 9:00 AM &nbsp;&middot;&nbsp; Worship 10:00 AM &nbsp;&middot;&nbsp; 77 West 1st Street, Tracy</p>' +
        '</div></article>';
    } else {
      home.innerHTML = upcoming.slice(0, 3).map(function (e) {
        var d = parseDate(e.date);
        return '<article class="card" style="' + cardStyle + '"><div class="card-body">' +
          '<div style="display:inline-flex;flex-direction:column;align-items:center;background:var(--oxblood);color:var(--cream);padding:10px 16px;border-radius:var(--radius);margin-bottom:18px;">' +
            '<span style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">' + mon3(d) + '</span>' +
            '<span style="font-family:\'Fraunces\',serif;font-size:28px;font-weight:600;line-height:1;margin-top:2px;">' + d.getDate() + '</span></div>' +
          '<h3 class="card-title" style="color: var(--cream);">' + e.title + sampleChip(e) + '</h3>' +
          '<p style="font-size:13px;color:var(--gold-soft);margin-bottom:12px;">' + shortDate(d) + (e.time ? " · " + e.time : "") + (e.location ? " · " + e.location : "") + '</p>' +
          '<p class="card-text" style="color: rgba(250,246,238,0.78);">' + e.description + '</p>' +
          '</div></article>';
      }).join("");
    }
  }
})();
