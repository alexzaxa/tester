# More Than a Kiosk website

A responsive multi-page website for **More Than a Kiosk, περίπτερο & καφέ** in Chalkoutsi.

## Pages
- `index.html` — homepage, gallery, location and contact details
- `menu.html` — product categories without unverified prices
- `directions.html` — Google Maps directions and embedded map consent flow
- `contact.html` — phone, address and opening hours
- `privacy.html` — privacy notice
- `404.html` — GitHub Pages-compatible error page

## Run locally
Open `index.html` directly or run `open-local.bat` on Windows.

## Validate
Run `powershell -ExecutionPolicy Bypass -File .\validate.ps1` to check local references, duplicate IDs, JSON-LD, required metadata, sitemap/manifest syntax, no-JavaScript navigation, and the self-hosting policy.

## Business details used
- Address: Ποσειδώνος 13, Χαλκούτσι, Αττική
- Phone: 22950 71211
- Map: https://maps.app.goo.gl/wuxAspR66vvUeKUTA

Review `SOURCES.md` and confirm image permissions and opening hours before commercial publication.

## Table QR ordering

The menu includes optional table-bound ordering backed by Supabase. It stays hidden on ordinary visits and activates only after a valid table QR is verified. See `ORDERING-SETUP.md` before enabling it.


## Official logo and animation layer

- The supplied official `More Than a Kiosk` logo is used in the header, footer, loaders, hero badge, social preview and app icons.
- `css/coffee-motion.css` and `js/coffee-motion.js` add coffee-bean rain, steam, menu stagger effects, logo motion and subtle card tilt.
- AOS 2.3.4 and Anime.js 3.2.2 are loaded from pinned jsDelivr GitHub URLs. Both projects use the MIT license; see `THIRD-PARTY-LICENSES.md`.
- All motion respects the visitor's `prefers-reduced-motion` setting.


## Social media

- Instagram: https://www.instagram.com/more_than_coffee_and_cocktail/
- Facebook: https://www.facebook.com/share/187zwPH4FL/?mibextid=wwXIfr


## Local SEO landing pages

- `coffee-chalkoutsi.html`
- `cocktails-chalkoutsi.html`
- `kiosk-chalkoutsi.html`

See `LOCAL-SEO-ACTION-PLAN.md` for the required Google Business Profile and Search Console steps.
