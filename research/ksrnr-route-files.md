# KSRNR hiking trail route files: reuse, access and contents

Research for Saudi Trails (static Vite/React + Leaflet page on GitHub Pages, no backend).
Checked on 2026-11-05 against ksrnr.gov.sa and dash.ksrnr.gov.sa directly.

**Bottom line:** the plan to copy KSRNR's KML files into the repo as GeoJSON "with credit" is
**not covered by KSRNR's published terms**. The website terms reserve all rights and require
prior written permission for any reproduction or redistribution, commercial or not. The trail
files are not part of KSRNR's open-data library (which is the only content under an open
licence). Live loading from the browser is also not an option. The realistic paths are: get
written permission from KSRNR (info@ksrnr.gov.sa), or **link out** to KSRNR's own KML files
and trail pages and draw only a marker at the published trailhead coordinates.

## 1. Terms of use / open data

- **Website terms of use** ([ar](https://ksrnr.gov.sa/ar/page/terms-of-use), last modified
  2026-05-06), section 3, "Intellectual property rights":
  - All content on the site (text, images, graphics, software, documents) is rights-reserved
    under Saudi IP law.
  - Selling, reproducing, publishing or distributing any site content by any means, **for
    commercial or non-commercial purposes**, is not allowed without **prior written
    permission** from the Authority.
  - Images, drawings and displayed materials may be used only with official permission.
  - Footer on every page: "All rights reserved to the King Salman bin Abdulaziz Royal Reserve
    Development Authority © 2026".
  - Note: the un-prefixed URL `https://ksrnr.gov.sa/page/terms-of-use` (linked from the
    footer) rendered empty; the `/ar/` URL has the text.
- **Open data**: [open-data page](https://ksrnr.gov.sa/ar/open-data),
  [open data policy](https://ksrnr.gov.sa/ar/content/open_data/102) (last modified
  2026-09-15), [open data library](https://ksrnr.gov.sa/ar/open-data-library).
  - The policy says open datasets are free, need no registration, and fall under the
    **national open data licence** (SDAIA framework); using them implies accepting it.
  - The library lists only four datasets (published 2026-08-05): village counts (XLS),
    **reserve and inner-reserve boundaries by region (JSON)**, wadis/rawdahs/water bodies (XLS),
    mountain areas and names (XLS). **No hiking trails / KML.**
  - So the trail KMLs fall under the website terms, not the open-data licence. The boundaries
    JSON could be a legitimately reusable overlay (check the national licence's attribution
    terms before use).
- No licence note appears on the trail pages or inside the KML files (no `<atom:author>`,
  no description with rights text).

## 2. Cross-origin loading (CORS)

Tested with `curl` on both sample files:

| Request | Result |
| --- | --- |
| GET, no `Origin` header | `200`, `content-type: application/vnd.google-earth.kml+xml`, real KML body |
| GET / HEAD / OPTIONS with `Origin: https://example.org` | `200` but `content-type: text/html`, 246-byte F5 WAF page "Request Rejected ... Your support ID is ..." |

- Responses carry `access-control-allow-credentials: true`, `access-control-allow-methods`
  and `access-control-allow-headers`, but **no `Access-Control-Allow-Origin`**.
- Any request carrying a foreign `Origin` (which every browser `fetch()` does for
  cross-origin requests) is rejected by the WAF outright.
- They also send `content-security-policy: ... connect-src 'self'; frame-ancestors 'self'`
  and `x-frame-options: SAMEORIGIN`.
- **Conclusion:** a page on naifalassaf.github.io cannot `fetch()` these files. A plain
  `<a href>` download link for the user works (it's a top-level navigation, no Origin
  check). A public CORS proxy would mean evading their controls and should be avoided.

## 3. File contents

Downloaded to scratch space and parsed as XML only (Python `xml.etree`, nothing executed).

| | Wadi Fajr (`2025-12/مسار وادي الفجر.kml`) | Jabal Al-Hisan (`2026-09/جبل الحصان.kml`) |
| --- | --- | --- |
| Size | 45,283 bytes | 61,178 bytes (last-modified 2026-09-20) |
| Folder name | `مسار وادي الفجر` | ` جبل الحصان رسم المسار` (leading space) |
| Route | 1 Placemark, `MultiGeometry` of 8 `LineString`s, 411 points | 1 Placemark, 1 `LineString`, 782 points |
| Route name | `مسار وادي الفجر` | `  مسار جبل الحصان` (leading spaces) |
| Computed length | 15.37 km (page says 15.4 km) | 6.04 km (page says 5.81 km) |
| Elevation | lon,lat,alt on every vertex; 808 to 925 m | 759 to 770 m |
| Points | 46 `Point` placemarks | 46 `Point` placemarks |

- KML 2.2, `altitudeMode` `clampToGround`, no `gx:` extensions, styles reference a
  relative `red-pin-down.png` icon that isn't bundled.
- **Point placemarks are internal signage/survey markers, not visitor waypoints.** Names are
  short codes (`D`, `D - D`, `D - D - R`, `P`, `P - 2`, `I - S - C`, `G`, `L`, `N D`, `Q`,
  `X`, ...). Several are duplicated at the same coordinate. In Jabal Al-Hisan, some carry
  maintenance notes in `<description>`, e.g. "needs modification", "warning sign to be
  replaced with a forward direction sign", "wrong left direction, change to forward", and
  the `N D` points have altitude 0. These shouldn't be shown to hikers as-is.
- Wadi Fajr route is split into 8 unordered segments (some look like out-and-back
  duplicates), so a GeoJSON conversion would be a `MultiLineString`, not one clean line.
- No per-placemark `ExtendedData`, no difficulty/length metadata in the file. That lives
  only on the HTML trail page.
- The English Wadi Fajr page says "download the map ... in KMZ format" but the link is a
  `.kml`. It also lists difficulty twice, as both "Hard" and "Moderate".

## 4. English version

- Yes: the site is bilingual with `/ar/` and `/en/` prefixes (hreflang alternates in the
  HTML). [English list](https://ksrnr.gov.sa/en/content/event/168),
  [English Wadi Fajr page](https://ksrnr.gov.sa/en/content/event/91).
- English pages include a structured block: Trail Name, Length, Maximum Elevation,
  Estimated Time, Difficulty, Trail Coordinates (trailhead lat,lng; Wadi Fajr
  `28.82542, 37.78425`), plus the same KML link and a registration form.
- English trail names as listed (the spelling isn't always consistent between the card
  title and the body):

| Arabic (card) | English (card) | Event ID |
| --- | --- | --- |
| مسار جبل الحصان | Horse Mountain Trail | 177 |
| مسار طريف | Turaif Trail | 179 |
| مسار جبال ضبع | Dabaa Mountains Trail | 178 |
| حائل: مسار توارن | Hail: Tawaran Trail (body: "Tuwarn") | 95 |
| حائل: مسار عقدة | Hail: Aqdah Trail | 94 |
| حائل: مسار صيحان | Hail: Sayhan Trail | 93 |
| حائل: مسار أبو الهول | Hail: Abu Al-Houl Trail | 92 |
| تبوك: مسار وادي فجر | Tabuk: Wadi Fajr Trail | 91 |
| تبوك: مسار وادي الضاحكية | Tabuk: Wadi Al-Dhahakiya Trail (body: "Wadi Al-Dahikiyah") | 90 |
| تبوك: مسار القليبة | Tabuk: Al-Qalbiya Trail | 89 |

  (Event IDs come from the Arabic list's "Read more" links; the English list is in the same order.)

## 5. Trail count

- The [Arabic list](https://ksrnr.gov.sa/ar/content/event/168) (last modified 2026-10-22)
  shows **10 trails, the same 10** the current page knows: Jabal Al-Hisan, Turaif, Jibal
  Dhaba, Tawaran, Aqdah, Sayhan, Abu Al-Hol, Wadi Fajr, Wadi Al-Dahkiyah, Al-Qulaybah.
- The English list shows the same 10 plus one non-trail card, "Hiking Trails Inside The
  Reserve" (an overview article dated 2025-09-02).
- No new trails.

## Method and sources

- `curl` header/body checks of the two KML URLs (with and without `Origin`), one GET of the
  Arabic list page HTML (Vue SPA shell; content is client-rendered).
- Rendered pages in a browser: Arabic list, terms of use, open data, open data policy, open
  data library, English list, English Wadi Fajr page.
- KML parsed with a standalone Python script outside the download folder (`python3 -I`).
- No logins, no forms submitted.
