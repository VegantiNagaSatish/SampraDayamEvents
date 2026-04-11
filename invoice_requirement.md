# Invoice feature — requirements & architecture decisions (draft for review)

**Project context (today):** Static site deployed to **Firebase Hosting** (`public/`, SPA rewrites). There is **no server or database** in the current Firebase config—only file hosting. Browsers cannot safely hold “source of truth” business data by themselves.

**Purpose of this document:** Capture what the invoice feature should do, what data you will provide later, and which backend approach fits—so you can approve direction before implementation.

---

## 0. Confirmed scope (your direction)

- **Who creates invoices:** **Only you or designated admins.** Customers **do not** log in to create, edit, or manage invoices.
- **Persistence:** Invoices must be **saved and kept** as business records—not only “create → download PDF → delete.” The system should support a **durable history** (list, open, update where policy allows, regenerate PDF from stored data, and optional soft-delete or archive). **Download alone is not enough** without stored source data.

### 0.1 Access from the website (implemented)

- **Navigation:** The main site header uses **Admin** (not “Invoices”) linking to `admin-dashboard.html`. If the user is not signed in, they are sent to **Admin sign in** (`invoice-login.html`). After login, **Admin** opens `admin-dashboard.html` with two choices: **Items list** (`invoice-catalog.html`) and **Invoices** (`invoice-admin.html`).
- **Admin sign-in:** **Phone number + password** on the login form. Firebase does not support “phone + password” as one native type, so the app maps the **10-digit phone** to a synthetic **email** for **Email/Password** auth:  
  `{10-digit-phone}@invoice.sampradayam.events`  
  You must create **that exact user** in Firebase Console (Authentication → Email/Password) with the password you want. **Do not put the password in the website source code**—only you type it at login; it lives in Firebase Auth.
- **After login:** Admin can **list** invoices, **create** new ones, **save drafts**, **edit drafts**, and **mark complete** (assigns the next `INV-n` number and locks status to **completed** in v1).
- **Price list (`invoice-catalog.html`):** Admin maintains **catalog items** (name + default unit price) in Firestore collection `catalogItems`. On the invoice editor, each line **chooses an item** from that list (label shows *name — ₹price*); **Custom description…** still allows one-off lines. Saved invoice lines store `description`, `price`, `qty`, `taxPercent`, and optional `catalogItemId`.

### 0.2 Status model (v1)

- **Draft:** Saved in Firestore; editable; no final invoice number (or optional working title only).
- **Completed:** Stored with assigned **Invoice#** (`INV-1`, `INV-2`, … via a counter in Firestore); treated as final for v1 (editing completed invoices can be added later).

---

## 1. Product goals

- [x] **Who creates invoices?** **Owner / admin only** (confirmed—not customer self-serve).
- [ ] **Who views or receives them?** (e.g. you send PDF by email, print, or optional customer **view-only** link—no customer authoring)
- [ ] **Primary workflow:** create → **save** → edit (drafts?) → issue/send → mark paid / void?
- [ ] **Branding:** use existing site styles / logo on PDF and web view?

---

## 2. Functional requirements (fill in or strike what you do not need)

### 2.0 Saved invoices (required)

- **Store every invoice** in a database (e.g. Firestore document per invoice) with line items, totals, customer snapshot, dates, status, and invoice number.
- **Admin UI:** list all saved invoices (filter/search by customer, date, number, status), open for view/edit per your rules, **save** changes, **generate or re-download PDF** from the saved record.
- **Not the primary model:** disposable flows where the invoice exists only in the browser or only as a one-time PDF with no authoritative saved copy.

### 2.1 Invoice content

- [ ] Invoice number format and rules (auto-increment, prefix, reset yearly, etc.)
- [ ] Line items: description, quantity, unit price, tax per line or global?
- [ ] Totals: subtotal, discounts, tax, shipping, grand total, currency
- [ ] Parties: your business legal name, address, tax ID; customer name, address, email
- [ ] Dates: issue date, due date, service period (optional)
- [ ] Notes / terms / payment instructions (bank, UPI, etc.)
- [ ] Attachments (optional): contracts, photos—usually out of scope for v1

### 2.2 Lifecycle

