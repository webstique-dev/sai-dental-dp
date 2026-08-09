# Task 16 — Final QA, Security & Production-Readiness Report

**Scope:** Full audit and targeted fixes across the dental clinic platform (Express + Mongo backend, React/Vite frontend). No new features were added; only real bugs, security gaps, and production-readiness issues were addressed.

**Date:** 2026-08-09

---

## 1. What was audited

- Server: routes, controllers, services, models, middleware, config (`env.js`, `db.js`, CORS, security headers, error handler), JWT auth, RBAC, audit trail.
- Client: `App.jsx`, routes, protected routes, nav config vs actual route guards, all portal pages, public pages, services, hooks, utils.
- Database: model indexes, price-snapshot integrity, FEFO stock movements, appointment/patient guards.
- Financials: invoice totals, payment/refund balance safety, append-only payment history, immutable finalized invoices.
- Build/test: client production build + ESLint; full server integration suite (auth, billing, pharmacy/inventory, consultation, diagnosis, treatment, tooth, prescription).

### Hardcoded/found issues (all verified in code, not guesses)

**Server**
- `env.js` shipped dev-only JWT fallback secrets usable in production.
- `batch.controllers.js` read `req.params.id` where the route declared `:medicineId` — medicine-scoped batch/movement lists were unfiltered.
- Invoice `update()` lacked the `> 100%` discount guard that `create()` had.
- Payment & refund flows used check-then-write on a Payment aggregate → concurrent double-pay / over-refund race.
- `/auth/refresh` had no rate limit (login did).
- `followUp.routes.js` let receptionists mark follow-ups `complete` (clinical action); PRD §15 grants them scheduling only.
- `dispensing.controllers.js` threw a bare `Error` with `statusCode` instead of the app's `ApiError`.

**Client**
- `api.js` had no 401/session-expiry handling and joined a hardcoded trailing-slash API base.
- Seven patient-scoped pages used `window.history.replaceState(...)` which React Router's `useSearchParams()` never sees → effects keyed on `fromPatient` never re-ran and reload calls passed `null`.
- `nav.js` role lists didn't match route guards for diagnoses/treatment-plans/prescriptions/investigations.
- Portal pages were eagerly bundled (single large chunk) — no code splitting.
- Public `HomePage` ignored the loading/error state its data hook already exposes.
- Dead files unused anywhere: `client/src/hooks/useApiHealth.js`, `client/src/services/healthService.js` plus unused exports (`listInvoices`, `getPayment`, `getMedicine`, `refreshSession`).
- `ModulePlaceholder` labels listed modules that are now real routes.
- `FollowUpsPage` had a `isOpen &&` (truthy function reference) bug and used `fromPatient` (null) in reloads.
- A11y gaps: tooth-details dialog lacked `role="dialog"`/`aria-modal`/labels; patient-search inputs had no accessible label.
- `.env.example` files were gitignored, so the schema couldn't be committed.

---

## 2. Fixes applied

### Server
1. **`server/src/config/env.js`** — production now fails fast if `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, or `CLIENT_URL` is missing. Dev-only fallback secrets never reach production.
2. **`server/src/controllers/batch.controllers.js`** — `listForMedicine`/`movements` now use `req.params.medicineId`.
3. **`server/src/services/invoice.service.js`** — `update()` now rejects negative / `> 100%` percentage discounts (matches `create()`).
4. **`server/src/services/payment.service.js`** — payment and refund reservations are now **atomic conditional `$inc`** on the invoice (`balancePaise`/`amountPaidPaise`), closing the double-pay / over-refund race. `refreshPaidTotals()` in `invoice.service.js` recomputes authoritatively from payment docs, so consistency is preserved.
5. **`server/src/routes/auth.routes.js`** — added `refreshLimiter` (200/15 min) on `POST /auth/refresh`.
6. **`server/src/routes/followUp.routes.js`** — `complete` restricted to `admin, doctor`. Receptionists keep schedule/cancel/scheduling per PRD §15. Client button hidden for receptionists.
7. **`server/src/controllers/dispensing.controllers.js`** — bare `Error` replaced with `ApiError(400, …)`.

### Client
8. **`client/src/services/api.js`** — API base trailing slash normalized; on a 401 with an access token, tokens are cleared and the user is redirected to `/login?redirect=<current>`. Login/refresh are exempt from the redirect.
9. **`client/src/pages/portal/{Billing,Payments,FollowUps,Diagnoses,Investigations,TreatmentPlans,TreatmentRecords,Prescriptions}Page.jsx`** — replaced `window.history.replaceState` with `setParams({ patient })` from `useSearchParams`, so `fromPatient`-keyed effects re-run and reloads use the resolved id. Fixed `FollowUpsPage` `isOpen &&` bug and `null` reload.
10. **`client/src/config/nav.js`** — roles aligned with `App.jsx` guards (diagnoses/treatment-plans get `admin`; prescriptions/investigations get `admin`, `receptionist`).
11. **`client/src/App.jsx`** — portal pages now load via `React.lazy` + `Suspense` (`PageFallback`). Main chunk dropped from bundling all portal pages.
12. **`client/src/pages/public/HomePage.jsx`** — surfaces the doctors loading/error states from `usePublicSiteData()`.
13. **`client/src/pages/portal/ModulePlaceholder.jsx`** — label map now only lists genuinely upcoming modules.
14. **`client/src/components/tooth/ToothDetailPanel.jsx`** — dialog has `role="dialog"`, `aria-modal`, `aria-label`, and a labeled close button. Patient-search inputs got `aria-label="Search patients"` on 10 pages.
15. **Dead code removed** — `useApiHealth.js`, `healthService.js`, and unused service exports (`listInvoices`, `getPayment`, `getMedicine`); `pharmacyService.listMedicines` now builds a real query string (unused `params` were being passed to `fetch`).
16. **`.gitignore`** — `.env.example` files are now committable while all real `.env*` stay ignored.

---

## 3. Verification

### Server integration suite — ALL PASS
```
test:auth               → ✓ ALL AUTH TESTS PASSED (login/refresh/RBAC/logout/ratio)
test:billing            → ✓ ALL BILLING CHECKS PASSED (price snapshots, overpay/refund guards,
                           finalized immutability, concurrency, audit trail, RBAC)
