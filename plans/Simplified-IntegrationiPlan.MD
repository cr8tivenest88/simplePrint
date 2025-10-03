# Simplified Integration Plan — B2‑Lite (Seamless Div Mount)

## 0) Intent (one sentence)
Node provides a tiny form widget that mounts into a specific div on a WordPress page, inherits the page’s theme styles, submits to Node for calculation, and WordPress saves the returned payload.

## 1) End‑to‑end flow (8 clear steps)
1. User opens a WordPress page that contains a placeholder div for the quote form.
2. The page loads a small JS module from your Node host.
3. That module mounts the form UI inside the div (no iframe, no Shadow DOM), so it looks native to the theme.
4. User fills the form and submits.
5. The widget calls Node’s calculator API and receives a structured payload (totals, components, meta).
6. The widget hands the payload to WordPress via a simple callback hook on the page.
7. WordPress saves it through your REST endpoint as a CPT entry tied to the logged‑in user.
8. The page shows totals and “saved” status, optionally linking to “My Quotes”.

## 2) What runs where (scope & responsibilities)

### Node (calculator host)
- Serves one small, versioned widget file that mounts into the provided div and renders semantic, minimal HTML.
- Exposes one calculator API that validates inputs and returns the payload.
- Enforces CORS allow‑list (your WP domains only), rate limiting, and input validation.
- Emits stable payload fields your WP storage expects.

### WordPress (website & storage)
- Renders the placeholder div and loads the Node widget file.
- Passes initial options (product, defaults, optional theme class names) to the widget.
- Receives the computed payload and saves it through a WP REST route into CPT `quote_request`.
- Shows results and success/failure UI to the user.

## 3) Styling & UX (seamless by design)
- The widget renders in the page’s light DOM, so it inherits your theme’s fonts, colors, and spacing automatically.
- Optionally pass a “class mapping” (your theme’s button and row classes) so the form matches specific components.
- Keep the widget’s markup semantic and minimal. Ensure labels for every control and accessible error messages.

## 4) Data & event contracts (human‑readable)

### Form inputs (minimum viable)
- productId
- quantity (positive integer)
- color (for example, “4/4” or “4/1”)
- optional: size, stock, coating, versions array, as needed

### Calculator payload (returned by Node)
- echo of input fields (productId, quantity, etc.)
- totals: unit, setup, grandTotal
- meta: engine version, compute duration
- optional: line items, tax or shipping, production notes, machine picks

### Widget events (simple lifecycle)
- ready: mounted and interactive
- loading: request in flight; disable button and show spinner if desired
- payload: final structured result; WordPress should display and save
- error: user‑facing message; do not attempt save

## 5) Security & compliance (essentials only)
- CORS: allow only your exact WP origins for both the widget file and the API.
- Preflight: calculator API must respond correctly to OPTIONS.
- CSRF on WP save: use the standard WP Nonce in the save request.
- Rate limits: per IP, and optionally per user if you add JWT later.
- Input validation: strict numeric and enum checks to protect the calc and logs.
- HTTPS everywhere; set strong cache headers for the widget file.

Optional for later:
- Short‑lived JWT from WP to Node (user and company context, per‑user quotas, personalization).
- CSP updates in WP to permit the Node host for scripts and network calls.

## 6) Configuration checklist (3 knobs)
1. Node: allowed WP origins (production and staging).
2. WordPress: Node host URL (staging and production).
3. WordPress: optional theme class map to match buttons and layout rows.

## 7) Rollout plan (fast and safe)
- Staging: point a single WP test page at your Node staging host; verify form renders with theme styles, payload returns, and save works.
- Schema freeze: agree the payload fields v1; document them for developers and support.
- Production: switch the page to the production widget file and API; monitor logs.
- Incremental enablement: add the widget to more product pages after confidence builds.

## 8) Testing plan (what to verify)
- Visual: form looks fully native to the theme on desktop and mobile.
- Validation: numeric bounds, required fields, and friendly inline messages.
- API: preflight success; good inputs return payload; bad inputs return readable errors.
- Save: CPT entry is created with correct author and metadata; visible in “My Quotes”.
- Performance: calculator latency within your target (for example, under 300 ms p95).
- Resilience: handle network timeouts, rate‑limit responses, and partial outages gracefully.

## 9) Versioning & maintenance
- Version the widget file (semantic version in filename) so WP pages can pin a known‑good build.
- Keep calculator API backward‑compatible for v1; if breaking fields are required, publish v2 paths and migrate pages gradually.
- Maintain a small changelog: fields added, deprecated, and any UX tweaks that affect themes.

## 10) Risks & mitigations
- Styling drift across themes: use the class map to target each theme and keep HTML semantic.
- Over‑strict CORS: document both staging and production WP origins and add them to Node.
- Payload growth: document size limits; store large details as references if needed.
- Rate limits blocking legitimate users: whitelist office IPs or apply per‑user budgets with JWT.

## 11) Acceptance criteria (done = true)
- The form renders inside a WP div and inherits the active theme styles without extra CSS.
- Submissions return a correctly structured payload for at least one live product.
- WordPress saves the payload as a CPT entry under the logged‑in user.
- Error, loading, and success states are visible and accessible.
- Logs show calculator latency and save outcomes, with no CORS or CSP violations in the console.
