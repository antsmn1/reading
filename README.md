# Ant’s Book Shelf

A personal reading site. Plain HTML, CSS, and a small script, with no build step.

```
index.html        the shelf (cover grid)
book.html         one book page, e.g. book.html?id=siddhartha
now.html          the Now page
data/books.json   every book on the shelf (edit this to add a book)
data/now.md       the Now page text (edit this to update Now)
covers/           cover images, saved locally
css/style.css     the design
js/app.js         renders pages from the data files
```

## Preview it locally

The pages load their data with `fetch`, so open the site through a small web server. Double-clicking the HTML file won't work.

```
cd reading-repo   # or the folder this README is in
python3 -m http.server 8000
# then open http://localhost:8000
```

## Add a book

1. Save the cover of the edition you read as `covers/<id>.jpg`. Open Library has most covers:
   `https://covers.openlibrary.org/b/isbn/<ISBN>-L.jpg`
2. Add an entry to the `books` list in `data/books.json`. Copy an existing book and change it:

```json
{
  "id": "the-odyssey",                 // used in the link: book.html?id=the-odyssey
  "title": "The Odyssey",
  "subtitle": "",
  "author": "Homer",
  "status": "finished",
  "started": "2026-01-02",             // YYYY-MM-DD
  "finished": "2026-02-10",            // leave out while you're still reading
  "cover": "covers/the-odyssey.jpg",
  "edition": { "publisher": "Penguin Classics", "details": "Translated by Robert Fagles",
               "format": "Paperback", "isbn": "...", "pages": "541 pp." },
  "pagesPerDay": [["2026-01-02", 30], ["2026-01-03", 25]],   // optional; draws the small chart
  "paceNote": "",
  "notes": [
    { "date": "2026-02-11", "text": "A thought in my own words." },
    { "date": "2026-02-12", "text": "Another." }
  ],
  "companions": [ { "label": "A lecture or film", "url": "https://..." } ],
  "authorNote": "A few sentences about the author.",
  "related": [
    { "shelf": "the-iliad", "why": "Read first." },
    { "title": "The Aeneid", "author": "Virgil", "cover": "covers/aeneid.jpg",
      "status": "list", "url": "https://openlibrary.org/...", "why": "Next." }
  ]
}
```

(Remove the `//` comments, because JSON doesn't allow them.)

- The site works out **days taken** from `started` and `finished`, counting both the first and the last day. While a book is in progress, it shows "So far" using today's date in America/Chicago. Days are not computed when dates are approximate.
- The shelf is grouped by the year a book was finished, newest year first, with currently-reading books at the top. A book without a finish date (and with `"status": "reading"`) shows as "Reading now."
- Length is a single total, e.g. `"pages": "209 pages"`. Don't put page ranges or a current page number here.
- For a book you're in the middle of, optional progress is a short phrase, not a page number:

```json
"progress": { "label": "About halfway", "asOf": "2026-11-11" }
```

- If exact dates aren't known, set `"dateLabel": "April 2025"` and `"datesApproximate": true` instead of inventing a start and finish. You can also set `"sortDate": "2025-04"` (not shown) so the book lands in the right year and order. When two books share the same month, an optional integer `"sort"` is a tiebreaker (higher = finished later, so it appears first in the newest-first year group). Do not invent exact dates just to order them.
- Under `related`, `{"shelf": "<id>"}` points to another book on the shelf. It links to your notes for that book and is highlighted in gold. Any other related book needs `title`, `author`, `cover`, `url`, and a `status`: `read` (read, not on the shelf yet), `owned` (shows as "On my shelf"), or `list` (shows as "On my list"). These cards are dimmed and open in a new tab.
- When you add a book that's already listed as an outside related card, change those cards to `{"shelf": "<id>"}`.
- Run `python3 -m json.tool data/books.json` to check for typos before you publish.

## Add a note

Notes are your own words. In `data/books.json`, each book has a `notes` list of simple objects with a date and a text string:

```json
"notes": [
  { "date": "2026-11-05", "text": "this book is great. its what i wanted from lord of light in retrospect lol" }
]
```

- `date` is optional, in `YYYY-MM-DD`. `text` is the note, written as you said it.
- Add a new object to the list for each note. Leave `notes` as `[]` (or omit it) and the page shows a quiet "Notes to come." placeholder — space reserved for you.
- Don't paste in summaries or paraphrases. This section is only for what you wrote or said.

## Update Now

Edit `data/now.md`. Change the `updated:` date at the top and rewrite the paragraphs. `**Label**` at the start of a paragraph shows as a small gold heading. The page also supports `*italics*`, `[links](https://...)`, `## headings`, and `- lists`.

## Hosting

The folder is a static site and works as-is on GitHub Pages, Netlify (drag and drop the folder), Cloudflare Pages, or a Raspberry Pi running any web server. `now.html` is the Now page. GitHub Pages and Netlify also serve it at `/now`.

## Credits

Cover images come from Open Library (covers.openlibrary.org) and belong to their publishers and designers. Fonts are Cormorant Garamond and EB Garamond, loaded from Google Fonts.