test:pharmacy-inventory → ✓ ALL PHARMACY+INVENTORY CHECKS PASSED (FEFO, partial dispense,
                           expired-batch skip, stock-adjust authz, concurrent dispensing, returns)
test:consultation       → ✓ PASS
test:diagnosis          → ✓ PASS
test:treatment          → ✓ PASS
test:tooth              → ✓ PASS
test:rx                 → ✓ PASS
```

### Client
```
npm run lint  → clean (no errors/warnings)
npm run build → ✓ production build, 32 entry chunks (portal pages now code-split via React.lazy)
```

### Clean-start smoke (in-memory Mongo + seeded roles)
```
public /api/health ✓ · nosniff/X-Frame-Options/Referrer-Policy headers ✓ · admin login ✓
GET /me ✓ · refresh issues new access token ✓ · protected route 401 without token ✓
```

---

## 4. Known remaining items (accepted, no code written)

- Patients / Appointments / Check-in / Users / Roles / Clinic Settings / Audit Logs are **placeholder-only** modules (nav + placeholder route, no backend routes/pages). These are scope-scaffolding for future phases, not bugs — flagged here so they're explicit.
- Payment/inventory operations rely on MongoDB **aggregates + atomic conditional updates** rather than multi-document transactions (the DB connection is not a replica set). Balance safety is enforced server-side and verified by the billing/inventory tests; multi-document transactions would future-proof this.
- Invoice/print "deduct current line totals from client" asserts are display-only; the server recomputes authoritative totals (verified by the price-snapshot tests).
- Suggested **future hardening** (not required for MVP): helmet + strict CSP, HSTS in production behind HTTPS, WebSocket/HTTP connection pooling for the single DB URI, and a refresh-token rotation store.

---

## 5. Environment & deployment requirements

Copy the committed examples and fill real values; never change the gitignored `.env` into the repository.

### Server (`server/.env`)
```
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb://<host>:<port>/sai_dental
CLIENT_URL=https://<your-frontend-domain>
JWT_SECRET=<long random string>
JWT_REFRESH_SECRET=<long random string, different from above>
JWT_ACCESS_EXPIRES=15m        # optional
JWT_REFRESH_EXPIRES=7d        # optional
EXPIRY_WARNING_DAYS=60        # optional
```
Production **fails to start** if `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, or `CLIENT_URL` are unset (enforced in `server/src/config/env.js`).

### Client (`client/.env`)
```
VITE_API_URL=/api   # same-origin via reverse proxy, OR http(s)://<api-host>/api
```

### Deploy notes
- Serve the built `client/dist` behind any static host/CDN; reverse-proxy `/api` to the Node server, or set `VITE_API_URL` to the server origin.
- The server enforces CORS against `CLIENT_URL` in production and rate-limits login/refresh; put the API behind TLS for production use.
- On first boot run the seed script if a seed dataset is wanted (`server/src/utils/seed.js` — dev-only credentials).

---

## 6. Files changed (29)

**Server:** `config/env.js`, `controllers/batch.controllers.js`, `controllers/dispensing.controllers.js`, `routes/auth.routes.js`, `routes/followUp.routes.js`, `services/invoice.service.js`, `services/payment.service.js`

**Client:** `App.jsx`, `config/nav.js`, `index.css`, `services/api.js`, `services/invoiceService.js`, `services/paymentService.js`, `services/pharmacyService.js`, `components/tooth/ToothDetailPanel.jsx`, `pages/portal/{Billing,Payments,FollowUps,Diagnoses,Investigations,TreatmentPlans,TreatmentRecords,Prescriptions,Consultations,ToothChart,ModulePlaceholder}Page.jsx`, `pages/public/HomePage.jsx`

**Removed:** `client/src/hooks/useApiHealth.js`, `client/src/services/healthService.js`
**Added:** `client/.env.example`, `server/.env.example` (now commit-able), `QA_REPORT.md`
**Repo:** `.gitignore`