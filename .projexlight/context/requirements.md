# Requirements - Quick Prototype Sprint

## Project: Bidwork

BidWork is an AI-powered two-sided marketplace where homeowners upload videos and photos of their home projects and receive an AI-generated scope of work with photo evidence per task, an editable task list, and a calculated bid range (floor to ceiling) — all before any contractor is involved.

Contractors receive pre-scoped, photo-documented, homeowner-approved jobs with a defined bid range. They bid within that range, compete on quality and speed rather than price alone, and close jobs faster with less rework.

**The core innovation:** AI understands the job first. Humans refine. Pricing is bounded. Contractors bid informed.

This is not a lead marketplace. This is a **job-definition engine + controlled bidding marketplace** — the operating system for home services execution.

## Sprint Overview

Quick prototype sprint for generated project structure

## Epics

### BidWork Admin Portal (Separate Application)

A standalone admin dashboard application with its own URL, login, and deployment. This is a separate React app (e.g., admin.bidwork.com) exclusively for BidWork platform administrators. It is NOT part of the main BidWork client app. Admin users authenticate via a separate admin-only login page. The portal provides user account management across all 3 user types (Homeowners, Contractors, Skilled Labor), subscription management, bid price rule engine configuration, and platform analytics. The admin portal connects to the same backend API but uses admin-specific endpoints protected by admin role middleware.

### Contractor Selection, Contracting, Payment & Workflow Automation

End-to-end automation that takes a homeowner-approved bid through to job completion and receipt. Flow: (1) homeowner shortlists 1–3 bids by rank and clicks Select & Notify on the chosen bid, which sends a BidWork-branded email + in-app alert and moves the bid to approved_by_owner; (2) the contractor clicks Accept Offer, triggering automatic generation of a legal work order/contract document for both parties to e-sign; (3) BidWork collects a 5% deposit from the homeowner before signature; (4) once both parties have signed, the deposit is recognized as the BidWork admin fee and full street addresses + contact details are revealed to both parties so work can begin; (5) on completion the contractor uploads a Completed Workorder document, the homeowner acknowledges and signs it; (6) the homeowner pays the contractor directly (BidWork is not in this transaction); (7) the contractor marks payment received and BidWork generates a receipt that is emailed to the homeowner. A business-day-aware (Mon–Fri, holidays excluded) timer agent enforces deadlines: if the selected contractor does not acknowledge the offer within 24 working hours, an admin reminder email is sent; after 72 working hours the bid is auto-abandoned and the homeowner is notified to promote the next-ranked shortlisted bidder, restarting the same flow for that bid. The epic also delivers the workflow orchestration agent (state machine + audit trail) and the templated email/notification service that all of the above consume.

## Features

### Admin Authentication & Login Page

Separate admin-only login page at the admin portal URL. Admin users have a distinct role ('admin') in the users table. Login endpoint validates the user is an admin before issuing a JWT with admin claims. Non-admin users attempting to log in see an 'Unauthorized - Admin access only' error. JWT includes admin role for middleware validation. Session management with auto-logout on token expiry.

### Platform Analytics & Reporting (Admin Portal)

Admin portal analytics dashboard with multiple views: (1) Price Variance - avg user-set price vs actual contract price by category/location/time, (2) Platform Usage - active users, projects created, bids submitted, (3) Contract Allocation - bid-to-contract conversion rates, avg bids per project, (4) Revenue Analytics - tied to subscription data. Charts, filterable date ranges, exportable reports.

### Scheduled Status, Contractor Visit Confirmation & No-Show Escalation

After both parties approve the schedule and the homeowner pays the deposit, the bid moves to a Scheduled status. On or after the agreed start_date, the homeowner is asked to confirm whether the contractor has visited and discussed the work. If No, the homeowner is offered a one-click option to send a reminder email and is asked again after a configurable wait. If still No after the second check, the homeowner can mark the workorder as Abandoned-by-Contractor; this triggers FT-855 credit transfer to the next-ranked shortlisted bidder, increments the contractor abandonment_flag_count, and records a no-show audit row.

## Tasks

### [UNTRACKED] Define API specs for 8 APIs

