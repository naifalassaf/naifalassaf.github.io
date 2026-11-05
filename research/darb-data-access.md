# Reading Darb (جمعية درب) trail data programmatically

Research for Saudi Trails, checked 2026-11-05. Everything here comes from about 20 unauthenticated GET requests to `darb.org` and `api.darb.org`, plus reading the site's own JavaScript bundles. No login was used.

## TL;DR

- `darb.org` is a Next.js front end over an undocumented ASP.NET JSON API at **`https://api.darb.org/api/`**. The base URL is hard-coded in the site bundle [`_app-*.js`](https://darb.org/_next/static/chunks/pages/_app-5776bd51af09b545.js). The API needs no auth for reads and returns **`Access-Control-Allow-Origin: *`**.
- `GET /tracks?PageNumber=1&PageSize=50` returns every published track, including name, length, duration, elevation, difficulty, region and city. The response language follows the `Accept-Language` header.
- `GET /tracks/all-tracks-summaries-map` returns the start, middle and end coordinates of each track.
- `GET /tracks/track-map-details?Id=<id>&Type=1` returns the **full GPS route** as a list of points.
- English names come from the same endpoints when you send `Accept-Language: en-US`. They exist for 20 of the 29 tracks.
- The site publishes no terms of use and no data licence. The only legal page is a privacy policy. Reuse is not explicitly allowed, so ask Darb (info@darb.org) before redistributing.

## 1. API and data feeds

### Where the API is defined

The RTK Query `trackApi` slice in the site bundle (`https://darb.org/_next/static/chunks/pages/_app-5776bd51af09b545.js`) declares:

- `baseUrl: "https://api.darb.org/api/"`
- `prepareHeaders` sets `Accept-Language` to the UI language (`ar-SA` or `en-US`), and sets `authorization: Bearer …` only when a user is logged in.
- Track endpoints:
  - `tracks?…` (list)
  - `tracks/{id}`
  - `tracks/all-tracks-summaries-map`
  - `tracks/track-map-details?…`
  - `tracks/all/get-by-id?…`
  - `recorded-track?…`
  - `tracks/get-track-comments?…`
  - like/comment mutations, which need auth

Track pages such as [darb.org/tracks/2551/1](https://darb.org/tracks/2551/1) are server-rendered. The same track object is also embedded in the page HTML at `<script id="__NEXT_DATA__">` → `props.pageProps.trackById`. The response headers show `x-powered-by: Next.js` and `ASP.NET`.

### Endpoints verified

| Endpoint | What it returns |
|---|---|
| [`GET /api/tracks?PageNumber=1&PageSize=50`](https://api.darb.org/api/tracks?PageNumber=1&PageSize=50) | `{data:{pageNumber,totalCount,pageSize,totalPages,items:[…]}}`. The default page size is 15. With `ar-SA`, `totalCount` was **29**. With `en-US` it was **20**, so tracks without English content are left out. Each item has `id, title, images[], gpxFiles, locationDescription (HTML), region{id,title}, city{id,title}, length, difficulty{id,title}, duration, heightGainedOrLost, highestElevationAboveSeaLevel, minimumHeightAboveSeaLevel, description (HTML), qrCodeUrl, qrCode`. **No coordinates.** |
| [`GET /api/tracks/{id}`](https://api.darb.org/api/tracks/1629) | The same object for one track. |
| [`GET /api/tracks/all-tracks-summaries-map`](https://api.darb.org/api/tracks/all-tracks-summaries-map) | 26 entries of `{trackName, firstPoint, middlePoint, lastPoint, documentId, trackType}`. Each point is a **JSON string** `{"Latitude","Longitude","Elevation","Time"}` and has to be parsed a second time; the site's own `transformResponse` calls `JSON.parse(firstPoint)`. `trackName` follows `Accept-Language` and is `" "` when that language has no name. |
| [`GET /api/tracks/track-map-details?Id=2551&Type=1`](https://api.darb.org/api/tracks/track-map-details?Id=2551&Type=1) | The full route as an array of `{Latitude, Longitude, Elevation, Time}` (106 points for 2551). Without `Id` or `Type` it returns 400 `"Id is required","Type is required"`. |

### Data quality notes, which matter for a build-time normaliser

- Every numeric field is a **localised free-text string**. Examples: `"7.21 كم"`, `"4,5 كم"`, `"٨ كم"` (Arabic-Indic digits), `"6 كم ذهاب وعودة"`, `"1,981 م"` / `"1.170 م"` (the comma or dot is ambiguous), `"2 -5 س"`, `"04 - 05 ساعات"`, `"ساعة"`, `"-"`, and bare numbers with no unit.
- `region`, `city` and `difficulty` are **sometimes null**, for example 2551, 2028, 2268 and 2480. The English responses null them more often: 1629 has them in Arabic but `null` in English.
- English values can **disagree** with Arabic ones. For 1629 the duration is `"2-3 س"` in Arabic and `"3-4 h"` in English, and the English elevations are `"-"`.
- The list endpoint and the map-summary endpoint do not cover the same tracks:
  - The map summary has 1280, which is missing from the list.
  - The list has 2531, 2787, 2875 and 2920, which have no map summary.
  - Join on `id` == `documentId` and expect gaps. For tracks with no summary, the start point could come from `track-map-details`.
- `firstPoint` is a GPS fix, not a designated trailhead, but it works as a start coordinate.
- `gpxFiles` was `null` for every track.
- `qrCodeUrl` is often a placeholder; 1629 points to a Google Maps link for Egypt. Do not use it as a location.
- `/tracks/{id}/{type}`: the `type` in page URLs (`/1`) matches `trackType` in the API. Every official track seen had type 1. User-recorded tracks seem to live under `recorded-track`, which was not probed.

### Sitemap and robots

- [robots.txt](https://darb.org/robots.txt) allows everything except the auth, profile, settings and store pages.
- [sitemap.xml](https://darb.org/sitemap.xml) has 116 URLs, all static pages, and **no track URLs**. It is not useful as a track index.

### Mobile app

Darb's [privacy policy](https://darb.org/policy) mentions a "جمعية درب" app that records trips and shows nearby tracks. The site bundle has the user-track endpoints (`recorded-track`, `profile/tracks`), which suggests the app uses the same `api.darb.org` backend. That was not verified, and no store listing clearly owned by the association was found. "Darb: Hike & Navigate" ([App Store](https://apps.apple.com/app/id6751050753)) is a different, commercial MENA app that shows no stated link to the association.

## 2. English names

- English names come from the API when you send `Accept-Language: en-US`. Examples: 1629 → "Wadi almakhada", 2308 → "Shaqra and Ushayqir Trail", 1683 → "Mount Tuwad Trail and Qais and Layla Cave".
- **20 of 29** tracks have an English title. The others return `""` (or `" "` in the map summary), including 2551, 2480, 2518, 2531, 2572, 2787, 2816, 2875 and 2920. Some of these have English prose inside the Arabic `locationDescription` instead; 2551 is one example.
- English spelling is inconsistent, for example "Al-Ghat" next to "Al Ghat", and "Lamah trail".
- English pages exist at `/en/...`, for example [darb.org/en/tracks/1629/1](https://darb.org/en/tracks/1629/1), as advertised by the hreflang tags. However, the server-rendered `__NEXT_DATA__` on the `/en` page still held the **Arabic** record, so the English text must be fetched from the API, not scraped from that HTML.

## 3. CORS, and browser versus server use

- Every successful API response checked had `access-control-allow-origin: *`; this was tested with `Origin: https://naifalassaf.github.io`. A static GitHub Pages app could therefore call the API directly from the browser.
- The 400 validation error response had **no** CORS header, but that only matters for malformed requests.
- `Accept-Language` is a CORS-safelisted header, so sending it does not trigger a preflight request.
- From a server or CI job (plain `curl`, no cookies, no special headers), every endpoint returned 200. No bot protection or rate-limit headers were seen.
- Recommendation: fetch and normalise at **build time** (a CI job writes a static JSON file), not on every visit. Reasons:
  - The fields need heavy parsing.
  - The API is undocumented and could change or close without notice.
  - It keeps traffic to Darb small.
  - The map keeps working if `api.darb.org` goes down.

## 4. Terms of use

- No terms-of-use, copyright, or data-licence page was found.
  - The page bundle's route list (`_buildManifest.js`) has `/policy` and `/about-us/regulations-and-policies`, but no terms route.
  - The rendered track page shows no copyright line.
- [`/policy`](https://darb.org/policy) (the same Arabic text at `/en/policy`) is a **privacy policy** only. It covers how users' personal and location data is handled, and says nothing about reusing the published track content.
- `/about-us/regulations-and-policies` holds the association's governance documents. They were not read in detail and do not look like a content licence.
- So there is no explicit permission to reuse the data. By default the descriptions, photos and routes are Darb's copyrighted content. Facts such as name, length and start point are lower risk, but the safe path is:
  - attribute Darb and link each trail to its darb.org page;
  - do not copy descriptions or photos;
  - email info@darb.org to ask for permission. The contact address is given in the privacy policy.

## 5. Route lines (out of scope, noted only)

Yes. `GET /api/tracks/track-map-details?Id=<id>&Type=1` returns the full point list without auth and with CORS `*`. The `gpxFiles` field exists but was null everywhere. The same licensing caveat applies, probably more strongly, since the routes are Darb's own survey work.

## Sources

- Track pages: https://darb.org/tracks/2551/1 , https://darb.org/tracks/1629/1 , https://darb.org/en/tracks/1629/1
- Site bundle containing the API definitions: https://darb.org/_next/static/chunks/pages/_app-5776bd51af09b545.js
- Route manifest: https://darb.org/_next/static/Wsl852vRpZJZrhtfLJX4Q/_buildManifest.js (the build hash will change when the site is redeployed)
- API: https://api.darb.org/api/tracks?PageNumber=1&PageSize=50 , https://api.darb.org/api/tracks/1629 , https://api.darb.org/api/tracks/all-tracks-summaries-map , https://api.darb.org/api/tracks/track-map-details?Id=2551&Type=1
- https://darb.org/robots.txt , https://darb.org/sitemap.xml
- Privacy policy: https://darb.org/policy
- Unrelated app with a similar name: https://apps.apple.com/app/id6751050753