- [ ] Draft vs issued (immutable after send?—still **saved** in both cases)
- [ ] Send: email with PDF, or “copy link” only? (customer is **recipient**, not author)
- [ ] Status: draft, sent, viewed (optional), paid, overdue, void
- [ ] Partial payments / deposits (yes/no)
- [ ] Credit notes / refunds (yes/no for v1)
- [ ] **Delete policy:** hard delete vs archive/void only (recommend archive for audit trail)

### 2.3 Reporting & export

- [ ] List/search invoices by customer, date, status
- [ ] Export CSV for accounting (optional)
- [ ] Simple dashboard totals (optional)

---

## 3. Non-functional requirements

- **Security:** Invoices often contain PII and money data—must not be world-readable URLs without auth. **Admin routes** (create/edit/list) require **authenticated owner/admin** only.
- **Integrity:** Invoice numbers and totals should not be tamperable by the client/browser alone.
- **Availability:** If the feature is business-critical, data must live in a durable store (not only `localStorage`).
- **Compliance:** Depending on region, you may need retention, tax invoice rules, and audit trail—note jurisdiction: _____________
- **Cost:** Firebase free tier vs expected volume (documents, storage, function invocations).

---

## 4. “Do we need a database?” — plain answer

| Approach | What it is | Good for | Limitations |
|----------|------------|----------|-------------|
| **Hosting only (static)** | HTML/JS/CSS files | Marketing site, forms that email third parties | **Not** a system of record; anyone can change client-side data; no secure multi-user storage |
| **Firebase = platform** | Hosting + optional **Firestore** / **Realtime DB** + **Auth** + **Cloud Functions** + **Storage** | Full apps with users, rules, server-side logic | You adopt “Firebase as backend,” not “no database” |
| **Separate DB** (Postgres, etc.) | Traditional server + DB | Heavy reporting, complex accounting | Needs a server (Cloud Run, etc.) or BaaS |

**Conclusion for a real invoice feature:** You almost always need **durable storage + access control**. On Firebase, that usually means **Firestore (or Realtime DB) + Authentication + Security Rules**, and often **Cloud Functions** for PDF generation, email, and sensitive operations. That **is** “using Firebase”—you do not have to use a non-Firebase database unless you want one.

**Out of scope for your case:** A flow with **no saved invoice records** (browser-only or “PDF then discard”)—you require **stored** invoices and **admin-only** authoring, so a **database (e.g. Firestore) is required.**

---

## 5. Recommended architecture options (pick one direction for v1)

### Option A — “Firebase-native” (fits your current hosting)

1. **Firestore:** invoices, customers, counters (or Cloud Function for atomic invoice numbers).
2. **Firebase Auth:** **owner + admin roles** for all invoice create/edit/list/save operations. (Optional later: signed **view-only** links for customers to see a PDF—still not authoring.)
3. **Security Rules:** enforce who can read/write which documents.
4. **Cloud Functions (optional but typical):** generate PDF (e.g. PDFKit), send email (SendGrid/SES), webhooks.
5. **Firebase Storage (optional):** store generated PDFs if you want stable download links with rules.

**Pros:** Stays on one GCP/Firebase bill, scales, rules-based security.  
**Cons:** You learn Rules + Functions; cold starts and quotas to watch.

### Option B — Static site + third-party invoicing (Stripe Invoicing, Zoho, etc.)

Embed or link out; minimal custom backend.

**Pros:** Fastest if their features match yours.  
**Cons:** Less control, ongoing fees, branding/UI constraints.

### Option C — Separate backend (e.g. Node + Postgres on Cloud Run)

**Pros:** Maximum flexibility for accounting integrations.  
**Cons:** More ops and code than Option A for a small site.

---

## 6. Data you will provide later (checklist)

Please prepare (can be pasted in a follow-up message or doc):

1. **Your business details** (as they must appear on PDF): legal name, address, phone, email, tax/GST ID if any, logo file.
2. **Invoice numbering rule** you want.
3. **Tax logic** (none / single rate / multi-rate)—and whether tax-inclusive or exclusive.
4. **Payment methods** text to show on invoices.
5. **User model:** **Admins only** for invoice management (you + any staff you designate). Customers **do not** get accounts for invoicing.
6. **Volume guess:** invoices per month (rough).
7. **Must-have vs nice-to-have** for first release.

---

## 7. Open questions (decisions needed before build)

