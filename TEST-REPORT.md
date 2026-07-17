# Test report — More Than a Kiosk

## Remediation audit — 15 July 2026

- Replaced and removed all legacy public-listing venue photographs.
- Downloaded five Unsplash-licensed stock photographs into `assets/images/licensed-stock/`, optimized them locally, documented each source, and labelled their use as illustrative.
- Self-hosted AOS 2.3.4 and Anime.js 3.2.2; removed Google Fonts and jsDelivr requests from all nine pages.
- Added no-JavaScript navigation to every page and corrected loader accessibility semantics.
- Removed the unused dynamic product catalog/filter/modal implementation from `js/app.js`.
- Added intrinsic dimensions to the previously incomplete contact image and synchronized dimensions for the replacement photographs.
- Updated the privacy notice, asset approval record, dependency record, CSP guidance, production checklist and source documentation.
- Added `validate.ps1`; it passes all nine pages, local references, duplicate IDs, JSON-LD, sitemap, manifest, required metadata and self-hosting rules.

Checks completed after the redesign:

- Every HTML page parses without missing local files or duplicate IDs.
- Every JavaScript file passes `node --check`.
- All local image and stylesheet references resolve correctly.
- Previous branding, contact information and domain references were removed from the active site.
- Desktop and 390 px mobile layouts were rendered and reviewed.
- No horizontal overflow was detected at 1440 px or 390 px.
- The fixed mobile navigation includes an 80 px calculated clearance spacer, keeping the footer and final actions accessible.
- All images loaded successfully during the complete mobile-page render.

External Google Fonts and the Google Maps iframe still depend on the visitor's network connection. Test the call and map links on a physical phone before publication.

## Official menu update — 14 July 2026

- Replaced the generic category page with a full digital menu containing 105 priced menu entries.
- Added anchored category navigation for coffee, beverages, cocktails, refreshments and spirits.
- Added five locally hosted, edited and compressed WebP stock photographs.
- Verified all local image, stylesheet, script and page references.
- Verified no duplicate HTML IDs and no missing local assets.
- Added mobile one-column layouts, horizontal category navigation and bottom-navigation clearance.

## SEO validation — 14 July 2026

- All six HTML documents contain one title, description, robots directive, canonical URL, Open Graph URL/image and valid JSON-LD block.
- Canonical URLs point to `https://morethanakiosk.com/`.
- JSON-LD parses successfully on every page.
- `sitemap.xml` parses successfully and contains the four indexable business pages.
- All local links, scripts, styles and images resolve to existing files.
- JavaScript syntax checks passed.
- Local HTTP checks returned 200 for the homepage, menu, contact, directions, sitemap, robots file and social preview image.
- Social preview is 1200×630; Apple touch icon is 180×180.

## Official logo and motion update — 14 July 2026

- Replaced the extracted/cropped logo asset with the high-resolution logo supplied directly by the user.
- Generated optimized transparent PNG/WebP logo files, 96/180/192/512 px icons and a refreshed 1200×630 social preview.
- Added pinned AOS 2.3.4 and Anime.js 3.2.2 GitHub CDN builds; both are MIT-licensed.
- Added custom coffee-bean rain, coffee steam, category-themed menu details, menu-item staggering, logo motion and subtle pointer tilt.
- Added progressive fallbacks so all content remains visible when the third-party CDN is unavailable.
- Added `prefers-reduced-motion` support for accessibility.
- Rechecked JavaScript syntax, JSON-LD parsing, duplicate IDs and all local references.

## Social profile update

- Added official Instagram and Facebook links to the contact page.
- Added social links to the shared footer and mobile drawer.
- Added both profiles to LocalBusiness `sameAs` structured data on every HTML page.
- Verified JavaScript syntax, JSON-LD validity, and all local page/asset links after the update.