## Untracked APIs Detected

**Total untracked APIs:** 8

These APIs were discovered during git hooks but were not created through ProjexLight task flow.

| # | Method | Endpoint | Route File |
|---|--------|----------|------------|
| 1 | GET | /api/catalogs/ | server/src/routes/catalogRoutes.ts |
| 2 | POST | /api/catalogs/ | server/src/routes/catalogRoutes.ts |
| 3 | GET | /search | server/src/routes/locationRoutes.ts |
| 4 | GET | /by-ids | server/src/routes/locationRoutes.ts |
| 5 | GET | /:id/zips | server/src/routes/locationRoutes.ts |
| 6 | POST | /stripe | server/src/routes/webhookRoutes.ts |
| 7 | POST | /api/auth/verify-email | server/src/routes/authRoutes.ts |
| 8 | POST | /api/auth/resend-code | server/src/routes/authRoutes.ts |

### Required Steps
For EACH API listed above:
1. Open the route file implementing the endpoint
2. Create a test definition JSON file in `tests/api_definitions/` with proper payload using `{{dynamic:...}}` or `{{cache:...}}` placeholders
3. Add a `// @governance-tracked` comment at the top of the route file (after imports)
4. On next `git push`, all APIs will be tested and tracked automatically

**Acceptance Criteria:**

### [TEST-DATA] Create test definitions for 66 APIs

## Test Definitions Missing

**Total APIs without test data:** 66

The following APIs were discovered but have no test definition files in `tests/api_definitions/`.

