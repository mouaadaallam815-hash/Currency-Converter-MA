# Currency Converter

A mobile-friendly, dark-themed currency converter with Arabic, French and English UI.

## Deploy on GitHub Pages
1. Create a new GitHub repository.
2. Upload every file in this folder to the repository root (not the ZIP file itself).
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
5. Open the published Pages URL.

## Exchange rates
Uses the free, no-key Open Access endpoint from ExchangeRate-API:
`https://open.er-api.com/v6/latest/USD`

Rates update when the page loads or the refresh button is pressed. The provider updates its feed periodically; this is not a tick-by-tick market feed. An internet connection is needed for fresh rates.

## Files
- `index.html` — complete app, styling and logic
- `logo.png`, `icon-192.png`, `icon-512.png` — app branding
- `manifest.webmanifest` — installable app metadata
- `sw.js` — basic same-origin asset caching

## Currency list note
The selector includes EUR (Euro) explicitly as well as currencies returned by the live rate feed. A selectable code still needs a rate from the provider to calculate a conversion.
