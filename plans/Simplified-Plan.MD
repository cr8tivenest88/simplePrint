

## 12) Users & Access (WordPress)

1) Identity & sessions
- WordPress is the source of truth for users. Use the normal WP login/register (or WooCommerce “My Account” if present).
- The quote page requires login; guests are redirected to sign in and then returned to the page.
- Frontend uses the existing WP session; Node remains stateless for identity in the basic flow.

2) Roles & permissions
- Roles:
  - Customer/User: create quotes; view only their own quotes.
  - Agent/CSR (optional): create quotes for others; view quotes for their company.
  - Admin/Manager: view all quotes and manage settings.
- Capabilities (conceptual): quote_create, quote_view_own, quote_view_company, quote_view_all.

3) Ownership model for quotes
- Each quote is stored as a custom post type entry with:
  - post_author set to the current user (ownership).
  - metadata such as company_id (if multi-tenant), product_id, and the saved payload.
- Visibility rules are enforced by role: users see own, agents see company, admins see all.

4) “My Quotes” experience
- Provide a dashboard page listing the user’s quotes with filters (product, date, status).
- Detail view renders totals from the payload.
- Optional actions: duplicate/re-quote, export/download, convert to order.

5) Save and access control
- Saving occurs through a WordPress REST endpoint that requires the user to be logged in.
- Minimal validation on inputs; payload stored, post_author assigned, company_id attached if applicable.
- Listing and detail routes filter by current user role and scope (own, company, all).

6) Company / organization handling (multi-tenant)
- Store company_id on the user profile.
- Store company_id on each quote.
- Enforce company-scoped queries for Agent/CSR dashboards; admins bypass scope.

7) Logged-out users policy
- Recommended: block guest quoting; prompt login first.
- Optional: support a guest draft in session and require login before saving; attach the draft to the user upon login.

8) Security & privacy
- CSRF protection via WordPress nonces when saving.
- CORS applies only to Node assets and API; WordPress REST is same-origin.
- Store only necessary fields; avoid PII in payload unless needed.
- Ensure quotes are included in user data export/erasure workflows.

9) Auditing & rate limits
- Log who created and updated a quote, with timestamps and source IP.
- Throttle excessive saves per user or IP to prevent abuse.
- Optional moderation for unusually large totals or anomalous patterns.

10) Optional enhancements (later)
- Admin impersonation with explicit audit trail.
- Single sign-on or social login to reduce friction.
- Short-lived JWT from WordPress to Node to enable personalization and per-user rate limits within the calculator.

11) Acceptance checks (user handling)
- Guests are redirected to login before quoting.
- After login, the form mounts correctly and inherits theme styles.
- Saving creates a quote tied to the logged-in user (and company_id if used).
- “My Quotes” shows the correct scope per role (own, company, all).
- No CORS or CSRF warnings appear; user data exports include quotes.

