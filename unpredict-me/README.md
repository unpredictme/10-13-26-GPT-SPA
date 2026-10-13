# UnPredict Me — Molly React homepage

This frontend calls the included Worker. It no longer runs as a browser-only demo: successful submission stores the contact in Brevo list 3 and requests a transactional reading email. The profiles are fictional prewritten readings, not AI-generated assessments. Product finds remain illustrative without affiliate links.

## Cloudflare Pages

- Build command: `npm run build`
- Output directory: `dist`
- Root: `/` if this folder is the repository root; `/unpredict-me` if deploying the combined ZIP structure.
- Node: 22.12.0 or later.
- Select the actual production branch of your repository.
- No Brevo secret belongs in Pages or browser code.

`public/config.json` contains `{"apiUrl":"/api/signup"}`. Route the Worker to `unpredictme.com/api/*` (and `www.unpredictme.com/api/*` if used) in the Cloudflare dashboard on your active zone. Pages continues serving other paths. This requires the domain to use the appropriate Cloudflare zone/routing setup; it has not been verified in your account. Alternatively deploy the Worker on its returned workers.dev URL and put that exact URL plus `/api/signup` in config.json; never guess its hostname. Rebuild after editing config. Add the exact frontend origin to Worker ALLOWED_ORIGINS, including any preview hostname; previews are not allowlisted by default.

## Local commands

LOCAL WRITE / NO SEND — Install frontend dependencies.
```bash
npm ci
```
LOCAL SERVER / NO SEND — Start the frontend.
```bash
npm run dev
```
LOCAL WRITE / NO SEND — Build frontend files.
```bash
npm run build
```
Run commands from this folder. The compiled dist folder is included. For local API testing, configure the actual local Worker URL in config.json and explicitly allow the local frontend origin; a signup against a real API key writes to Brevo and sends an email.

## Form contract

POST JSON: email (required string), website (blank honeypot string), marketingConsent (boolean), readingRequested (true). The interface explicitly tells visitors submission saves their email and requests a reading. Marketing consent is optional. The backend returns ok, vibe and emailSent. A partial email failure displays a distinct saved-contact message. No silent fake signup success.

The full updated React source is in src/main.jsx. Molly’s supplied image is public/molly-the-predictor.jpg. The profile data must match the Worker profiles.js. The form does not transmit answers to unrelated services or read the inbox. Google Fonts are optional network-loaded styling.