1. **Single-tenant (only your business)** or **multi-tenant** (SaaS for many businesses)?
2. **Email sending:** your own domain (SPF/DKIM) or Firebase/third-party?
3. **PDF:** generate server-side (recommended) or client-side only?
4. **Customer access (optional):** If you share a link to view/download a PDF, should it be tokenized / expiring / revocable? (Customers still never create invoices.)
5. **Backup / export:** need full data export periodically?
6. **Budget for paid APIs** (email, SMS, payment gateway)?

---

## 8. Suggested phased delivery

- **Phase 1:** Auth (owner/admin) + Firestore schema + **save/load** invoices + admin UI (create, edit, list, view) + on-screen printable layout; PDF from **stored** data.
- **Phase 2:** PDF export + email send + statuses (sent/paid).
- **Phase 3:** Payments integration, reminders, reporting—if needed.

---

## 9. One-line summary for stakeholders

> Today the site is static on Firebase Hosting only. Invoices are **owner/admin-only** and must be **persisted** (not disposable PDFs). That implies **Firestore + Auth (+ optional Cloud Functions)** on Firebase—not Hosting alone, and not a separate DB unless you choose one.

---

**Next step:** Mark your choices in sections 1–2 and 7, and send the data from section 6. After that, implementation can be scoped with a concrete schema and UI flow.

---

## 11. Firebase setup (required once per project)

1. In [Firebase Console](https://console.firebase.google.com/), open your project (same one used for Hosting).
2. **Build → Authentication → Sign-in method:** enable **Email/Password**.
3. **Build → Authentication → Users → Add user:**  
   - Email: `8309133572@invoice.sampradayam.events` (replace `8309133572` if you use another admin phone).  
   - Password: choose a strong password (**change it if it was ever shared in chat**).
4. **Build → Firestore Database:** create database (production mode), then deploy **Security Rules** from this repo (`firestore.rules`) so only signed-in users can read/write `invoices`, `settings`, and **`catalogItems`** (price list). If rules were deployed before the catalog existed, run `firebase deploy --only firestore:rules` again after pulling the latest `firestore.rules`.
5. **Project settings → Your apps → Web app:** copy the config into `public/js/firebase-config.js` (replace the placeholder object).
6. Deploy: `firebase deploy` (or deploy Hosting + Firestore rules together).

---

## 10. Reference sample: `INV-7.pdf` (your file)

This mirrors the structure observed in your sample tax invoice so the eventual PDF/HTML matches your current format.

### 10.1 Header (seller)

- Business name (Telugu + Latin branding as on letterhead)
- Phone: multiple numbers (e.g. `+91 …`, `+91 …`)
- Email: e.g. `sampradayam.events393@gmail.com`
- Document title: **TAX INVOICE**

### 10.2 Bill to & meta

- **BILL TO:** customer name (sample: *ugandra yelamati*)
- **Invoice#** (e.g. `INV-7`)
- **Invoice Date:** `DD/MM/YYYY` (sample: `27/01/2026`)

### 10.3 Line items (table)

| Column (concept) | Notes |
|------------------|--------|
| `#` | Row index |
| **DESCRIPTION** | Long free text; can include multi-line scope (quantities of people, what’s included, which day) |
| **QTY** | Integer quantity |
| **PRICE** | Unit price in **₹** with thousands separators (e.g. `₹2,00,000.00`) |
| **TAXABLE AMOUNT** | Line extended amount before tax |
| **TAX** | Amount (sample lines show **₹0.00**) |
| Tax rate column | Shown as **0.0%** per line in sample |
| **TOTAL** | Line total (matches taxable when tax is zero) |

### 10.4 Footer / totals

- **AMOUNT IN WORDS:** (e.g. *Seven Lakh Two Hundred Ninety Rupees Only/-*)
- **TAXABLE AMOUNT** → sum of taxable column
- **TAX** → total tax (sample: **₹0.00**)
- **GRAND TOTAL** → final rupee total
- Closing line: *For, [business name]*
- **AUTHORIZED SIGNATURE** area
- **Pagination:** “Page X of Y” (sample spans 2 pages due to long descriptions)

### 10.5 Implementation notes from sample

- Currency: **INR (₹)**; Indian-style **lakhs grouping** in displayed numbers (`2,00,000`).
- Tax is **0%** in this sample but columns exist—model should support non-zero GST later.
- Descriptions are **very long**; PDF generator must wrap text and allow multi-page tables.
- **Amount in words** should be generated from the grand total (Indian English wording).
