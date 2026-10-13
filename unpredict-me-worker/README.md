# UnPredict Me signup and reading Worker

Uses the exact supplied values: BREVO_LIST_ID=3, BREVO_SENDER_EMAIL=invite@unpredictme.com, BREVO_SENDER_NAME=Annie @UnPredictMe. BREVO_API_KEY must be installed as a Worker secret; its value was not supplied and is never included in the ZIP. Molly remains the character while Annie remains the configured email sender.

## Required configuration

| Setting | Value / purpose |
|---|---|
| BREVO_API_KEY | Secret from Brevo; configure in this Worker’s Settings > Variables and Secrets, then deploy the setting. |
| BREVO_LIST_ID | 3 |
| BREVO_SENDER_EMAIL | invite@unpredictme.com |
| BREVO_SENDER_NAME | Annie @UnPredictMe |
| ALLOWED_ORIGINS | https://unpredictme.com,https://www.unpredictme.com; add exact preview origins if needed. |
| SIGNUP_RATE_LIMITER | Configured binding: 5 requests per minute per Cloudflare client IP. |
| EMAIL_RATE_LIMITER | Configured binding: 1 request per minute per hashed email. |

Rate limiter namespace IDs 8174301 and 8174302 are newly selected configuration values, not identifiers verified in your account. Check that they do not overlap another Worker’s rate-limiter namespaces before deployment. Cloudflare rate limits are local to a location and approximate, not a global delivery cap. Both bindings are required. No database or Turnstile is included.

Existing secrets shown on a Pages project do not automatically become this separate Worker’s secrets. Install the API key on the Worker itself. Confirm Brevo list 3 exists, its intended audience is correct, and invite@unpredictme.com is an authenticated allowed sender before testing real delivery.

## Required Brevo attributes

In Brevo, open Settings > Contacts > Contact attributes (or Contacts > Settings > Contact attributes in your interface), choose Add a new attribute, select the Normal contact category, and create these exact uppercase names:

| Attribute | Type | Stored value |
|---|---|---|
| UPM_VIBE | Text | Selected personality name |
| UPM_LAST_REQUEST_MARKETING | Boolean | Latest submitted optional marketing checkbox value |
| UPM_READING_REQUESTED | Boolean | true for the requested reading |
| UPM_MARKETING_CONSENT | Boolean | true only when the visitor affirmatively opts in |

Email uses Brevo’s built-in email field. The Worker never sets emailBlacklisted=false or resets previous consent when someone requests another reading. An unchecked optional box is recorded in UPM_LAST_REQUEST_MARKETING; it is not an unsubscribe action. For later marketing, use UPM_MARKETING_CONSENT=true plus Brevo’s existing subscription/suppression rules, not every member of list 3. Configure unsubscribe handling for future marketing campaigns in Brevo.

The requested prediction email is transactional and contains no promotional affiliate links. No automatic launch campaign or marketing email is sent by this code.

## Worker deployment

- Build command: blank (plain JavaScript Worker; Wrangler bundles during deployment).
- Deploy command: `npx wrangler deploy`
- Root: `/` if this folder is repository root; `/unpredict-me-worker` in the combined ZIP layout.
- Production branch: select the actual repository branch.
- Worker name in this new configuration: unpredict-me-signup.
- Runtime entry: src/index.js.
- Copy all variables/secrets and bindings into the deployed Worker environment as appropriate.

LOCAL WRITE / NO SEND — Install the pinned deployment tooling.
```bash
npm ci
```
READ ONLY / NO SEND — Run mocked tests; no external contacts or emails.
```bash
npm test
```
LOCAL WRITE / NO SEND — Validate and bundle the Worker without deployment.
```bash
npm run check
```
DEPLOY / NO SEND — Publish the configured Worker; this does not itself submit a contact.
```bash
npx wrangler deploy
```
Run commands from this folder. Deployment requires your authenticated Cloudflare account. Do not add a fake key to source files. Local development with real credentials can make live Brevo calls; the tests mock those calls.

## Routing and endpoint

GET /health returns a basic liveness response, not verification of Brevo credentials.
POST /api/signup performs validation, origin checks, bounded JSON parsing, honeypot checks, rate limiting, contact upsert and requested reading delivery. Use the dashboard to configure Worker routes for unpredictme.com/api/* and optionally www.unpredictme.com/api/* on the active domain zone, or use the returned workers.dev URL in frontend config. No account-specific route has been invented or installed.

No automatic retry occurs after an ambiguous email timeout. Contact save success with email failure returns ok=true and emailSent=false; the frontend reports that distinction. Repeat submissions update the contact; permitted repeat requests may send another requested reading. A network timeout can leave an unknown upstream result, so avoid rapid retries. Server error responses never expose Brevo errors, keys or email addresses.

## End-to-end checklist

1. Create all four Brevo attributes and verify list 3 and sender authentication.
2. Configure Worker secret, variables and rate-limit bindings; deploy, then configure routing/frontend URL.
3. Verify invalid email, honeypot, disallowed origin, and rate limit return visible errors without creating contacts.
4. LIVE WRITE / LIVE SEND: submit your own authorized test email once, optionally checking marketing updates.
5. Confirm contact list membership and all submitted values, receive the fictional reading, and verify the sender is Annie @UnPredictMe <invite@unpredictme.com>.
6. Confirm repeated submission updates rather than failing as a duplicate, subject to rate limits; verify a new reading request does not remove suppression or prior marketing consent.
7. Check partial failures, mobile layout, keyboard controls and reduced motion.

Validation performed: React production build, mocked server tests, profile mapping checks and Wrangler dry-run. Live Brevo account, DNS routing, sender authentication, browser appearance and actual email delivery are not verified by this archive.

Official references: https://developers.brevo.com/reference/create-contact ; https://developers.brevo.com/reference/send-transac-email ; https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