| # | Method | Endpoint | Reason |
|---|--------|----------|--------|
| 1 | POST | /api/projects/:id/approve | Skipped - no captured values for path params: ['id'] |
| 2 | POST | /api/projects/:id/retry | Skipped - no captured values for path params: ['id'] |
| 3 | POST | /api/catalogs/items/:itemId/image/presign | Endpoint marked as 'manual' - requires manual testing |
| 4 | POST | /api/bids/:id/accept | Skipped - no captured values for path params: ['id'] |
| 5 | POST | /api/bids/:id/reject | Skipped - no captured values for path params: ['id'] |
| 6 | POST | /api/bids/:id/payment-proof/presign | Skipped - no captured values for path params: ['id'] |
| 7 | POST | /api/bids/:bidId/additional-work | Endpoint marked as 'manual' - requires manual testing |
| 8 | POST | /api/bids/:bidId/additional-work/:awoId/accept | Endpoint marked as 'manual' - requires manual testing |
| 9 | POST | /api/bids/:bidId/additional-work/:awoId/reject | Endpoint marked as 'manual' - requires manual testing |
| 10 | POST | /api/bids/:id/shortlist | Endpoint marked as 'manual' - requires manual testing |
| 11 | POST | /api/bids/:id/select-notify | Endpoint marked as 'manual' - requires manual testing |
| 12 | POST | /api/bids/:id/attachments/presign | Skipped - no captured values for path params: ['id'] |
| 13 | POST | /api/bids/:id/attachments | Endpoint marked as 'manual' - requires manual testing |
| 14 | POST | /api/bids/:id/messages | Endpoint marked as 'manual' - requires manual testing |
| 15 | POST | /api/bids/:id/accept-offer | Endpoint marked as 'manual' - requires manual testing |
| 16 | POST | /api/bids/:id/contract/sign | Endpoint marked as 'manual' - requires manual testing |
| 17 | POST | /api/bids/:id/deposit/intent | Endpoint marked as 'manual' - requires manual testing |
| 18 | POST | /api/bids/:id/contract/schedule | Endpoint marked as 'manual' - requires manual testing |
| 19 | POST | /api/webhooks/stripe | Endpoint marked as 'manual' - requires manual testing |
| 20 | POST | /api/projects/:id/promote-next-shortlisted | Endpoint marked as 'manual' - requires manual testing |
| 21 | GET | /api/projects/:id | Skipped - no captured values for path params: ['id'] |
| 22 | GET | /api/projects/:id/status | Skipped - no captured values for path params: ['id'] |
| 23 | GET | /api/admin/users/:id | Skipped - no captured values for path params: ['id'] |
| 24 | GET | /api/projects/:id/draft | Skipped - no captured values for path params: ['id'] |
| 25 | GET | /api/locations/:id/zips | Endpoint marked as 'manual' - requires manual testing |
| 26 | GET | /api/bids/questions/project/:projectId | Skipped - no captured values for path params: ['projectId'] |
| 27 | GET | /api/projects/:id/bid-summary | Skipped - no captured values for path params: ['id'] |
| 28 | GET | /api/bids/:id | Skipped - no captured values for path params: ['id'] |
| 29 | GET | /api/bids/:id/visit-status | Endpoint marked as 'manual' - requires manual testing |
| 30 | POST | /api/bids/:id/visit-confirmation | Endpoint marked as 'manual' - requires manual testing |
| 31 | POST | /api/bids/:id/visit-reminder | Endpoint marked as 'manual' - requires manual testing |
| 32 | POST | /api/bids/:id/abandon-no-show | Endpoint marked as 'manual' - requires manual testing |
| 33 | GET | /api/bids/contractor/:contractorId/reputation | Endpoint marked as 'manual' - requires manual testing |
| 34 | GET | /api/bids/:id/attachments | Skipped - no captured values for path params: ['id'] |
| 35 | GET | /api/bids/:id/messages | Skipped - no captured values for path params: ['id'] |
| 36 | GET | /api/bids/project/:projectId | Skipped - no captured values for path params: ['projectId'] |
| 37 | GET | /api/bids/:id/contract | Endpoint marked as 'manual' - requires manual testing |
| 38 | GET | /api/bids/:id/receipts | Skipped - no captured values for path params: ['id'] |
| 39 | PUT | /api/admin/users/:id/status | Skipped - no captured values for path params: ['id'] |
| 40 | PUT | /api/admin/rules/bid-price/:id | Skipped - no captured values for path params: ['id'] |
| 41 | POST | /api/bids/:id/payment-confirmed | Endpoint marked as 'manual' - requires manual testing |
| 42 | POST | /api/bids/:id/request-rating | Endpoint marked as 'manual' - requires manual testing |
| 43 | POST | /api/bids/:id/rating | Endpoint marked as 'manual' - requires manual testing |
| 44 | GET | /api/bids/:id/rating | Endpoint marked as 'manual' - requires manual testing |
| 45 | PUT | /api/projects/:id | Skipped - no captured values for path params: ['id'] |
| 46 | PUT | /api/projects/:id/tasks/:taskId/price | Skipped - no captured values for path params: ['id', 'taskId'] |
| 47 | PUT | /api/projects/:id/tasks/:taskId | Skipped - no captured values for path params: ['id', 'taskId'] |
| 48 | PUT | /api/admin/subscriptions/:id | Skipped - no captured values for path params: ['id'] |
| 49 | PUT | /api/bids/:id | Skipped - no captured values for path params: ['id'] |
| 50 | PATCH | /api/projects/:id/tasks/:taskId/visibility | Skipped - no captured values for path params: ['id', 'taskId'] |
| 51 | PATCH | /api/bids/:id/status | Endpoint marked as 'manual' - requires manual testing |
| 52 | PATCH | /api/bids/:id/messages/:messageId/read | Endpoint marked as 'manual' - requires manual testing |
| 53 | PATCH | /api/bids/:id/contract/schedule/approve | Endpoint marked as 'manual' - requires manual testing |
| 54 | PATCH | /api/bids/:id/contract/schedule/reject | Endpoint marked as 'manual' - requires manual testing |
| 55 | DELETE | /api/admin/rules/bid-price/:id | Skipped - no captured values for path params: ['id'] |
| 56 | DELETE | /api/projects/:id/media/:mediaId | Skipped - no captured values for path params: ['id', 'mediaId'] |
| 57 | DELETE | /api/bids/:id/shortlist | Endpoint marked as 'manual' - requires manual testing |
| 58 | DELETE | /api/bids/:id/attachments/:attachmentId | Endpoint marked as 'manual' - requires manual testing |
| 59 | POST | /api/catalogs/:catalogId/items | Skipped - no captured values for path params: ['catalogId'] |
| 60 | GET | /api/catalogs/:catalogId/items | Skipped - no captured values for path params: ['catalogId'] |
| 61 | GET | /api/auth/oauth/:provider/start | Endpoint marked as 'manual' - requires manual testing |
| 62 | GET | /api/auth/oauth/:provider/callback | Endpoint marked as 'manual' - requires manual testing |
| 63 | GET | /api/bids/:bidId/additional-work | Skipped - no captured values for path params: ['bidId'] |
| 64 | PUT | /api/bids/questions/:questionId/reply | Skipped - no captured values for path params: ['questionId'] |
| 65 | PUT | /api/catalogs/items/:itemId | Skipped - no captured values for path params: ['itemId'] |
| 66 | DELETE | /api/catalogs/items/:itemId | Skipped - no captured values for path params: ['itemId'] |

