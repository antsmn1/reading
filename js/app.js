/* Ant’s Book Shelf: renders the shelf, book pages and the Now page from data/. */
(function () {
  "use strict";

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var STATUS = {
    read: "Read",
    owned: "On my shelf",
    list: "On my list",
    reading: "Reading now",
    finished: "Finished"
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function parseDate(iso) {
    var p = iso.split("-").map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  }
  function fmt(iso, long) {
    if (!iso) return "";
    var d = parseDate(iso);
    return (long ? MONTHS_LONG : MONTHS)[d.getUTCMonth()] + " " + d.getUTCDate() + ", " + d.getUTCFullYear();
  }
  function fmtShort(iso) {
    var d = parseDate(iso);
    return MONTHS[d.getUTCMonth()] + " " + d.getUTCDate();
  }
  /* Calendar days, counting both the first and the last day. */
  function daysBetween(a, b) {
    return Math.round((parseDate(b) - parseDate(a)) / 86400000) + 1;
  }
  /* "Today" in America/Chicago, not UTC. */
  function todayISO() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit"
    }).format(new Date());
  }
  function range(book) {
    if (!book.started) return "";
    if (!book.finished) return "Begun " + fmt(book.started);
    var a = parseDate(book.started), b = parseDate(book.finished);
    if (a.getUTCFullYear() === b.getUTCFullYear()) return fmtShort(book.started) + " – " + fmt(book.finished);
    return fmt(book.started) + " – " + fmt(book.finished);
  }
  function inline(md) {
    return esc(md)
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");
  }
  /* Tiny Markdown: front matter, #/##/### headings, paragraphs, - lists, **bold**, *italic*, [links](url). */
  function markdown(src) {
    var meta = {};
    src = src.replace(/^---\s*\n([\s\S]*?)\n---\s*\n?/, function (_, fm) {
      fm.split("\n").forEach(function (line) {
        var m = line.match(/^(\w+):\s*(.*)$/);
        if (m) meta[m[1]] = m[2].trim();
      });
      return "";
    });
    var html = "", list = false;
    src.split(/\n{2,}/).forEach(function (block) {
      block = block.trim();
      if (!block) return;
      var h = block.match(/^(#{1,3})\s+(.*)$/);
      if (h) { html += "<h" + (h[1].length + 1) + ">" + inline(h[2]) + "</h" + (h[1].length + 1) + ">"; return; }
      if (/^[-*]\s/.test(block)) {
        html += "<ul>" + block.split(/\n(?=[-*]\s)/).map(function (li) {
          return "<li>" + inline(li.replace(/^[-*]\s+/, "")) + "</li>";
        }).join("") + "</ul>";
        return;
      }
      html += "<p>" + inline(block.replace(/\n/g, " ")) + "</p>";
    });
    return { meta: meta, html: html };
  }
  function getJSON(url) {
    return fetch(url, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error(url + " " + r.status);
      return r.json();
    });
  }
  function fail(el, err) {
    el.innerHTML = '<p class="error">Couldn\u2019t load the data (' + esc(err.message) +
      '). Open this site through a web server, not straight from the file system. See README.md.</p>';
  }

  function isFinished(b) {
    // Only explicit status "reading" is in progress — never a missing finish date.
    return b.status !== "reading";
  }
  function finishedYear(b) {
    if (b.finished && /^\d{4}/.test(b.finished)) return b.finished.slice(0, 4);
    if (b.sortDate && /^\d{4}/.test(b.sortDate)) return b.sortDate.slice(0, 4);
    if (b.dateLabel) {
      var m = String(b.dateLabel).match(/\b(?:19|20)\d{2}\b/g);
      if (m) return m[m.length - 1];
    }
    return null;
  }
  function sortKey(b) {
    var primary = b.finished || b.sortDate || "";
    // Pad YYYY-MM so it compares in finish-date order with YYYY-MM-DD.
    if (/^\d{4}-\d{2}$/.test(primary)) primary += "-00";
    var tie = (typeof b.sort === "number") ? b.sort : 0;
    return primary + ":" + String(tie).padStart(6, "0");
  }
  function volumeHTML(b, i) {
    var status;
    if (!isFinished(b)) status = STATUS.reading;
    else if (b.dateLabel) status = b.dateLabel;
    else if (b.finished && !b.started) status = fmt(b.finished, true);
    else status = fmt(b.finished).replace(/^(\w+) \d+, /, "$1 ");
    return '<a class="volume' + (isFinished(b) ? "" : " reading") + '" href="book.html?id=' + encodeURIComponent(b.id) + '" style="--i:' + i + '">' +
      '<span class="cover"><img src="' + esc(b.cover) + '" alt="Cover of ' + esc(b.title) + ', ' + esc((b.edition && b.edition.publisher) || "") + ' edition"></span>' +
      '<span class="caption"><span class="t">' + esc(b.title) + "</span>" +
      '<span class="a">' + esc(b.author) + "</span>" +
      '<span class="d">' + esc(status) + "</span></span></a>";
  }
  function groupHTML(heading, books, start) {
    if (!books.length) return { html: "", next: start };
    var html = '<section class="year-group">';
    if (heading) html += '<h2 class="year-head">' + heading + "</h2>";
    html += '<div class="shelf" role="list">';
    books.forEach(function (b, i) { html += volumeHTML(b, start + i); });
    html += "</div></section>";
    return { html: html, next: start + books.length };
  }

  /* ---------- Shelf ---------- */
  function renderShelf(data) {
    var el = document.getElementById("shelf");
    var reading = data.books.filter(function (b) { return !isFinished(b); });
    var done = data.books.filter(isFinished);
    var html = "", n = 0, g;
    g = groupHTML("Reading now", reading, n); html += g.html; n = g.next;
    var years = {};
    done.forEach(function (b) {
      var y = finishedYear(b) || "Other";
      (years[y] = years[y] || []).push(b);
    });
    Object.keys(years).sort(function (a, b) { return b.localeCompare(a); }).forEach(function (y) {
      years[y].sort(function (a, b) { return sortKey(b).localeCompare(sortKey(a)); });
      g = groupHTML(esc(y), years[y], n); html += g.html; n = g.next;
    });
    el.innerHTML = html;
  }

  /* ---------- Book ---------- */
  function chart(book) {
    var rows = book.pagesPerDay || [];
    if (!rows.length) return "";
    var max = Math.max.apply(null, rows.map(function (r) { return r[1]; }));
    var total = rows.reduce(function (s, r) { return s + r[1]; }, 0);
    var bars = rows.map(function (r) {
      var h = Math.max(4, Math.round(r[1] / max * 100));
      return '<div class="bar' + (r[1] === max ? " best" : "") + '" title="' + esc(fmtShort(r[0]) + ": " + r[1] + " pages") + '">' +
        '<span class="n">' + r[1] + '</span><span class="fill" style="height:' + h + '%"></span>' +
        '<span class="day">' + esc(fmtShort(r[0]).replace(" ", "\u00a0")) + '</span></div>';
    }).join("");
    return '<section class="block pace"><h2>Pages a day</h2>' +
      '<div class="bars" role="img" aria-label="Pages read each day">' + bars + '</div>' +
      '<p class="small">' + total + ' pages over ' + rows.length + ' days, about ' + Math.round(total / rows.length) +
      ' a day. ' + esc(book.paceNote || "") + '</p></section>';
  }
  function card(r, byId) {
    var b = r.shelf ? byId[r.shelf] : null;
    if (r.shelf && !b) return "";
    var title = b ? b.title : r.title, author = b ? b.author : r.author;
    var cover = b ? b.cover : r.cover;
    var href = b ? "book.html?id=" + encodeURIComponent(b.id) : r.url;
    var label = b ? (isFinished(b) ? "Read · my notes" : "Reading now") : (STATUS[r.status] || "");
    var cls = b ? "card on-shelf" + (isFinished(b) ? "" : " reading") : "card off-shelf status-" + esc(r.status || "");
    var ext = !b && href ? ' target="_blank" rel="noopener"' : "";
    var tag = href ? "a" : "div";
    return "<" + tag + ' class="' + cls + '"' + (href ? ' href="' + esc(href) + '"' : "") + ext + ">" +
      '<span class="thumb">' + (cover ? '<img src="' + esc(cover) + '" alt="">' : "") + "</span>" +
      '<span class="meta"><span class="tag">' + esc(label) + (ext ? ' <span aria-hidden="true">↗</span>' : "") + "</span>" +
      '<span class="t">' + esc(title) + "</span>" +
      '<span class="a">' + esc(author) + "</span>" +
      (r.why ? '<span class="why">' + esc(r.why) + "</span>" : "") + "</span></" + tag + ">";
  }
  function renderBook(data) {
    var el = document.getElementById("book");
    var id = new URLSearchParams(location.search).get("id");
    var byId = {};
    data.books.forEach(function (b) { byId[b.id] = b; });
    var b = byId[id];
    if (!b) {
      el.innerHTML = '<section class="intro"><h1>Not on the shelf</h1><p class="lede"><a href="index.html">Back to the shelf</a></p></section>';
      return;
    }
    document.title = b.title + " · Ant’s Book Shelf";
    var e = b.edition || {};
    var facts = [];
    if (b.dateLabel) facts.push(["Read", b.dateLabel]);
    else if (b.started) facts.push(["Read", range(b)]);
    else if (b.finished) facts.push(["Read", "Finished " + fmt(b.finished, true)]);
    if (b.started && b.finished && !b.datesApproximate) facts.push(["Took", daysBetween(b.started, b.finished) + " days"]);
    else if (b.started && !isFinished(b)) facts.push(["So far", daysBetween(b.started, todayISO()) + " days"]);
    if (b.progress && (b.progress.label || b.progress.asOf)) {
      var pr = b.progress;
      var ps = pr.label || "";
      if (pr.asOf) ps = ps ? (ps + ", as of " + fmtShort(pr.asOf)) : ("As of " + fmt(pr.asOf));
      facts.push(["Progress", ps]);
    }
    facts.push(["Edition", [e.publisher, e.format].filter(Boolean).join(", ")]);
    if (e.details) facts.push(["", e.details]);
    if (e.pages) facts.push(["Length", e.pages]);
    if (e.isbn) facts.push(["ISBN", e.isbn]);

    var notes = b.notes || [];
    var notesHtml;
    if (!notes.length) {
      notesHtml = '<p class="notes-empty">Notes to come.</p>';
    } else {
      notesHtml = notes.map(function (n) {
        var text = n.text != null ? n.text : "";
        return '<blockquote class="note">' +
          (n.date ? '<time datetime="' + esc(n.date) + '">' + esc(fmt(n.date)) + "</time>" : "") +
          "<p>" + esc(text) + "</p></blockquote>";
      }).join("");
    }
    var comps = (b.companions || []).map(function (c) {
      return '<li><a href="' + esc(c.url) + '" target="_blank" rel="noopener">' + esc(c.label) + "</a></li>";
    }).join("");

    el.innerHTML =
      '<p class="crumb"><a href="index.html">← The shelf</a></p>' +
      '<article class="book">' +
        '<aside class="plate"><figure><img src="' + esc(b.cover) + '" alt="Cover of the ' + esc(e.publisher) + " edition of " + esc(b.title) + '">' +
          "<figcaption>" + (isFinished(b) ? "The copy I read" : "The copy I’m reading") + "</figcaption></figure></aside>" +
        '<div class="body">' +
          '<header class="title"><p class="eyebrow">' + esc(isFinished(b) ? STATUS.finished : STATUS.reading) + "</p>" +
            "<h1>" + esc(b.title) + "</h1>" + (b.subtitle ? '<p class="sub">' + esc(b.subtitle) + "</p>" : "") +
            '<p class="by">' + esc(b.author) + "</p></header>" +
          '<dl class="facts">' + facts.map(function (f) { return "<dt>" + esc(f[0]) + "</dt><dd>" + esc(f[1]) + "</dd>"; }).join("") + "</dl>" +
          '<div class="flourish" aria-hidden="true"><span></span>&#10086;<span></span></div>' +
          '<section class="block notes"><h2>Notes</h2>' + notesHtml + "</section>" +
          chart(b) +
          '<section class="block"><h2>About the author</h2><p class="author-note">' + esc(b.authorNote) + "</p>" +
            (comps ? '<h3 class="minor">Companions</h3><ul class="links">' + comps + "</ul>" : "") + "</section>" +
        "</div>" +
      "</article>" +
      ((b.related || []).length ? '<section class="related"><h2>Related reading</h2><div class="cards">' +
        b.related.map(function (r) { return card(r, byId); }).join("") + "</div>" +
        '<p class="small legend"><span><i class="key on"></i>On this shelf, with my notes</span><span><i class="key off"></i>Elsewhere (opens Open Library)</span></p></section>' : "");
  }

  /* ---------- Now ---------- */
  function renderNow() {
    var el = document.getElementById("now");
    fetch("data/now.md", { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error("data/now.md " + r.status);
      return r.text();
    }).then(function (txt) {
      var md = markdown(txt);
      el.innerHTML = md.html;
      if (md.meta.updated) {
        document.getElementById("updated").innerHTML = 'Last updated <time datetime="' + esc(md.meta.updated) + '">' + esc(fmt(md.meta.updated, true)) + "</time>";
      }
    }).catch(function (err) { fail(el, err); });
  }

  var page = document.body.getAttribute("data-page");
  if (page === "now") { renderNow(); return; }
  getJSON("data/books.json").then(function (data) {
    if (page === "shelf") renderShelf(data);
    if (page === "book") renderBook(data);
  }).catch(function (err) {
    fail(document.getElementById(page === "book" ? "book" : "shelf"), err);
  });
})();
