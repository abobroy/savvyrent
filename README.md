# SavvyRent public-data MVP

## Deploy
1. Back up your existing GitHub `index.html`.
2. Replace it with the included `index.html`.
3. Commit to the branch used by GitHub Pages.
4. Wait for GitHub Pages to redeploy.

## What works
- U.S. address matching through the Census Geocoder
- Census tract and county median gross rent
- Property-detail heuristic adjustments
- Estimated monthly rent and likely range
- Confidence score
- Rent per square foot when square footage is supplied
- ACS-based 12- and 36-month trend comparison
- Area housing vacancy indicator
- Basic investment metrics

## Important limits
- Census data is not live asking-rent data.
- This version does not provide individual rental listing comparables.
- HUD FMR is intentionally not called directly because the official HUD API uses credentials that should not be exposed in a public static page.
- Add a serverless backend before using secret API keys or licensed data.

## Google Analytics
Retain your existing Google Analytics tag in the `<head>`, or paste it there after the title/meta tags.
The form sends only a generic `rent_estimate_generated` event and does not transmit the entered street address.

# SavvyRent website update

Upload these files to the root of the GitHub Pages repository:

- index.html
- style.css
- app.js

Replace the old index.html. Keep the existing CNAME file so savvyrent.com remains connected.

The frontend calls:

https://savvyrent-hud-api.abobroy.workers.dev/api/rent-report

The Cloudflare Worker must support POST /api/rent-report and allow these CORS origins:

- https://savvyrent.com
- https://www.savvyrent.com

After committing the files, wait for GitHub Pages to deploy and hard-refresh the browser with Ctrl+F5.