### Required Steps
For EACH API listed above:
1. Identify the route file that implements the endpoint
2. Create a test definition JSON file in `tests/api_definitions/`
3. Include proper payload with `{{dynamic:...}}` or `{{cache:...}}` placeholders
4. Add `dependsOn` if the API requires data created by another API
5. Add a `// @governance-tracked` comment at the top of the route file (after imports)

On next `git push`, all APIs will be tested and tracked automatically.

**Acceptance Criteria:**

### [AUTO-FIX] API Test Failures (1 APIs)

## Consolidated API Test Failures

**Total Failed APIs:** 34
**Generated:** 2026-04-30T03:34:10.823Z

**Feedback File:** `.projexlight/feedback/failed_tests_latest.json`
> Read this file for the most up-to-date error details. This file is always overwritten on each push.

---

### 1. POST /api/admin/auth/login

**Error:** Status 401 - Error: Authentication required
**Category:** Authentication Required (unauthorized)
**Severity:** error

**Request Body:**
```json
{
  "email": "default_test_user@example.com",
  "password": "DefaultTestPass123!"
}
```

**Response Body:**
```json
[object Object]
```

---

### 2. POST /api/profile/onboard

**Error:** Status 404 - <!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot POST /api/profile/onboard</pre>
</body>
</html>

**Category:** Resource Not Found (resource_missing)
**Severity:** warning

**Request Body:**
```json
{
  "phone": "+141555527810",
  "business_name": "Test User_47810",
  "office_address": "123 Main St, Austin TX 78701",
  "license_number": "CSLB-123456",
  "license_type": "General B",
  "category": "General Contractor",
  "years_experience": 5,
  "bio": "Experienced general contractor"
}
```

**Response Body:**
```json
[object Object]
```

---

### 3. POST /api/projects

**Error:** Status 404 - <!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot POST /api/projects</pre>
</body>
</html>

**Category:** Resource Not Found (resource_missing)
**Severity:** warning

**Request Body:**
```json
{
  "title": "Test User_47831",
  "description": "text_47831",
  "location_address": "878 Test Street",
  "urgency": "medium",
  "quality_tier": "standard"
}
```

**Response Body:**
```json
[object Object]
```

---

### 4. POST /api/projects/presign

**Error:** Status 404 - <!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot POST /api/projects/presign</pre>
</body>
</html>

**Category:** Resource Not Found (resource_missing)
**Severity:** warning

**Request Body:**
```json
{
  "project_id": "27dfd1ee-04e8-47aa-a844-534f06445e5c",
  "files": [
    {
      "name": "test-photo.jpg",
      "type": "image/jpeg"
    }
  ]
}
```

**Response Body:**
```json
[object Object]
```

---

### 5. POST /api/projects/confirm-media

**Error:** Status 404 - <!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot POST /api/projects/confirm-media</pre>
</body>
</html>

**Category:** Resource Not Found (resource_missing)
**Severity:** warning

**Request Body:**
```json
{
  "project_id": "a7489f68-48ca-43ab-a87d-f4750fc4d646"
}
```

**Response Body:**
```json
[object Object]
```

---

### 6. POST /api/admin/rules/bid-price

**Error:** Status 403 - Error: Admin access required
**Category:** Permission Denied (forbidden)
**Severity:** warning

