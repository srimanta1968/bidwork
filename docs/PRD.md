# BidWork - Product Requirements Document v1.0

## AI-Powered Bidding Marketplace for Home Services

**Product Name:** BidWork (by Projexlight)
**Version:** 1.0
**Date:** April 9, 2026
**Status:** Pre-Development

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Vision & Mission](#3-vision--mission)
4. [Target Users & Jobs To Be Done](#4-target-users--jobs-to-be-done)
5. [Competitive Landscape](#5-competitive-landscape)
6. [Core Platform Flow](#6-core-platform-flow)
7. [Feature Specifications](#7-feature-specifications)
8. [Service Categories](#8-service-categories)
9. [AI System Architecture](#9-ai-system-architecture)
10. [Data Model](#10-data-model)
11. [Business Model](#11-business-model)
12. [Success Metrics](#12-success-metrics)
13. [Go-To-Market Strategy](#13-go-to-market-strategy)
14. [Risks & Mitigation](#14-risks--mitigation)
15. [Roadmap & Phasing](#15-roadmap--phasing)
16. [Tech Stack](#16-tech-stack)
17. [Future Expansion](#17-future-expansion)

---

## 1. Executive Summary

BidWork is an AI-powered two-sided marketplace where homeowners upload videos and photos of their home projects and receive an AI-generated scope of work with photo evidence per task, an editable task list, and a calculated bid range (floor to ceiling) — all before any contractor is involved.

Contractors receive pre-scoped, photo-documented, homeowner-approved jobs with a defined bid range. They bid within that range, compete on quality and speed rather than price alone, and close jobs faster with less rework.

**The core innovation:** AI understands the job first. Humans refine. Pricing is bounded. Contractors bid informed.

This is not a lead marketplace. This is a **job-definition engine + controlled bidding marketplace** — the operating system for home services execution.

---

## 2. Problem Statement

### 2.1 Homeowner Pain

| Problem | Impact |
|---|---|
| Don't know what work is actually needed | Dependent on contractor honesty for scope |
| No way to compare bids meaningfully | Quotes vary 2-5x for the same job |
| Multiple site visits required | Days/weeks wasted before work even starts |
| Can't verify if price is fair | Overpaying or choosing the cheapest (and worst) option |
| Rework and scope creep | Jobs cost more and take longer than quoted |

### 2.2 Contractor Pain

| Problem | Impact |
|---|---|
| Unqualified leads | 60-70% of leads never convert |
| Manual site visits for quoting | 2-4 hours wasted per estimate |
| Homeowners don't know what they want | Scope changes mid-job |
| Race-to-bottom pricing on platforms | Margins shrink, quality drops |
| No standardized job definitions | Every quote starts from scratch |

### 2.3 Market Gap

No existing platform:

- Converts **unstructured media (video/photos)** into a **structured, editable scope of work**
- Generates a **bounded bid range** (floor and ceiling) before contractors are involved
- Gives homeowners **approval authority** over scope and pricing before listing
- Runs a **closed-loop marketplace** where the platform controls job definition, price band, matching, and feedback

---

## 3. Vision & Mission

### Vision

Become the definitive platform where every home service job — from mowing a lawn to remodeling a kitchen — starts with an AI-understood scope and ends with a verified, quality-completed project.

### Mission

Eliminate uncertainty from home services by using AI to define what needs to be done, what it should cost, and who should do it — giving homeowners confidence and contractors efficiency.

### North Star Metric

**Jobs completed with 4.5+ rating per active market per month**

This single metric captures marketplace health: supply density, demand quality, AI accuracy, matching effectiveness, and customer satisfaction.

---

## 4. Target Users & Jobs To Be Done

### 4.1 Homeowners

**Profile:** Digitally native adults (25-55), homeowners or renters with landlord authorization, need work done but lack construction knowledge.

**Jobs To Be Done:**

> "Help me quickly understand what my project will cost and find a trustworthy pro to do it — without 5 site visits and 10 phone calls."

**Key behaviors:**
- Want visual confirmation that the platform understands their job
- Need to feel in control (edit scope, approve before listing)
- Trust is built through transparency (photos per task, price breakdowns)
- Decision speed matters — first quality option wins

### 4.2 Service Professionals (Contractors)

**Profile:** Small to mid-size local businesses (1-15 employees) in lawn care, landscaping, remodeling, or general repairs. Currently using Angi, Thumbtack, GreenPal, or word-of-mouth.

**Jobs To Be Done:**

> "Send me qualified jobs that match my skills and pricing, with most of the scoping done, so I can accept and start work quickly."

**Key behaviors:**
- Will adopt platforms that save time on estimating
- Want jobs, not leads — pre-qualified with clear scope
- Need to trust that the bid range is fair for their market
- Value repeat customers and predictable workflow

### 4.3 Internal Reviewers (Phase 1 — BidWork Team)

**Role:** Quality assurance on AI-generated scopes before homeowner sees them.

**Jobs To Be Done:**

> "Quickly verify and correct the AI output so homeowners get an accurate scope within minutes of uploading."

**Transition plan:** As AI accuracy improves (target: <10% revision rate), internal review becomes optional and reserved for complex/high-value jobs only.

---

## 5. Competitive Landscape

### 5.1 Direct Competitors

| Platform | Model | Strength | Weakness (Your Opportunity) |
|---|---|---|---|
| **Thumbtack** | Lead marketplace, pros pay per lead | Broad categories, strong demand | No job understanding, pros bid blind, expensive leads |
| **Angi / HomeAdvisor** | Subscription + lead-gen | Massive brand, large contractor network | Low ROI for pros, no scope standardization |
| **LawnStarter** | Lawn marketplace, standardized SKUs | Strong supply density, recurring revenue | Fixed menu pricing, no AI, no customization |
| **GreenPal** | "Uber for lawn care", manual bidding | Simple UX, fast matching | Manual bids, no scope generation, lawn only |
| **TaskRabbit** | Gig marketplace, standardized tasks | Simple tasks, transparent pricing | No complex jobs, no AI scoping |
| **Houzz** | Inspiration + pro directory + SaaS | Strong visual UX, pro tools | Weak transactional flow, not a true marketplace |

### 5.2 Indirect Competitors (Contractor Tools)

| Tool | What They Do | Why They're Not a Threat |
|---|---|---|
| **ServiceTitan** | Full contractor OS (scheduling, dispatch, invoicing) | Enterprise-focused, no marketplace, no demand generation |
| **Jobber / Housecall Pro** | Field service management for SMBs | Workflow tools, not marketplaces — potential integration partners |
| **JobNimbus** | CRM + project management for contractors | No homeowner-facing product |

### 5.3 Your Category-Creation Opportunity

No current U.S. player tightly integrates:

1. **Video/image-based AI scoping** (understanding the job from media)
2. **Editable scope with photo evidence per task** (homeowner agency)
3. **Bounded bid range** (fair pricing for both sides)
4. **Controlled marketplace** (matching, payments, feedback)

into a single, outcome-accountable system. That's the gap.

---

## 6. Core Platform Flow

The same universal pipeline applies to ALL service categories — lawn, patio, kitchen, bathroom, repairs, and any future category.

```
Upload → AI Scope → Human Refine → Bid Range → Approve → List → Bid → Assign → Track → Complete → Pay → Review
```

### 6.1 Flow Diagram

```
STAGE 1: HOMEOWNER UPLOADS
──────────────────────────
Homeowner provides:
  - Video walkthrough (30-120 seconds)
  - Photos (3-10 images)
  - Brief text description ("I want to redo my bathroom")
  - Location + property type
  - Urgency (flexible / within 2 weeks / ASAP)
  - Quality tier preference (budget / standard / premium)

         │
         ▼

STAGE 2: AI ANALYSIS & SCOPE GENERATION
────────────────────────────────────────
AI Engine processes:
  - Video → frame extraction → key frames selected per area/issue
  - Photos → object detection, condition assessment, measurements
  - Description → intent classification, context extraction
  - Auto-classify into category (lawn, patio, kitchen, bathroom, repair)

AI generates:
  - Structured scope of work (task list)
  - Each task includes:
    - Title and description
    - Extracted photo evidence (from video frames or uploads)
    - Estimated quantity and unit (sq ft, linear ft, each)
    - Materials list with quality tier options
    - Estimated labor hours
    - Per-task cost range (min/max)
    - AI confidence score
  - Overall job summary

         │
         ▼

STAGE 3: INTERNAL REVIEW (Phase 1 — optional in later phases)
─────────────────────────────────────────────────────────────
BidWork team reviewer:
  - Verifies AI-generated tasks for accuracy
  - Corrects misidentifications
  - Adds missed tasks
  - Adjusts quantities or materials
  - Flags complex jobs needing specialist review
  - Approves for homeowner viewing

         │
         ▼

STAGE 4: HOMEOWNER REVIEW & REFINEMENT
───────────────────────────────────────
Homeowner sees each task with photo evidence and can:
  - EDIT any task (change description, quantity, add notes)
  - ADD tasks the AI missed ("also fix the faucet leak")
  - REMOVE tasks they don't want ("skip the painting for now")
  - Add notes/context per task ("I want white subway tile, not gray")
  - Select material quality tier per task or globally
  - View how changes affect the bid range in real-time

         │
         ▼

STAGE 5: AI BID RANGE GENERATION
─────────────────────────────────
Based on the finalized task list, AI calculates:
  - Starting Bid (floor) — minimum fair price for the job
  - Max Bid (ceiling) — maximum reasonable price for the job
  - Per-task cost breakdown (min/max)
  - Estimated timeline (min days / max days)
  - Confidence score on pricing accuracy

Inputs for pricing:
  - Finalized task list with quantities
  - Location-based labor rates
  - Material costs by quality tier
  - Historical job data (improves over time)
  - Job complexity assessment

Contractors MUST bid within this range.

         │
         ▼

STAGE 6: HOMEOWNER APPROVAL GATE
─────────────────────────────────
Homeowner sees the complete package:
  - Final scope of work (all tasks with photos)
  - Bid range (starting bid ↔ max bid)
  - Per-task cost breakdown
  - Estimated timeline
  - Quality tier selected

Actions:
  - APPROVE → Job is listed for contractor bidding
  - EDIT    → Return to Stage 4 (refinement)
  - CANCEL  → Job discarded (can be saved as draft)

         │
         ▼

STAGE 7: CONTRACTOR MATCHING & BIDDING
───────────────────────────────────────
Platform matches job to qualified contractors based on:
  - Category + skill tags
  - Service area (distance from job)
  - Availability
  - Past performance rating
  - Price-performance profile

Matched contractors (3-5) see:
  - Full scope of work with photos
  - Bid range they must stay within
  - AI-suggested bid (personalized to their pricing profile)
  - Estimated timeline

Contractor actions:
  - ACCEPT AI-suggested bid as-is
  - ADJUST bid within the allowed range
  - Add notes/approach description for homeowner
  - DECLINE (with optional reason)

Bidding window: 24-48 hours (configurable by urgency)

         │
         ▼

STAGE 8: HOMEOWNER SELECTS CONTRACTOR
──────────────────────────────────────
Homeowner reviews bids and sees:
  - Contractor profile (photo, bio, years experience)
  - Rating and review history
  - Bid amount (within range)
  - Proposed timeline
  - Contractor's notes/approach
  - Number of similar jobs completed
  - Response time

Homeowner selects preferred contractor.
Payment authorization held via escrow.

         │
         ▼

STAGE 9: JOB EXECUTION & TRACKING
──────────────────────────────────
  - Contractor confirms start date
  - Job status updates per task (not started / in progress / completed)
  - Photo documentation of progress (contractor uploads)
  - Milestone-based check-ins
  - In-app messaging between homeowner and contractor
  - Change order process (if scope changes mid-job):
    - Contractor submits change request with reason + cost impact
    - AI validates reasonableness of change
    - Homeowner approves/rejects

         │
         ▼

STAGE 10: COMPLETION & PAYMENT
──────────────────────────────
  - Contractor marks job complete with final photos
  - Homeowner reviews completed work against original scope
  - Homeowner approves completion (or flags issues)
  - Dispute resolution process if needed
  - Escrow releases payment to contractor
  - Platform fee deducted automatically

         │
         ▼

STAGE 11: REVIEW & FEEDBACK LOOP
─────────────────────────────────
  - Homeowner rates contractor (1-5 stars + written review)
  - Contractor rates homeowner (cooperation, access, accuracy)
  - AI captures:
    - Actual cost vs estimated cost (per task)
    - Actual duration vs estimated duration
    - Scope changes that occurred
    - Quality rating
  - Data feeds back into AI models for continuous improvement
  - Recurring job scheduling offered (lawn care, maintenance)
```

---

## 7. Feature Specifications

### 7.1 Homeowner Features

#### 7.1.1 Onboarding & Account
- Email / phone / social sign-up
- Property profile (address, property type, size)
- Notification preferences (SMS, email, push)

#### 7.1.2 Job Creation
- **Media upload:** Video (30-120s) and/or photos (3-10)
- **Guided capture:** On-screen prompts for better media ("stand back 10 feet", "show the full area", "capture any damage close-up")
- **Description field:** Free-text with AI-assisted prompts ("What would you like done?")
- **Category auto-detection:** AI classifies from media + description; homeowner can override
- **Quality tier selection:** Budget / Standard / Premium (affects material choices and bid range)
- **Urgency:** Flexible / Within 2 weeks / ASAP

#### 7.1.3 Scope Review
- **Task list view:** Each task as an expandable card with:
  - Title, description
  - Photo evidence (extracted from their video/photos)
  - Quantity estimate with unit
  - Materials listed
  - Per-task cost range
  - AI confidence indicator
- **Edit capabilities:**
  - Inline edit task descriptions
  - Adjust quantities
  - Add/remove tasks
  - Add notes per task (text + optional additional photos)
  - Change quality tier per task
- **Real-time bid range update:** Changes to scope instantly recalculate the bid range
- **Save as draft:** Resume later

#### 7.1.4 Approval & Listing
- Summary view: complete scope + bid range + timeline
- One-tap approve to list
- Edit or cancel options

#### 7.1.5 Bid Review & Contractor Selection
- Side-by-side bid comparison
- Contractor profiles with ratings, reviews, portfolio
- AI recommendation ("Best match based on skill, rating, and price")
- Direct messaging with contractors before accepting

#### 7.1.6 Job Tracking
- Per-task progress tracking (not started / in progress / completed)
- Contractor photo updates
- Milestone notifications
- Change order approval flow
- In-app messaging

#### 7.1.7 Payment
- Escrow-based: payment held at booking, released on completion approval
- Per-milestone payments for large jobs (configurable)
- Dispute resolution flow
- Receipt and invoice generation

#### 7.1.8 Reviews & Recurring
- Post-job rating and review
- Recurring job scheduling (lawn care, cleaning, maintenance)
- Favorite contractor list
- Job history

### 7.2 Contractor Features

#### 7.2.1 Onboarding & Verification
- Profile creation (business name, photo, bio, years experience)
- Skills and category tagging
- Service area definition (radius from base or ZIP codes)
- License and insurance upload + verification
- Pricing preferences (min job value, preferred $/unit ranges)
- Portfolio upload (past work photos)

#### 7.2.2 Job Feed
- AI-matched jobs only (no browsing unqualified work)
- Each job card shows:
  - Category and subcategory
  - Location and distance
  - Scope summary (task count, estimated size)
  - Bid range
  - Urgency level
  - Quality tier
- Filter and sort options (distance, bid range, category, urgency)

#### 7.2.3 Job Detail & Bidding
- Full scope of work with photo evidence per task
- AI-suggested bid (personalized to contractor's pricing history)
- Bid adjustment within allowed range
- Timeline proposal
- Notes field (approach, availability, qualifications for this job)
- Accept / Adjust / Decline

#### 7.2.4 Workflow Management
- Active jobs dashboard
- Per-task status updates
- Photo upload for progress documentation
- Change order submission (reason + cost impact)
- Schedule management (calendar view)

#### 7.2.5 Payments & Earnings
- Earnings dashboard (pending, completed, paid out)
- Fast payout options
- Tax documentation (1099 generation)
- Payment history

#### 7.2.6 Performance Dashboard
- Overall rating and review history
- Job completion rate
- On-time completion rate
- Customer satisfaction score
- Earnings trends
- Comparison to category average (anonymized)

### 7.3 Internal Admin Features (BidWork Team)

#### 7.3.1 Scope Review Queue
- Queue of AI-generated scopes awaiting review
- Side-by-side: original media vs AI-generated tasks
- Edit/approve/flag interface
- Review time tracking
- Accuracy reporting (AI vs reviewer corrections)

#### 7.3.2 Platform Management
- User management (homeowners + contractors)
- Contractor verification workflow
- Dispute resolution interface
- Pricing data management (local rates, material costs)
- Category and subcategory management

#### 7.3.3 AI Performance Monitoring
- Estimate accuracy dashboard (AI estimate vs actual cost)
- Scope revision rates
- Contractor override rates on AI-suggested bids
- Category-level AI performance breakdown
- Model retraining triggers

---

## 8. Service Categories

The platform uses one universal flow for all categories. What changes per category is what the AI detects and how it prices.

### 8.1 Lawn & Landscaping

**AI Detection Targets:**
- Yard size (sq ft from aerial/ground shots)
- Grass condition (overgrown, patchy, dead spots, weeds)
- Obstacles (trees, flower beds, fences, slopes)
- Hardscape (walkways, driveways bordering lawn)
- Debris (leaf buildup, branches, trash)
- Irrigation (visible sprinklers, dry zones)

**Common Tasks Generated:**
- Mowing and edging
- Weed treatment
- Leaf cleanup and debris removal
- Hedge/bush trimming
- Aeration and overseeding
- Mulch installation
- Tree/branch trimming

**Bid Range Factors:**
- Local mowing rates per sq ft
- Seasonal pricing (spring cleanup vs weekly maintenance)
- One-time vs recurring pricing
- Equipment requirements (standard vs heavy machinery)

**Subcategories:** Weekly mowing, one-time cleanup, seasonal service, landscaping design, tree service, irrigation

### 8.2 Patio & Outdoor Living

**AI Detection Targets:**
- Existing patio condition (cracked, settled, stained, none)
- Surface type (concrete, pavers, wood deck, flagstone)
- Area dimensions (estimated sq ft)
- Grade/slope issues
- Adjacent structures (house wall, fence, pool, garden)
- Drainage conditions
- Desired elements (from description: pergola, fire pit, seating wall)

**Common Tasks Generated:**
- Demo existing surface
- Excavation and grading
- Base preparation (gravel, sand, compaction)
- Surface installation (pavers, concrete, deck boards)
- Seating wall or retaining wall construction
- Pergola/shade structure
- Landscape lighting
- Drainage solutions
- Cleanup and haul-away

**Bid Range Factors:**
- Material costs (concrete vs pavers vs flagstone vs composite deck per sq ft)
- Quality tiers (builder grade / mid-range / premium materials)
- Complexity (straight slab vs curved design with features)
- Equipment needs (excavation, compactor, concrete mixer)
- Local labor rates for hardscape/decking work

**Subcategories:** Paver patio, concrete patio, wood deck, composite deck, pergola, outdoor kitchen, fire pit, retaining wall

### 8.3 Kitchen Remodel

**AI Detection Targets:**
- Layout type (galley, L-shape, U-shape, island)
- Cabinet condition, count, and style (doors, drawers)
- Countertop material and condition (laminate, granite, butcher block)
- Appliance positions and visible age/condition
- Flooring type and condition
- Backsplash presence and condition
- Lighting fixtures and type
- Plumbing fixtures (sink, faucet condition)
- Visible damage (water stains, peeling, warped cabinets)

**Common Tasks Generated:**
- Demo countertops / backsplash / flooring (as needed)
- Cabinet work (refinish, reface, or replace)
- Countertop installation (with material tier)
- Backsplash installation
- Sink and faucet replacement
- Appliance installation
- Lighting upgrades (under-cabinet, recessed, pendant)
- Flooring installation
- Painting
- Electrical work (outlets, switches)
- Plumbing modifications

**Bid Range Factors:**
- Material tier (laminate vs granite vs quartz counters, stock vs semi-custom vs custom cabinets)
- Cabinet approach (refinish vs reface vs full replacement)
- Plumbing complexity (same location vs reconfigured)
- Electrical work scope
- Permit requirements by location
- Appliance inclusion/exclusion

**Subcategories:** Full remodel, cabinet refacing, countertop replacement, backsplash install, partial update

### 8.4 Bathroom Remodel

**AI Detection Targets:**
- Bathroom type (full, half, master, guest)
- Room size estimation
- Fixture condition (toilet, vanity, tub/shower, faucets)
- Tile condition (floor, walls, shower surround)
- Visible damage (mold, water damage, cracked grout, leaks)
- Ventilation (fan present, window)
- Lighting type and condition
- Storage/cabinetry condition
- Accessibility features present/needed

**Common Tasks Generated:**
- Demo tile (floor, walls, shower surround)
- Subfloor repair (water damage)
- Floor tile installation
- Shower/tub surround tile installation
- Vanity + sink replacement
- Toilet replacement
- Exhaust fan installation/replacement
- Lighting replacement
- Plumbing rough-in (if layout changes)
- Painting
- Accessories installation (towel bars, shelving)

**Bid Range Factors:**
- Fixture quality tier (builder / mid / luxury)
- Tile complexity (simple subway vs mosaic vs large format)
- Plumbing scope (same layout vs reconfigured)
- Structural repair extent (water damage)
- Permit requirements
- Accessibility modifications

**Subcategories:** Full remodel, shower-only remodel, tub-to-shower conversion, vanity replacement, tile refresh

### 8.5 General Repairs & Handyman

**AI Detection Targets:**
- Damage type (hole in wall, broken fixture, peeling paint, rot)
- Affected area size
- Material involved (drywall, wood, metal, glass, concrete)
- Severity assessment (cosmetic vs structural)
- Related issues (water stain near damage = possible leak source)
- Access complexity (height, tight space, exterior)

**Common Tasks Generated:**
- Drywall patching and painting
- Fixture replacement (light, faucet, door handle)
- Door/window repair or replacement
- Deck/fence repair
- Gutter cleaning/repair
- Caulking and weatherproofing
- Minor plumbing fixes
- Minor electrical fixes
- Pressure washing

**Bid Range Factors:**
- Number of individual repair items
- Material costs per item
- Access requirements (ladder, scaffolding)
- Trade specialization needed (general handyman vs licensed plumber/electrician)
- Minimum trip charge for small jobs

**Subcategories:** Drywall repair, plumbing fix, electrical fix, door/window repair, deck/fence repair, painting, pressure washing, general maintenance

### 8.6 Adding New Categories

New categories are added by providing:

1. **Detection rules:** What the AI looks for in photos/video for this category
2. **Task templates:** Common tasks with standard descriptions and units
3. **Pricing data:** Local labor rates and material costs for the category
4. **Contractor skill tags:** New tags for contractor profiles
5. **Guided capture prompts:** Category-specific photo/video instructions

No platform code changes required. The universal flow, data model, and UI handle any category.

---

## 9. AI System Architecture

### 9.1 Pipeline Overview

```
INPUT LAYER                PROCESSING LAYER              OUTPUT LAYER
─────────                  ────────────────              ────────────
Video ──────► Frame        Category                      Task List
              Extraction ─► Classification ──► Category-  (universal
Photos ─────► Image        (lawn? patio?      Specific    format)
              Analysis      kitchen?)         Detection
                                              & Scoping ─► Bid Range
Text ───────► Intent                                      (floor/ceiling)
              Extraction ──────────────────►
                                              Pricing  ──► Timeline
Location ───► Local Rate                      Engine       Estimate
              Lookup ──────────────────────►
```

### 9.2 Stage 1: Input Processing

**Video Processing:**
- Extract frames at 1-2 fps
- Select key frames using scene-change detection (avoid blurry, redundant, or transitional frames)
- Group frames by area/room/zone
- Tag each frame with detected content

**Photo Processing:**
- Object detection (fixtures, surfaces, damage, vegetation, structures)
- Condition assessment (good, fair, poor, damaged)
- Approximate measurement estimation (using reference objects and perspective analysis)
- Damage/issue identification

**Text Processing:**
- Intent classification ("I want to redo my bathroom" → bathroom remodel)
- Requirement extraction (specific requests, preferences, constraints)
- Context enrichment (combine with visual findings)

### 9.3 Stage 2: Category Classification

- Multi-modal classification using vision + text signals
- Confidence score per category
- Homeowner override capability
- Multi-category support for jobs spanning categories (e.g., "fix my bathroom AND patch the hallway wall")

### 9.4 Stage 3: Scope Generation

**Per category, AI generates structured tasks using:**
- Category-specific detection models/prompts
- Detected objects and conditions from media
- Homeowner description and preferences
- Standard task templates for the category

**Each task includes:**
- Title and detailed description
- Photo evidence (extracted from video frames or matched from uploads)
- Estimated quantity with appropriate unit
- Materials list with quality tier options
- Estimated labor hours
- Per-task cost range
- AI confidence score (0-1)
- Sort order (logical work sequence)

### 9.5 Stage 4: Pricing Engine

**Inputs:**
- Finalized task list with quantities and materials
- Location (ZIP code → local labor rate tables)
- Material costs by quality tier (budget / standard / premium)
- Historical job data from platform (grows over time)
- Job complexity multiplier (simple / moderate / complex)

**Outputs:**
- **Starting Bid (floor):** Minimum fair price — based on efficient execution with standard margins
- **Max Bid (ceiling):** Maximum reasonable price — based on premium execution, contingency buffer
- **Per-task cost range:** Breakdown showing min/max per task
- **Timeline estimate:** min days / max days based on task dependencies and labor hours
- **Confidence score:** How reliable the estimate is (affected by data availability and job complexity)

**Pricing guardrails:**
- Floor cannot be below local cost-of-labor + materials at cost
- Ceiling cannot exceed 1.5x the floor (prevents absurd ranges)
- Outlier detection flags jobs where AI confidence is below threshold for human review

### 9.6 Stage 5: Matching Engine

**Inputs per job:**
- Category, subcategory, skill tags required
- Job location
- Bid range
- Timeline / urgency
- Quality tier

**Contractor scoring factors:**
- Skill match (category + subcategory experience)
- Distance from job site
- Availability (calendar, current job load)
- Past performance (rating, completion rate, on-time rate)
- Price-performance profile (historical bid vs job quality)
- Response time history

**Output:**
- Ranked list of 3-5 best-matched contractors
- AI-suggested bid personalized per contractor
- Match score explanation (for internal analytics)

### 9.7 Continuous Learning Loop

Every completed job feeds data back:

| Data Point | What It Improves |
|---|---|
| Actual cost vs AI estimate | Pricing engine accuracy |
| Actual duration vs AI estimate | Timeline estimates |
| Scope changes during job | Scope generation completeness |
| Contractor override of AI-suggested bid | Per-contractor pricing calibration |
| Customer satisfaction rating | Matching engine quality weighting |
| Tasks added/removed by homeowner | Detection model coverage |
| Review text (NLP) | Issue pattern detection |

**Retraining triggers:**
- Estimate accuracy drops below threshold per category/market
- New category launch (cold-start with industry data, refine with platform data)
- Quarterly model refresh with accumulated data

---

## 10. Data Model

### 10.1 Core Entities

```
User {
  id                    UUID
  type                  "homeowner" | "contractor" | "admin"
  email                 string
  phone                 string
  name                  string
  avatar_url            string
  created_at            timestamp
  status                "active" | "suspended" | "deactivated"
}

HomeownerProfile {
  user_id               UUID (FK → User)
  address               string
  city                  string
  state                 string
  zip_code              string
  property_type         "house" | "condo" | "townhouse" | "apartment"
  notification_prefs    json
}

ContractorProfile {
  user_id               UUID (FK → User)
  business_name         string
  bio                   text
  years_experience      integer
  license_number        string (nullable)
  license_verified      boolean
  insurance_verified    boolean
  insurance_expiry      date
  service_radius_miles  integer
  base_location         point (lat/lng)
  min_job_value         decimal
  rating_avg            decimal
  rating_count          integer
  jobs_completed        integer
  completion_rate       decimal
  on_time_rate          decimal
  status                "pending_verification" | "active" | "suspended"
}

ContractorSkill {
  contractor_id         UUID (FK → ContractorProfile)
  category              string (e.g., "lawn", "bathroom", "kitchen")
  subcategory           string (e.g., "mowing", "full_remodel")
  experience_level      "beginner" | "intermediate" | "expert"
}

ContractorPricingProfile {
  contractor_id         UUID (FK → ContractorProfile)
  category              string
  avg_bid_vs_midpoint   decimal (e.g., 0.95 = bids 5% below midpoint)
  avg_hourly_rate       decimal
  updated_at            timestamp
}
```

### 10.2 Job & Task Entities

```
Job {
  id                    UUID
  homeowner_id          UUID (FK → User)
  category              "lawn" | "patio" | "kitchen" | "bathroom" | "repair"
  subcategory           string
  description           text (homeowner's original description)
  location_address      string
  location_city         string
  location_state        string
  location_zip          string
  location_coords       point (lat/lng)
  quality_tier          "budget" | "standard" | "premium"
  urgency               "flexible" | "within_2_weeks" | "asap"
  starting_bid          decimal (floor)
  max_bid               decimal (ceiling)
  timeline_min_days     integer
  timeline_max_days     integer
  ai_confidence         decimal (0-1)
  status                "uploading" | "ai_scoping" | "internal_review" |
                        "homeowner_review" | "homeowner_approved" |
                        "listed" | "bidding" | "assigned" |
                        "in_progress" | "completed" | "cancelled" | "disputed"
  reviewed_by           UUID (FK → User, nullable — internal reviewer)
  reviewed_at           timestamp (nullable)
  approved_at           timestamp (nullable — homeowner approval)
  listed_at             timestamp (nullable)
  assigned_at           timestamp (nullable)
  completed_at          timestamp (nullable)
  bidding_deadline      timestamp (nullable)
  created_at            timestamp
  updated_at            timestamp
}

JobMedia {
  id                    UUID
  job_id                UUID (FK → Job)
  type                  "video" | "photo"
  url                   string
  thumbnail_url         string (nullable)
  uploaded_by           "homeowner" | "ai_extracted" | "contractor"
  stage                 "upload" | "progress" | "completion"
  created_at            timestamp
}

Task {
  id                    UUID
  job_id                UUID (FK → Job)
  title                 string
  description           text
  category              string
  estimated_qty         decimal
  qty_unit              "sq_ft" | "linear_ft" | "each" | "hours" | "cubic_yd"
  labor_hours_est       decimal
  cost_min              decimal
  cost_max              decimal
  ai_confidence         decimal (0-1)
  sort_order            integer
  source                "ai_generated" | "reviewer_added" | "homeowner_added"
  homeowner_notes       text (nullable)
  status                "not_started" | "in_progress" | "completed"
  created_at            timestamp
  updated_at            timestamp
}

TaskPhoto {
  id                    UUID
  task_id               UUID (FK → Task)
  url                   string
  source                "ai_extracted" | "homeowner_added" | "contractor_progress" | "contractor_completion"
  caption               string (nullable)
  created_at            timestamp
}

TaskMaterial {
  id                    UUID
  task_id               UUID (FK → Task)
  name                  string
  quantity              decimal
  unit                  string
  unit_cost_budget      decimal
  unit_cost_standard    decimal
  unit_cost_premium     decimal
  selected_tier         "budget" | "standard" | "premium"
}
```

### 10.3 Bidding & Payment Entities

```
Bid {
  id                    UUID
  job_id                UUID (FK → Job)
  contractor_id         UUID (FK → User)
  ai_suggested_amount   decimal
  bid_amount            decimal
  timeline_days         integer
  contractor_notes      text (nullable)
  status                "pending" | "accepted" | "rejected" | "withdrawn" | "expired"
  submitted_at          timestamp
  responded_at          timestamp (nullable)
}

Contract {
  id                    UUID
  job_id                UUID (FK → Job)
  bid_id                UUID (FK → Bid)
  homeowner_id          UUID (FK → User)
  contractor_id         UUID (FK → User)
  agreed_amount         decimal
  agreed_timeline_days  integer
  start_date            date
  status                "active" | "completed" | "cancelled" | "disputed"
  created_at            timestamp
}

Payment {
  id                    UUID
  contract_id           UUID (FK → Contract)
  amount                decimal
  platform_fee          decimal
  contractor_payout     decimal
  type                  "escrow_hold" | "milestone" | "final" | "refund"
  status                "held" | "released" | "refunded" | "failed"
  stripe_payment_id     string
  created_at            timestamp
  released_at           timestamp (nullable)
}

ChangeOrder {
  id                    UUID
  contract_id           UUID (FK → Contract)
  requested_by          UUID (FK → User)
  description           text
  cost_impact           decimal
  timeline_impact_days  integer
  status                "pending" | "approved" | "rejected"
  created_at            timestamp
  responded_at          timestamp (nullable)
}
```

### 10.4 Review & Feedback Entities

```
Review {
  id                    UUID
  job_id                UUID (FK → Job)
  reviewer_id           UUID (FK → User)
  reviewee_id           UUID (FK → User)
  rating                integer (1-5)
  comment               text (nullable)
  type                  "homeowner_to_contractor" | "contractor_to_homeowner"
  created_at            timestamp
}

JobOutcome {
  id                    UUID
  job_id                UUID (FK → Job)
  estimated_cost_min    decimal
  estimated_cost_max    decimal
  actual_cost           decimal
  estimated_days_min    integer
  estimated_days_max    integer
  actual_days           integer
  tasks_added           integer (during job)
  tasks_removed         integer (during job)
  change_orders_count   integer
  homeowner_rating      integer
  created_at            timestamp
}
```

### 10.5 Pricing Reference Data

```
LocalLaborRate {
  id                    UUID
  zip_code              string
  category              string
  subcategory           string
  hourly_rate_low       decimal
  hourly_rate_mid       decimal
  hourly_rate_high      decimal
  source                "industry_data" | "platform_data" | "manual"
  effective_date        date
  updated_at            timestamp
}

MaterialPrice {
  id                    UUID
  name                  string
  category              string
  unit                  string
  price_budget          decimal
  price_standard        decimal
  price_premium         decimal
  region                string (nullable — for regional pricing)
  source                string
  updated_at            timestamp
}
```

---

## 11. Business Model

### 11.1 Primary Revenue: Platform Fee (Take Rate)

- **Rate:** 10-20% of job value (embedded in homeowner-facing price)
- **Homeowner sees:** All-in price (fee is invisible)
- **Contractor sees:** Net payout after platform fee
- **Scaling:** Fee adjusts by category and ticket size:
  - Lawn care (low ticket, recurring): 15-20%
  - Remodeling (high ticket, one-time): 10-15%
  - Repairs (mid ticket): 15%

### 11.2 Secondary Revenue: Contractor Subscription (Phase 2)

**Free tier:**
- Receive matched jobs
- AI-suggested bids
- Basic dashboard

**Pro tier ($49-99/month):**
- Priority in matching queue
- Advanced performance analytics
- CRM-lite (customer history, follow-up reminders)
- Lower incremental take rate (e.g., 12% vs 15%)
- Portfolio showcase features
- Branded profile page

### 11.3 Future Revenue: AI Pricing API (Phase 3)

- Sell scope generation and pricing engine as an API to:
  - Insurance companies (damage assessment and repair estimates)
  - Property management companies (maintenance scoping)
  - Real estate agents (repair cost estimates for listings)
  - Lending companies (renovation loan underwriting)
- Pricing: Per-API-call or monthly subscription

### 11.4 Avoided Model: Pay-Per-Lead

No pay-per-lead model. Contractors pay nothing until a job is completed. This:
- Attracts contractors (zero upfront risk)
- Aligns incentives (platform earns only when value is delivered)
- Differentiates from Angi/Thumbtack (expensive leads, low ROI)

### 11.5 Unit Economics Target

| Metric | Target |
|---|---|
| Average job value (lawn) | $75-150 |
| Average job value (remodel) | $5,000-15,000 |
| Platform fee (blended) | 15% |
| Revenue per lawn job | $11-22 |
| Revenue per remodel job | $750-2,250 |
| CAC (homeowner) | <$30 |
| CAC (contractor) | <$100 |
| LTV/CAC ratio | >3x |

---

## 12. Success Metrics

### 12.1 North Star

**Jobs completed with 4.5+ rating per active market per month**

### 12.2 Marketplace Health

| Metric | Target (Phase 1) | Target (Phase 2) |
|---|---|---|
| % of requests receiving at least 1 bid | >80% | >95% |
| Median time to first bid | <4 hours | <1 hour |
| Active contractors per ZIP per category | 5+ | 15+ |
| Job completion rate (assigned → completed) | >85% | >92% |

### 12.3 Homeowner Metrics

| Metric | Target |
|---|---|
| Time from upload to AI scope delivery | <5 minutes |
| Time from upload to first contractor bid | <12 hours |
| Time from upload to booked job | <48 hours |
| Scope approval rate (approve vs cancel) | >60% |
| Repeat usage within 12 months | >30% |
| NPS | >50 |

### 12.4 Contractor Metrics

| Metric | Target |
|---|---|
| Time from signup to first completed job | <14 days |
| Bid-to-job conversion rate | >25% |
| AI-suggested bid acceptance rate (no adjustment) | >40% |
| Net earnings per active contractor per month | >$2,000 |
| Contractor churn (monthly) | <8% |

### 12.5 AI Performance Metrics

| Metric | Target (Launch) | Target (12 months) |
|---|---|---|
| Category auto-classification accuracy | >90% | >97% |
| Cost estimate accuracy (within ±15% of actual) | >60% | >80% |
| Scope revision rate (major changes by reviewer/homeowner) | <30% | <10% |
| Contractor override rate of AI-suggested bid | <50% | <30% |
| Task detection completeness (% of tasks AI catches) | >70% | >90% |

---

## 13. Go-To-Market Strategy

### 13.1 Phase 1: Single Vertical, Single City

**Recommended starting vertical:** Lawn Care

**Rationale:**
- Low scope complexity — AI accuracy is higher from day 1
- High repeat frequency — weekly/biweekly creates recurring revenue
- Low trust barrier — $75-150 jobs, low risk for homeowners to try
- Abundant contractor supply — easy to recruit
- Fast feedback loops — weekly jobs generate data rapidly
- Seasonal urgency — spring/summer demand is organic

**Recommended starting market:** One mid-size metro with:
- Active homeowner population (suburban, 25-55 demographic)
- Existing contractor density (competitors are already there, proving demand)
- Moderate competition (not saturated by LawnStarter/GreenPal yet)

### 13.2 Supply-First Launch

**Week 1-4: Recruit contractors BEFORE launching demand**

- Direct outreach to 20-30 lawn care businesses in target city
- Value proposition: "Pre-scoped jobs with photos, bid range set, zero upfront cost"
- Incentive: First 5 jobs at 0% platform fee
- Onboard, verify, and build profiles

### 13.3 Demand Generation

**Organic (low cost, high intent):**
- Local SEO ("lawn care [city name]", "how much does lawn mowing cost")
- Google Business Profile optimization
- Nextdoor community presence
- Before/after job photos on social media (with homeowner permission)

**Paid (targeted, measurable):**
- Google Ads — intent keywords ("lawn care near me", "lawn mowing price")
- Facebook/Instagram — geo-targeted to ZIP codes with contractor coverage
- Nextdoor ads — hyper-local

**Viral loop:**
- Shareable AI estimate link ("See what BidWork thinks your yard needs")
- Homeowner shares scope with spouse/partner for approval → organic exposure
- Referral program ($20 credit for referring a neighbor)

### 13.4 Density Strategy

**Do NOT expand to new cities until:**
- 80%+ of requests in current city receive a bid within 4 hours
- 15+ active contractors per category
- Job completion rate >85%
- Repeat usage rate >20%

**Then replicate the same playbook city-by-city.**

### 13.5 Category Expansion Sequence

After lawn care is working:

1. **General repairs / handyman** — diverse tasks, tests AI versatility
2. **Patio & outdoor living** — natural upsell from lawn customers
3. **Bathroom remodel** — higher ticket, tests complex scoping
4. **Kitchen remodel** — highest ticket, maximum AI complexity

Each new category launch requires:
- Category-specific AI prompts and detection rules
- Local pricing data for the category
- 10+ verified contractors in the category/market
- Guided capture prompts for homeowners

---

## 14. Risks & Mitigation

### 14.1 AI Accuracy Risk

**Risk:** AI generates inaccurate scope or pricing, eroding trust.

**Mitigation:**
- Internal human review for all jobs in Phase 1
- Confidence scores displayed to users (transparency)
- "AI-assisted, human-verified" messaging
- Homeowner can edit/correct scope before approval
- Continuous learning from actual vs estimated outcomes
- Category-level accuracy monitoring with automatic alerts

### 14.2 Supply Shortage Risk

**Risk:** Not enough contractors in a market to fulfill demand.

**Mitigation:**
- Supply-first launch strategy (recruit before generating demand)
- Zero upfront cost model (no risk for contractors to join)
- First-job bonus incentive
- Don't expand to new markets until density is achieved
- Contractor referral program

### 14.3 Trust & Safety Risk

**Risk:** Homeowners don't trust AI-generated scope or unknown contractors.

**Mitigation:**
- Photo evidence per task (visual proof AI understood the job)
- Homeowner approval gate (nothing happens without explicit consent)
- Contractor verification (license, insurance)
- Escrow payments (money held until work approved)
- Review system with photo documentation of completed work
- Dispute resolution process
- Bounded bid range (no surprise pricing)

### 14.4 Complex Job Risk

**Risk:** Remodeling jobs are too complex for AI to scope accurately.

**Mitigation:**
- Start with simple categories (lawn care) to build trust and data
- For complex jobs: AI generates initial scope, internal expert reviewer validates
- "Complexity score" triggers additional review steps for high-complexity jobs
- Hybrid model: AI handles 80% of scoping, human handles edge cases
- Over time, AI learns complex patterns from accumulated data

### 14.5 Marketplace Chicken-and-Egg Risk

**Risk:** Can't attract homeowners without contractors, can't attract contractors without homeowners.

**Mitigation:**
- Supply-first strategy with incentives
- Guarantee contractors minimum X jobs in first 30 days (manually source if needed)
- Geo-fence demand generation to areas with contractor coverage
- Start extremely narrow (1 category, 1 city, specific ZIP codes)

### 14.6 Competitive Response Risk

**Risk:** Thumbtack, Angi, or LawnStarter copy AI scoping features.

**Mitigation:**
- Speed advantage: ship fast, accumulate data, build flywheel
- Data moat: every completed job makes AI smarter — competitors start from zero
- Closed-loop advantage: competitors would need to restructure from lead-gen to outcome-accountable model (massive organizational change)
- Feature is the wedge, not the moat — the moat is the feedback data loop

---

## 15. Roadmap & Phasing

### Phase 0: Prototype (Weeks 1-6)

**Goal:** Validate the core flow end-to-end with real users in one category, one city.

| Deliverable | Details |
|---|---|
| Homeowner web app | Upload media, view AI scope, edit tasks, approve, select contractor |
| AI scope pipeline | Claude Vision integration, scope generation, photo extraction |
| Contractor web app | Onboarding, job feed, view scope, bid within range |
| Internal admin | Scope review queue, basic user management |
| Basic matching | Distance + category matching (no ML yet) |
| Manual payments | Invoice-based (Stripe integration deferred) |
| Launch market | 1 city, lawn care only, 15-20 contractors |

**Success gate:** 10 completed jobs with homeowner rating 4+

### Phase 1: MVP (Months 2-4)

**Goal:** Full automated flow with payments, matching, and reviews.

| Deliverable | Details |
|---|---|
| Stripe Connect | Escrow payments, automated platform fee, contractor payouts |
| Matching engine v1 | Distance + skills + rating scoring |
| Bid range engine | AI-generated floor/ceiling pricing |
| Review system | Post-job ratings, contractor profiles with history |
| Recurring scheduling | Weekly/biweekly lawn care auto-booking |
| Job tracking | Per-task status updates, contractor progress photos |
| In-app messaging | Homeowner ↔ contractor chat |
| Mobile-responsive | Full mobile web experience (not native app yet) |

**Success gate:** 100 completed jobs, >80% bid fill rate, >60% scope approval rate

### Phase 2: Scale (Months 5-8)

**Goal:** Add categories, expand geography, improve AI.

| Deliverable | Details |
|---|---|
| Category expansion | Add general repairs/handyman + patio/outdoor |
| Market expansion | 2-3 additional cities |
| AI model improvements | Retrained on Phase 1 data, better cost accuracy |
| Contractor subscription | Pro tier with analytics and priority matching |
| Native mobile app | iOS + Android (React Native / Expo) |
| Change order flow | Mid-job scope changes with cost impact |
| Dispute resolution | Structured mediation process |

**Success gate:** 1,000 completed jobs, 3+ cities, <20% scope revision rate

### Phase 3: Growth (Months 9-12)

**Goal:** Remodeling categories, deeper AI, network effects.

| Deliverable | Details |
|---|---|
| Remodeling categories | Bathroom + kitchen remodel |
| Advanced AI | Custom models trained on platform data, video understanding |
| Contractor CRM | Customer history, follow-up automation, calendar sync |
| Homeowner app features | Project history, favorite contractors, referral program |
| API launch | Scope-as-a-Service for B2B partners |
| Marketing automation | Re-engagement, seasonal campaigns, upsell flows |

**Success gate:** 5,000 completed jobs, 5+ cities, 5+ categories, AI estimate accuracy >80%

---

## 16. Tech Stack

### 16.1 Recommended Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend (Web)** | Next.js 15 (App Router) | SSR, fast iteration, React ecosystem |
| **Frontend (Mobile)** | React Native (Expo) — Phase 2 | Code sharing with web, cross-platform |
| **Backend** | Next.js API Routes → separate services when needed | Start monolithic, split when scale demands |
| **Database** | Supabase (PostgreSQL) | Managed Postgres, built-in auth, realtime, storage |
| **Auth** | Supabase Auth | Email, phone, social login out of the box |
| **File Storage** | Supabase Storage / Cloudinary | Media upload, video processing, image optimization |
| **AI — Vision** | Claude Vision API (Anthropic) | Best multi-modal understanding for scope generation |
| **AI — Structured Output** | Claude API with structured output | Task list, materials, cost generation |
| **Payments** | Stripe Connect | Marketplace payments, escrow, contractor payouts, 1099s |
| **Maps / Location** | Google Maps API | Geocoding, distance calc, service area |
| **Notifications** | Twilio (SMS) + Firebase (push) | Multi-channel notifications |
| **Email** | Resend or SendGrid | Transactional emails |
| **Hosting** | Vercel (frontend) + Supabase (backend/db) | Managed, scalable, minimal DevOps |
| **Monitoring** | Sentry (errors) + PostHog (analytics) | Error tracking + product analytics |
| **CI/CD** | GitHub Actions | Automated testing and deployment |

### 16.2 Architecture Principles

- **Start monolithic:** Single Next.js app with API routes. Don't microservice prematurely.
- **Split when pain appears:** Extract AI pipeline, matching engine, or payment service only when the monolith becomes a bottleneck.
- **TypeScript everywhere:** One language across frontend and backend reduces context-switching and enables code sharing.
- **Managed infrastructure:** Use Supabase, Vercel, Stripe — don't manage servers until >10K monthly jobs.
- **API-first design:** Even in monolith, design clean API boundaries for eventual separation.

---

## 17. Future Expansion

### 17.1 New Verticals (12+ months)
- **Painting** (interior/exterior)
- **Roofing** (repair and replacement)
- **HVAC** (maintenance, repair, installation)
- **Plumbing** (standalone, not just part of remodels)
- **Electrical** (standalone)
- **Flooring** (all rooms, not just kitchen/bath)
- **Fencing** (install, repair, replacement)
- **Cleaning** (deep clean, move-out, recurring)

### 17.2 Platform Extensions
- **Material procurement marketplace** — homeowners or contractors buy materials through the platform at negotiated rates
- **Financing integration** — "Pay $X/month for your remodel" via lending partners
- **Insurance integration** — automated damage claims with AI scope as evidence
- **Interior design AI** — upload room photo, get design suggestions with linked contractor jobs
- **Permit automation** — auto-generate permit applications from scope of work (by jurisdiction)

### 17.3 B2B Expansion
- **Property management companies** — bulk job management, recurring maintenance
- **Real estate agents** — pre-sale repair estimates, staging services
- **Insurance adjusters** — damage scoping from photos
- **Home warranty companies** — automated claim scoping and contractor dispatch

### 17.4 Geographic Expansion
- City-by-city expansion within the U.S. (density-first strategy)
- Canada (similar market dynamics, English-speaking)
- UK, Australia (long-term, same model adapted to local trades licensing)

---

## Appendix A: Glossary

| Term | Definition |
|---|---|
| **Scope of work** | Structured list of tasks, materials, and quantities needed to complete a job |
| **Starting bid (floor)** | Minimum price a contractor can bid — calculated by AI based on cost of labor + materials + minimum margin |
| **Max bid (ceiling)** | Maximum price a contractor can bid — calculated as floor + complexity buffer + premium margin |
| **Bid range** | The band between starting bid and max bid; all contractor bids must fall within this range |
| **Quality tier** | Material quality level selected by homeowner: budget, standard, or premium |
| **AI confidence score** | 0-1 score indicating how reliable the AI's output is for a given task or job |
| **Take rate** | Percentage of job value retained by the platform as revenue |
| **Escrow** | Payment held by platform until homeowner approves completed work |
| **Change order** | Mid-job scope modification requiring homeowner approval and cost adjustment |
| **Guided capture** | On-screen prompts helping homeowners take better photos/video for AI analysis |
| **Task photo evidence** | Specific frame or image extracted by AI and attached to a task to show what needs work |

## Appendix B: Job Status State Machine

```
uploading
  └─► ai_scoping
       └─► internal_review (Phase 1 only, skippable later)
            └─► homeowner_review
                 ├─► homeowner_approved
                 │    └─► listed
                 │         └─► bidding (bids being collected)
                 │              └─► assigned (contractor selected)
                 │                   └─► in_progress
                 │                        ├─► completed
                 │                        └─► disputed
                 └─► cancelled (at any point before assigned)
```

## Appendix C: Notification Events

| Event | Homeowner | Contractor | Channel |
|---|---|---|---|
| AI scope ready for review | Yes | — | Push, email |
| Homeowner approved job | — | Yes (matched) | Push, SMS |
| New bid received | Yes | — | Push |
| Bid accepted | — | Yes | Push, SMS, email |
| Job starting tomorrow | Yes | Yes | Push, SMS |
| Task marked complete | Yes | — | Push |
| Job completed — review requested | Yes | Yes | Push, email |
| Payment released | — | Yes | Push, email |
| Change order submitted | Yes | — | Push |
| Change order responded | — | Yes | Push |
| Recurring job reminder | Yes | Yes | Push, SMS |

---

*This PRD is a living document. It will be updated as we validate assumptions through prototype testing and user feedback.*