**Request Body:**
```json
{
  "job_category": "text_47861",
  "min_price_percentage": 60
}
```

**Response Body:**
```json
[object Object]
```

---

### 7. POST /api/admin/service-fee

**Error:** Status 403 - Error: Admin access required
**Category:** Permission Denied (forbidden)
**Severity:** warning

**Request Body:**
```json
{
  "percent": 0.05,
  "notes": "text_47881"
}
```

**Response Body:**
```json
[object Object]
```

---

### 8. POST /api/profile/billing/signature/presign

**Error:** Status 404 - <!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot POST /api/profile/billing/signature/presign</pre>
</body>
</html>

**Category:** Resource Not Found (resource_missing)
**Severity:** warning

**Request Body:**
```json
{
  "filename": "signature.png",
  "content_type": "image/png"
}
```

**Response Body:**
```json
[object Object]
```

---

### 9. POST /api/bids/questions

**Error:** Status 404 - <!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot POST /api/bids/questions</pre>
</body>
</html>

**Category:** Resource Not Found (resource_missing)
**Severity:** warning

**Request Body:**
```json
{
  "project_id": "9f73fef1-5979-494b-8796-ec7754ec74d3",
  "question": "text_47903"
}
```

**Response Body:**
```json
[object Object]
```

---

### 10. POST /api/admin/subscription-plans

**Error:** Status 403 - Error: Admin access required
**Category:** Permission Denied (forbidden)
**Severity:** warning

**Request Body:**
```json
{
  "name": "Test User_47912",
  "price": 29.99,
  "billing_cycle": "monthly",
  "features": [
    "feature1"
  ]
}
```

**Response Body:**
```json
[object Object]
```

---

### 11. POST /api/catalogs

**Error:** Status 404 - <!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot POST /api/catalogs</pre>
</body>
</html>

**Category:** Resource Not Found (resource_missing)
**Severity:** warning

**Request Body:**
```json
{
  "job_category": "text_47927",
  "name": "Test User_47927"
}
```

**Response Body:**
```json
[object Object]
```

---

### 12. POST /api/bids

**Error:** Status 404 - <!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot POST /api/bids</pre>
</body>
</html>

**Category:** Resource Not Found (resource_missing)
**Severity:** warning

**Request Body:**
```json
{
  "project_id": "0272a08f-3f03-4cf7-a9d6-a759a92e871b",
  "bid_amount": 2500,
  "estimated_days": 14,
  "proposal_notes": "text_47937"
}
```

**Response Body:**
```json
[object Object]
```

---

### 13. GET /api/profile/categories

**Error:** Status 404 - <!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot GET /api/profile/categories</pre>
</body>
</html>

**Category:** Resource Not Found (resource_missing)
**Severity:** warning

---

### 14. GET /api/admin/users

**Error:** Status 403 - Error: Admin access required
**Category:** Permission Denied (forbidden)
**Severity:** warning

---

### 15. GET /api/projects

**Error:** Status 404 - <!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot GET /api/projects</pre>
</body>
</html>

**Category:** Resource Not Found (resource_missing)
**Severity:** warning

---

### 16. GET /api/admin/users/stats

**Error:** Status 403 - Error: Admin access required
**Category:** Permission Denied (forbidden)
**Severity:** warning

---

### 17. GET /api/profile/me

**Error:** Status 404 - <!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot GET /api/profile/me</pre>
</body>
</html>

**Category:** Resource Not Found (resource_missing)
**Severity:** warning

---

### 18. GET /api/projects/available

**Error:** Status 404 - <!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot GET /api/projects/available</pre>
</body>
</html>

**Category:** Resource Not Found (resource_missing)
**Severity:** warning

---

### 19. GET /api/admin/rules/bid-price

**Error:** Status 403 - Error: Admin access required
**Category:** Permission Denied (forbidden)
**Severity:** warning

---

### 20. GET /api/admin/service-fee/current

**Error:** Status 403 - Error: Admin access required
**Category:** Permission Denied (forbidden)
**Severity:** warning

---

### 21. GET /api/admin/service-fee/history

**Error:** Status 403 - Error: Admin access required
**Category:** Permission Denied (forbidden)
**Severity:** warning

---

### 22. GET /api/locations/search

**Error:** Status 404 - <!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot GET /api/locations/search</pre>
</body>
</html>

**Category:** Resource Not Found (resource_missing)
**Severity:** warning

---

### 23. GET /api/admin/analytics/price-variance

**Error:** Status 403 - Error: Admin access required
**Category:** Permission Denied (forbidden)
**Severity:** warning

---

### 24. GET /api/profile/billing

**Error:** Status 404 - <!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot GET /api/profile/billing</pre>
</body>
</html>

**Category:** Resource Not Found (resource_missing)
**Severity:** warning

---

### 25. GET /api/admin/analytics/platform-usage

**Error:** Status 403 - Error: Admin access required
**Category:** Permission Denied (forbidden)
**Severity:** warning

---

### 26. GET /api/admin/analytics/contract-allocation

**Error:** Status 403 - Error: Admin access required
**Category:** Permission Denied (forbidden)
**Severity:** warning

---

### 27. GET /api/admin/subscriptions

**Error:** Status 403 - Error: Admin access required
**Category:** Permission Denied (forbidden)
**Severity:** warning

---

### 28. GET /api/admin/subscriptions/stats

**Error:** Status 403 - Error: Admin access required
**Category:** Permission Denied (forbidden)
**Severity:** warning

---

### 29. GET /api/admin/subscription-plans

**Error:** Status 403 - Error: Admin access required
**Category:** Permission Denied (forbidden)
**Severity:** warning

---

### 30. GET /api/catalogs

**Error:** Status 404 - <!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot GET /api/catalogs</pre>
</body>
</html>

**Category:** Resource Not Found (resource_missing)
**Severity:** warning

---

### 31. GET /api/bids/my-bids

**Error:** Status 404 - <!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot GET /api/bids/my-bids</pre>
</body>
</html>

**Category:** Resource Not Found (resource_missing)
**Severity:** warning

---

### 32. PUT /api/profile/billing

**Error:** Status 404 - <!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot PUT /api/profile/billing</pre>
</body>
</html>

**Category:** Resource Not Found (resource_missing)
**Severity:** warning

**Request Body:**
```json
{
  "legal_company_name": "Acme Plumbing LLC",
  "ein": "12-3456789",
  "billing_address_line1": "123 Main St",
  "billing_city": "Austin",
  "billing_state": "TX",
  "billing_zip": "78701",
  "billing_phone": "555-555-5555"
}
```

**Response Body:**
```json
[object Object]
```

---

### 33. PUT /api/profile/serving-areas

**Error:** Status 404 - <!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot PUT /api/profile/serving-areas</pre>
</body>
</html>

**Category:** Resource Not Found (resource_missing)
**Severity:** warning

**Request Body:**
```json
{
  "serving_cities": [
    "Springfield",
    "Columbus"
  ],
  "serving_zipcodes": [
    "62701",
    "43215"
  ]
}
```

**Response Body:**
```json
[object Object]
```

---

### 34. PUT /api/profile/update

**Error:** Status 404 - <!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot PUT /api/profile/update</pre>
</body>
</html>

**Category:** Resource Not Found (resource_missing)
**Severity:** warning

**Request Body:**
```json
{
  "business_name": "Test User_48230",
  "phone": "+141555528230",
  "category": "Plumbing",
  "serving_cities": [
    "Springfield",
    "Columbus"
  ],
  "serving_zipcodes": [
    "62701",
    "43215"
  ]
}
```

**Response Body:**
```json
[object Object]
```

---

### Required Steps
1. Read the feedback file at the path above for full error context
2. For each failed API, identify the route file implementing it
3. Investigate the root cause — is it a code bug, test data issue, or dependency problem?
4. Fix the root cause in the implementation code OR update the test definition in `tests/api_definitions/`
5. Ensure test definitions have proper `{{dynamic:...}}` or `{{cache:...}}` placeholders
6. Add `dependsOn` in test definitions if APIs require data from other APIs first
7. After fixing, commit and push to re-run tests

**Acceptance Criteria:**

