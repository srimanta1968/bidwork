# BidWork — Cost Analysis & Unit Economics

**Version:** 1.0
**Date:** April 9, 2026
**Status:** Pre-Development Planning

---

## Table of Contents

1. [Executive Cost Summary](#1-executive-cost-summary)
2. [AI Processing Costs](#2-ai-processing-costs)
3. [Infrastructure Costs](#3-infrastructure-costs)
4. [Third-Party Service Costs](#4-third-party-service-costs)
5. [Customer Acquisition Costs](#5-customer-acquisition-costs)
6. [Operational Costs](#6-operational-costs)
7. [Unit Economics Per Job](#7-unit-economics-per-job)
8. [Monthly Cost Projections By Phase](#8-monthly-cost-projections-by-phase)
9. [Revenue vs Cost Analysis](#9-revenue-vs-cost-analysis)
10. [Cost Optimization Strategies](#10-cost-optimization-strategies)
11. [Break-Even Analysis](#11-break-even-analysis)
12. [Financial Risk Factors](#12-financial-risk-factors)

---

## 1. Executive Cost Summary

BidWork's cost structure has five layers:

| Cost Layer | Per Job Cost | % of Revenue | Scalability |
|---|---|---|---|
| AI processing | $0.15 - $0.60 | 0.3% - 2.7% | Scales linearly, volume discounts available |
| Infrastructure | $0.02 - $0.10 | <0.5% | Scales sub-linearly (shared resources) |
| Payment processing | 2.9% + $0.30 | 3% - 5% | Fixed rate, non-negotiable at early scale |
| Customer acquisition | $15 - $50 | Amortized over LTV | Decreases as organic/repeat grows |
| Operations (team) | Fixed monthly | Decreases per job as volume grows | Step-function (hire at thresholds) |

**Key insight:** AI is the cheapest variable cost in the entire business. Payment processing (Stripe) costs more per job than AI analysis. Customer acquisition is the largest cost by far.

---

## 2. AI Processing Costs

### 2.1 AI Pipeline Per Job

Every job requires 2-3 AI API calls:

```
Call 1: SCOPE GENERATION (Vision + Text → Structured Tasks)
   └─ Analyzes photos and video frames, generates task list
   └─ This is the most expensive call (images = high token count)

Call 2: BID RANGE CALCULATION (Tasks + Pricing Data → Floor/Ceiling)
   └─ Text-only, no images
   └─ Calculates starting bid and max bid per task

Call 3: CATEGORY CLASSIFICATION (optional — can be merged into Call 1)
   └─ Quick classification of job type from first image + description
   └─ Cheapest call, can use smallest model
```

### 2.2 Token Consumption Breakdown

#### Call 1: Scope Generation (Vision Call)

| Component | Token Count | Notes |
|---|---|---|
| System prompt (instructions, category-specific rules, output format) | ~2,000 | Reusable, cached with prompt caching |
| Photos from homeowner (5-8 images at 1024px) | ~5,000-8,000 per image | Claude: ~1,600 tokens (small) to ~6,400 (large) per image |
| Video key frames (10-15 frames extracted locally) | ~5,000-8,000 per frame | Same token cost as photos |
| Homeowner text description | ~100-300 | Short natural language |
| **Total input tokens** | **~80,000 - 160,000** | For 15-20 images total |
| | | |
| Structured task list output (5-15 tasks) | ~2,000-4,000 | JSON with descriptions, quantities, materials |
| Materials list per task | ~1,000-2,000 | Material name, qty, unit costs by tier |
| Summary and metadata | ~500 | Category, confidence, notes |
| **Total output tokens** | **~3,500-6,500** | |

#### Call 2: Bid Range Calculation (Text-Only Call)

| Component | Token Count | Notes |
|---|---|---|
| Task list from Call 1 | ~2,000-3,000 | Structured JSON |
| Local labor rate data | ~500-1,000 | Rates for relevant ZIP + category |
| Material pricing data | ~500-1,000 | Prices by quality tier |
| Instructions | ~500 | Pricing rules and output format |
| **Total input tokens** | **~3,500-5,000** | |
| | | |
| Bid range output (per-task + total) | ~1,500-3,000 | Floor, ceiling, breakdown |
| **Total output tokens** | **~1,500-3,000** | |

#### Call 3: Category Classification (Optional, Lightweight)

| Component | Token Count |
|---|---|
| First image + description | ~6,500-8,500 |
| Classification output | ~50-100 |

### 2.3 Cost Per Job By AI Model

Current API pricing (as of April 2026):

| Model | Input $/MTok | Output $/MTok | Call 1 Cost | Call 2 Cost | Call 3 Cost | **Total Per Job** |
|---|---|---|---|---|---|---|
| Claude Haiku 3.5 | $0.80 | $4.00 | $0.09-0.15 | $0.01-0.02 | $0.005 | **$0.10 - $0.17** |
| Claude Sonnet 4 | $3.00 | $15.00 | $0.29-0.55 | $0.03-0.06 | $0.02 | **$0.34 - $0.63** |
| Claude Opus 4 | $15.00 | $75.00 | $1.46-2.73 | $0.16-0.30 | $0.10 | **$1.72 - $3.13** |
| GPT-4o | $2.50 | $10.00 | $0.24-0.47 | $0.02-0.04 | $0.02 | **$0.28 - $0.53** |
| GPT-4o mini | $0.15 | $0.60 | $0.01-0.03 | $0.002 | $0.001 | **$0.02 - $0.03** |

### 2.4 Recommended Tiered Model Strategy

Use the right model for each call to optimize cost without sacrificing quality:

```
┌─────────────────────────────────┬─────────────────┬────────────┐
│ Call                            │ Recommended Model│ Cost       │
├─────────────────────────────────┼─────────────────┼────────────┤
│ Category classification         │ Haiku 3.5       │ $0.005     │
│ Scope generation (lawn/repair)  │ Sonnet 4        │ $0.30-0.50 │
│ Scope generation (remodel)      │ Sonnet 4 / Opus │ $0.50-2.50 │
│ Bid range calculation           │ Haiku 3.5       │ $0.01-0.02 │
│ Matching suggestions            │ No AI (algorithm)│ $0.00     │
├─────────────────────────────────┼─────────────────┼────────────┤
│ BLENDED COST PER JOB            │                 │ $0.15-0.60 │
└─────────────────────────────────┴─────────────────┴────────────┘
```

### 2.5 Cost Per Job By Service Category

| Job Type | Images Analyzed | AI Model Used | AI Cost | Platform Revenue (15%) | AI as % of Revenue |
|---|---|---|---|---|---|
| Lawn mowing (weekly) | 5-8 | Haiku/Sonnet | $0.10-0.25 | $11-22 | 1.1% - 2.3% |
| Lawn cleanup (one-time) | 8-12 | Sonnet | $0.25-0.40 | $30-60 | 0.7% - 1.3% |
| General repair/handyman | 3-8 | Sonnet | $0.15-0.30 | $22-75 | 0.4% - 1.4% |
| Patio installation | 10-15 | Sonnet | $0.35-0.55 | $450-1,200 | 0.05% - 0.12% |
| Bathroom remodel | 15-20 | Sonnet/Opus | $0.50-0.65 | $750-2,250 | 0.03% - 0.09% |
| Kitchen remodel | 15-25 | Sonnet/Opus | $0.55-0.75 | $1,500-3,750 | 0.02% - 0.05% |

**Takeaway:** AI cost is negligible for high-ticket jobs (remodels). For low-ticket recurring jobs (lawn mowing), AI cost is still under 2.5% of revenue — well within healthy margins.

### 2.6 Video Processing Cost (Local vs Cloud)

Video analysis has a hidden cost trap. Sending raw video frames to AI is expensive. The solution is local preprocessing.

**Naive approach (DO NOT DO THIS):**
```
60-second video at 30fps = 1,800 frames
Send all frames to Claude Vision:
  1,800 frames × 6,000 tokens = 10.8M input tokens
  Cost with Sonnet: $32.40 per job
  
THIS DESTROYS MARGINS
```

**Optimized approach (what BidWork uses):**
```
60-second video → LOCAL processing pipeline (zero AI cost):
  Step 1: FFmpeg extracts frames at 2fps → 120 frames           FREE
  Step 2: Blur detection removes unusable frames → ~80 frames    FREE
  Step 3: Perceptual hash deduplication → ~25 unique frames      FREE
  Step 4: Scene-change grouping → ~15 key frames                 FREE
  Step 5: Resize to 1024px max dimension → 15 optimized images   FREE

Send 15 key frames to Claude Vision:
  15 frames × 6,000 tokens = 90K input tokens
  Cost with Sonnet: $0.27 - $0.40 per job

SAVINGS: ~99% reduction vs naive approach
```

**Local video processing requirements:**

| Component | Tool | Server Cost | Notes |
|---|---|---|---|
| Frame extraction | FFmpeg | Free (open source) | Runs on server CPU |
| Blur detection | OpenCV / Sharp.js | Free (open source) | Laplacian variance threshold |
| Deduplication | pHash / image-hash | Free (open source) | Perceptual hashing |
| Scene grouping | k-means clustering | Free (open source) | Color histogram similarity |
| Resize/optimize | Sharp.js | Free (open source) | Fast image processing for Node.js |
| **Server compute** | Vercel / AWS Lambda | $0.001-0.01 per video | Serverless, pay per execution |

### 2.7 Prompt Caching Savings

Claude API supports prompt caching — system prompts and few-shot examples can be cached and reused across calls.

| Component | Cacheable? | Token Count | Savings |
|---|---|---|---|
| System prompt (instructions) | Yes | ~2,000 | 90% cost reduction on cached portion |
| Category-specific rules | Yes | ~500-1,000 | 90% cost reduction |
| Few-shot examples | Yes | ~1,000-2,000 | 90% cost reduction |
| User images/text | No | ~80,000-150,000 | No savings (unique per job) |

**With prompt caching enabled:**
- Cached input tokens cost 10% of normal price
- ~4,000-5,000 tokens cached per call
- Saves ~$0.01-0.04 per call with Sonnet
- At 10,000 jobs/month: saves $100-400/month

### 2.8 AI Cost Projection Over Time

As the platform grows, AI cost per job should decrease:

| Factor | Impact | Timeline |
|---|---|---|
| Prompt caching adoption | -10% cost per call | Immediate |
| Model price reductions (industry trend) | -20-40% annually | Ongoing |
| Volume pricing / committed use discounts | -30-50% | At 10K+ jobs/month |
| Smarter frame selection (fewer images needed) | -15-25% per call | 3-6 months |
| Category-specific fine-tuned models | -40-60% (use smaller models) | 12+ months |
| Batch API (non-urgent jobs processed in batch) | -50% via batch pricing | Immediate for non-urgent |

**Projected AI cost per job over 24 months:**
```
Launch (Month 1):    $0.30-0.60
Month 6:             $0.20-0.45  (caching + model price drops)
Month 12:            $0.12-0.30  (volume discounts + optimization)
Month 24:            $0.06-0.15  (fine-tuned models + batch processing)
```

---

## 3. Infrastructure Costs

### 3.1 Hosting & Database

| Service | Free Tier | Growth Tier | Scale Tier | When to Upgrade |
|---|---|---|---|---|
| **Supabase (DB + Auth + Storage)** | $0/mo (500MB DB, 1GB storage) | $25/mo (8GB DB, 100GB storage) | $599/mo (unlimited) | >500 jobs/month |
| **Vercel (Frontend + API)** | $0/mo (hobby) | $20/mo (Pro) | $150+/mo (Enterprise) | Immediately (Pro needed for team) |
| **Supabase Storage (media)** | Included in plan | Included | $0.021/GB beyond plan | >100GB media stored |

### 3.2 Media Storage Costs

Each job generates media that needs storage:

| Media Type | Size Per Job | Monthly Volume (1K jobs) | Storage Cost |
|---|---|---|---|
| Homeowner photos (5-8) | 15-40 MB | 15-40 GB | $0.32-0.84 |
| Homeowner video (30-120s) | 30-200 MB | 30-200 GB | $0.63-4.20 |
| AI-extracted frames (10-15) | 5-15 MB | 5-15 GB | $0.11-0.32 |
| Contractor progress photos | 5-20 MB | 5-20 GB | $0.11-0.42 |
| **Total per 1K jobs/month** | | **55-275 GB** | **$1.17-5.78** |

**Storage optimization:**
- Compress videos after frame extraction (keep lower quality archive)
- Generate thumbnails for UI, serve originals only on demand
- Set retention policy: archive media 90 days after job completion
- Use CDN caching for frequently accessed images

### 3.3 Compute Costs (Video Processing)

Video frame extraction runs server-side:

| Provider | Cost Model | Cost Per Video | At 1K Videos/Month |
|---|---|---|---|
| Vercel Serverless Functions | $0.18 per 1M function invocations + compute time | $0.005-0.02 | $5-20 |
| AWS Lambda | $0.20 per 1M invocations + $0.0000166667/GB-sec | $0.003-0.01 | $3-10 |
| Dedicated server (if volume warrants) | $50-200/month fixed | $0.005-0.02 | $50-200 (fixed) |

**Recommendation:** Use Vercel serverless functions through Phase 1. Switch to dedicated compute at >5,000 videos/month if cost efficiency demands it.

### 3.4 Infrastructure Cost Summary By Phase

| Phase | Jobs/Month | Supabase | Vercel | Storage | Compute | **Total Infra** |
|---|---|---|---|---|---|---|
| Phase 0 (Prototype) | 50-100 | $0 (free) | $20 | $1-3 | $1-2 | **$22-25** |
| Phase 1 (MVP) | 200-500 | $25 | $20 | $5-15 | $5-10 | **$55-70** |
| Phase 2 (Scale) | 1,000-3,000 | $25-599 | $20-150 | $15-80 | $15-60 | **$75-890** |
| Phase 3 (Growth) | 5,000-10,000 | $599 | $150 | $80-275 | $50-200 | **$880-1,225** |

---

## 4. Third-Party Service Costs

### 4.1 Payment Processing (Stripe Connect)

| Fee Component | Rate | Per $100 Job | Per $5,000 Job |
|---|---|---|---|
| Standard processing | 2.9% + $0.30 | $3.20 | $145.30 |
| Connect platform fee | +0.25% | $0.25 | $12.50 |
| Payout to contractor | $0.25 per payout | $0.25 | $0.25 |
| **Total Stripe cost** | | **$3.70** | **$158.05** |
| **As % of job value** | | **3.7%** | **3.2%** |

**Important:** Stripe fees come from the homeowner's payment, not from your margin. Your take rate (15%) is calculated before Stripe fees:

```
$100 lawn job:
  Homeowner pays:         $100.00
  Stripe takes:            -$3.20  (2.9% + $0.30)
  Net received:            $96.80
  Platform fee (15%):      $15.00
  Contractor payout:       $81.80  (minus $0.25 payout fee)
  
  Effective platform revenue: $15.00
  Effective Stripe cost:      $3.45 (from total collected)
```

### 4.2 Communications

| Service | Cost | Usage Per Job | Monthly (1K jobs) |
|---|---|---|---|
| **Twilio SMS** | $0.0079/msg sent, $0.0079/msg received | 5-10 messages | $40-80 |
| **Firebase Push** | Free (up to 500M msg/month) | 10-20 notifications | $0 |
| **Resend (Email)** | Free (3K/month) → $20/mo (50K/month) | 3-5 emails | $0-20 |
| **Total comms** | | | **$40-100** |

### 4.3 Maps & Location

| Service | Cost | Usage Per Job | Monthly (1K jobs) |
|---|---|---|---|
| **Google Maps Geocoding** | $5 per 1K calls | 1-2 calls | $5-10 |
| **Google Maps Distance Matrix** | $5 per 1K elements | 3-5 elements (matching) | $15-25 |
| **Total maps** | | | **$20-35** |

### 4.4 Monitoring & Analytics

| Service | Free Tier | Paid Tier | When to Upgrade |
|---|---|---|---|
| **Sentry (error tracking)** | Free (5K events/mo) | $26/mo (50K events) | >5K errors/month |
| **PostHog (product analytics)** | Free (1M events/mo) | $0 up to 1M events | >1M events/month |
| **Total monitoring** | **$0** | **$26+** | Phase 2 |

### 4.5 Third-Party Cost Summary

| Service Category | Monthly Cost (Phase 0) | Monthly Cost (Phase 1) | Monthly Cost (Phase 2) |
|---|---|---|---|
| Stripe (payment processing) | Included in transaction | Included in transaction | Included in transaction |
| Communications (SMS + email) | $10-20 | $40-100 | $150-400 |
| Maps & location | $5-10 | $20-35 | $60-120 |
| Monitoring | $0 | $0 | $26-50 |
| Domain + SSL | $15/year | $15/year | $15/year |
| **Total third-party** | **$16-31** | **$61-136** | **$237-571** |

---

## 5. Customer Acquisition Costs

### 5.1 Homeowner Acquisition

| Channel | Cost Per Click | Conversion Rate | **CAC** | Volume Potential |
|---|---|---|---|---|
| Google Ads (intent: "lawn care near me") | $3-8 | 5-10% | **$30-160** | High |
| Facebook/Instagram (geo-targeted) | $1-3 | 2-5% | **$20-150** | Medium |
| Nextdoor Ads | $2-5 | 3-7% | **$30-170** | Medium (hyper-local) |
| Local SEO (organic) | $0 (time investment) | 3-8% | **$0** | Grows over time |
| Referral program ($20 credit) | $20 per referral | 15-25% | **$20-25** | Scales with users |
| Viral loop (shareable AI estimates) | $0 | 1-3% | **$0** | Unpredictable |

**Blended target CAC:** $25-50 per homeowner

**LTV calculation (homeowner):**
```
Scenario A: Lawn care customer
  Average job value: $100
  Platform revenue per job: $15
  Jobs per year: 20-30 (biweekly seasonal)
  Annual revenue per customer: $300-450
  Average retention: 2 years
  LTV: $600-900
  LTV/CAC ratio: 12x-36x

Scenario B: Remodel customer
  Average job value: $8,000
  Platform revenue per job: $1,200
  Jobs per year: 1-2
  Annual revenue per customer: $1,200-2,400
  LTV (one-time + potential repeat): $1,200-3,600
  LTV/CAC ratio: 24x-144x

Scenario C: Mixed customer (lawn + occasional repair/remodel)
  Annual revenue: $450-1,650
  Average retention: 2.5 years
  LTV: $1,125-4,125
  LTV/CAC ratio: 22x-165x
```

### 5.2 Contractor Acquisition

| Channel | Approach | CAC | Volume |
|---|---|---|---|
| Direct outreach (cold call/email) | Target existing Thumbtack/Angi pros | $50-150 | Low but high quality |
| Facebook groups (local contractor groups) | Free posting + targeted ads | $30-80 | Medium |
| Industry events / supply stores | Flyers, in-person pitches | $20-60 | Low |
| Contractor referral program | $50 bonus per referral | $50 | Scales with network |
| Organic (contractors find platform via homeowner activity) | $0 | $0 | Grows with demand |

**Blended target CAC:** $50-100 per contractor

**LTV calculation (contractor):**
```
Average contractor handles: 8-15 jobs/month via platform
Average job value: $300 (blended across categories)
Platform fee per job: $45
Monthly revenue per contractor: $360-675
Average retention: 18 months
LTV: $6,480-12,150
LTV/CAC ratio: 65x-243x
```

### 5.3 Marketing Budget By Phase

| Phase | Monthly Ad Spend | Expected Homeowners Acquired | Expected Contractors Acquired |
|---|---|---|---|
| Phase 0 | $500-1,000 | 15-30 | 5-10 (manual outreach) |
| Phase 1 | $2,000-5,000 | 60-150 | 15-30 |
| Phase 2 | $10,000-25,000 | 300-750 | 50-100 |
| Phase 3 | $25,000-75,000 | 750-2,000 | 100-250 |

---

## 6. Operational Costs

### 6.1 Team Costs (Phase 0 — Founder-Led)

| Role | Who | Monthly Cost |
|---|---|---|
| Product + engineering | Founder(s) | $0 (sweat equity) |
| AI scope reviewer (part-time) | Founder or VA | $0-500 |
| Contractor outreach | Founder | $0 (sweat equity) |
| **Total Phase 0** | | **$0-500** |

### 6.2 Team Costs (Phase 1 — First Hires)

| Role | Count | Monthly Cost |
|---|---|---|
| Full-stack engineer | 1 | $8,000-15,000 |
| AI/scope reviewer (part-time) | 1-2 | $1,500-3,000 |
| Contractor success / ops | 1 | $4,000-7,000 |
| **Total Phase 1** | | **$13,500-25,000** |

### 6.3 Team Costs (Phase 2 — Growth)

| Role | Count | Monthly Cost |
|---|---|---|
| Engineers (frontend + backend + AI) | 2-3 | $20,000-45,000 |
| Scope reviewers | 2-3 | $4,000-7,500 |
| Ops / customer success | 1-2 | $4,000-10,000 |
| Marketing / growth | 1 | $5,000-10,000 |
| **Total Phase 2** | | **$33,000-72,500** |

### 6.4 Internal Scope Review Cost

This is a unique operational cost that decreases over time as AI improves:

| Phase | Reviews/Month | Time Per Review | Hourly Rate | Monthly Cost | Cost Per Job |
|---|---|---|---|---|---|
| Phase 0 | 50-100 | 5-10 min | $20/hr | $85-335 | $1.70-3.35 |
| Phase 1 | 200-500 | 3-5 min | $20/hr | $200-835 | $1.00-1.67 |
| Phase 2 (AI improves) | 500-1,000 (30% reviewed) | 2-3 min | $20/hr | $335-1,000 | $0.33-1.00 |
| Phase 3 (AI mature) | 500-1,000 (10% reviewed) | 2-3 min | $20/hr | $170-500 | $0.03-0.10 |

**Key insight:** Internal review is the most expensive per-job operational cost in Phase 0-1, but it drops dramatically as AI accuracy improves and only complex/high-value jobs require human review.

---

## 7. Unit Economics Per Job

### 7.1 Lawn Mowing (Weekly Recurring — $100 Job)

```
Revenue:
  Job value:                          $100.00
  Platform fee (15%):                  $15.00  ← your revenue

Variable costs:
  AI processing (Sonnet tiered):       -$0.20
  Stripe fees (2.9% + $0.30):         -$3.20  (from total, not your margin)
  SMS notifications (~5 messages):     -$0.04
  Maps API (geocoding + distance):     -$0.01
  Internal scope review (Phase 1):     -$1.50
  Video/image processing (compute):    -$0.01
  Storage (media, 30 days):            -$0.01
  ─────────────────────────────────────────
  Total variable cost:                 -$4.97

Contribution margin:                   $10.03
Contribution margin %:                 66.9%

After AI maturity (no internal review):
  Total variable cost:                 -$3.47
  Contribution margin:                 $11.53
  Contribution margin %:               76.9%

Recurring value (biweekly, 7-month season):
  Jobs per customer per season:         ~14
  Seasonal contribution:                $140-161
```

### 7.2 Lawn Cleanup (One-Time — $300 Job)

```
Revenue:
  Job value:                          $300.00
  Platform fee (15%):                  $45.00

Variable costs:
  AI processing:                       -$0.35
  Stripe fees:                         -$9.00
  Communications:                      -$0.06
  Maps API:                            -$0.01
  Internal scope review:               -$1.50
  Video/image processing:              -$0.01
  Storage:                             -$0.02
  ──────────────────────────────────────────
  Total variable cost:                -$10.95

Contribution margin:                   $34.05
Contribution margin %:                 75.7%
```

### 7.3 Patio Installation ($5,000 Job)

```
Revenue:
  Job value:                        $5,000.00
  Platform fee (12%):                 $600.00

Variable costs:
  AI processing (Sonnet):              -$0.50
  Stripe fees:                       -$145.30
  Communications:                      -$0.10
  Maps API:                            -$0.01
  Internal scope review:               -$2.00
  Video/image processing:              -$0.02
  Storage:                             -$0.05
  ──────────────────────────────────────────
  Total variable cost:               -$147.98

Contribution margin:                  $452.02
Contribution margin %:                 75.3%
```

### 7.4 Bathroom Remodel ($10,000 Job)

```
Revenue:
  Job value:                       $10,000.00
  Platform fee (10%):               $1,000.00

Variable costs:
  AI processing (Sonnet/Opus):          -$0.65
  Stripe fees:                        -$290.30
  Communications:                       -$0.15
  Maps API:                             -$0.01
  Internal scope review:                -$3.00
  Video/image processing:               -$0.02
  Storage:                              -$0.08
  ──────────────────────────────────────────
  Total variable cost:                -$294.21

Contribution margin:                   $705.79
Contribution margin %:                  70.6%
```

### 7.5 Kitchen Remodel ($20,000 Job)

```
Revenue:
  Job value:                       $20,000.00
  Platform fee (10%):               $2,000.00

Variable costs:
  AI processing (Opus):                 -$0.75
  Stripe fees:                        -$580.30
  Communications:                       -$0.20
  Maps API:                             -$0.01
  Internal scope review:                -$3.00
  Video/image processing:               -$0.03
  Storage:                              -$0.10
  ──────────────────────────────────────────
  Total variable cost:                -$584.39

Contribution margin:                 $1,415.61
Contribution margin %:                  70.8%
```

### 7.6 Unit Economics Summary

| Job Type | Job Value | Revenue | Variable Cost | Contribution | Margin % |
|---|---|---|---|---|---|
| Lawn mowing | $100 | $15 | $4.97 | $10.03 | 66.9% |
| Lawn cleanup | $300 | $45 | $10.95 | $34.05 | 75.7% |
| Handyman repair | $250 | $37.50 | $9.15 | $28.35 | 75.6% |
| Patio install | $5,000 | $600 | $147.98 | $452.02 | 75.3% |
| Bathroom remodel | $10,000 | $1,000 | $294.21 | $705.79 | 70.6% |
| Kitchen remodel | $20,000 | $2,000 | $584.39 | $1,415.61 | 70.8% |

**Key insight:** Stripe payment processing is the dominant variable cost across all job types, not AI. AI represents less than 5% of variable costs for every category.

---

## 8. Monthly Cost Projections By Phase

### Phase 0: Prototype (Months 1-2)

```
Jobs/month: 50-100
Revenue/month: $750-3,000

COSTS:
  AI processing:          $15-60
  Infrastructure:         $22-25
  Third-party services:   $16-31
  Marketing:              $500-1,000
  Team (founder-led):     $0-500
  Scope review (internal):$85-335
  ─────────────────────────────────
  TOTAL MONTHLY COST:     $638-1,951

  Revenue - Cost:         $112 to $1,049
  Burn rate (if negative): Minimal — possibly profitable from month 1
```

### Phase 1: MVP (Months 2-4)

```
Jobs/month: 200-500
Revenue/month: $5,000-20,000

COSTS:
  AI processing:          $60-300
  Infrastructure:         $55-70
  Third-party services:   $61-136
  Marketing:              $2,000-5,000
  Team:                   $13,500-25,000
  Scope review (internal):$200-835
  ─────────────────────────────────
  TOTAL MONTHLY COST:     $15,876-31,341

  Revenue - Cost:         -$10,876 to -$11,341
  Monthly burn:           ~$11K-15K (requires funding or bootstrapping reserves)
```

### Phase 2: Scale (Months 5-8)

```
Jobs/month: 1,000-3,000
Revenue/month: $30,000-120,000

COSTS:
  AI processing:          $300-1,800
  Infrastructure:         $75-890
  Third-party services:   $237-571
  Marketing:              $10,000-25,000
  Team:                   $33,000-72,500
  Scope review (internal):$335-1,000
  ─────────────────────────────────
  TOTAL MONTHLY COST:     $43,947-101,761

  Revenue - Cost:         -$13,947 to $18,239
  Break-even possible at: ~2,000-2,500 jobs/month
```

### Phase 3: Growth (Months 9-12)

```
Jobs/month: 5,000-10,000
Revenue/month: $150,000-500,000

COSTS:
  AI processing:          $1,500-6,000
  Infrastructure:         $880-1,225
  Third-party services:   $500-1,500
  Marketing:              $25,000-75,000
  Team:                   $50,000-120,000
  Scope review (internal):$170-500
  ─────────────────────────────────
  TOTAL MONTHLY COST:     $78,050-204,225

  Revenue - Cost:         $71,950 to $295,775
  Net margin:             ~30-60%
```

---

## 9. Revenue vs Cost Analysis

### 9.1 Cost Structure Breakdown (at 2,000 jobs/month)

```
Revenue: ~$60,000/month (blended $30 avg platform fee per job)

Cost breakdown:
  ┌─────────────────────────────┬──────────┬────────┐
  │ Category                    │ Monthly  │ % Rev  │
  ├─────────────────────────────┼──────────┼────────┤
  │ Team / operations           │ $33,000  │ 55.0%  │
  │ Marketing / CAC             │ $10,000  │ 16.7%  │
  │ Payment processing (Stripe) │ $4,500   │  7.5%  │
  │ AI processing               │ $800     │  1.3%  │
  │ Scope review (internal)     │ $670     │  1.1%  │
  │ Infrastructure              │ $300     │  0.5%  │
  │ Third-party services        │ $400     │  0.7%  │
  ├─────────────────────────────┼──────────┼────────┤
  │ TOTAL COSTS                 │ $49,670  │ 82.8%  │
  │ NET MARGIN                  │ $10,330  │ 17.2%  │
  └─────────────────────────────┴──────────┴────────┘
```

### 9.2 Cost Ranking (Largest to Smallest)

```
1. TEAM (55%)         ████████████████████████████████  ← Biggest cost
2. MARKETING (16.7%)  ██████████
3. STRIPE (7.5%)      █████
4. AI (1.3%)          █
5. REVIEW (1.1%)      █
6. SERVICES (0.7%)    ▌
7. INFRA (0.5%)       ▌

AI is the 4th largest cost — smaller than team, marketing, and Stripe.
```

---

## 10. Cost Optimization Strategies

### 10.1 AI Cost Optimizations

| Strategy | Savings | Effort | Timeline |
|---|---|---|---|
| **Prompt caching** (cache system prompts) | 5-10% | Low | Week 1 |
| **Tiered models** (Haiku for simple, Sonnet for complex) | 30-50% | Low | Week 1 |
| **Smart frame selection** (fewer, better images) | 15-25% | Medium | Month 2 |
| **Batch API** (process non-urgent jobs in batch at 50% discount) | 50% on batch jobs | Low | Month 1 |
| **Image resolution optimization** (768px vs 1024px for simple jobs) | 20-30% | Low | Month 1 |
| **Volume pricing negotiation** (Anthropic enterprise) | 30-50% | Medium | At 10K jobs/month |
| **Fine-tuned smaller model** (custom model for common categories) | 40-60% | High | Month 12+ |

### 10.2 Infrastructure Optimizations

| Strategy | Savings | Timeline |
|---|---|---|
| Aggressive image compression (WebP/AVIF) | 40-60% storage reduction | Month 1 |
| Media archival policy (move to cold storage after 90 days) | 50% ongoing storage costs | Month 3 |
| CDN caching for frequently accessed media | Reduced bandwidth costs | Month 2 |
| Edge functions for video processing (process near user) | Reduced latency + compute | Month 4 |

### 10.3 Operational Optimizations

| Strategy | Savings | Timeline |
|---|---|---|
| Reduce scope review rate as AI improves (100% → 30% → 10%) | 70-90% review labor cost | Months 3-12 |
| Automated contractor onboarding (reduce ops time) | 50% ops labor on onboarding | Month 3 |
| Self-serve dispute resolution (before human escalation) | 30% ops labor on disputes | Month 6 |

### 10.4 Marketing Optimizations

| Strategy | Impact | Timeline |
|---|---|---|
| Viral shareable estimates (organic acquisition) | Reduce paid CAC by 20-40% | Month 2 |
| Referral program ($20 credit, $25 effective CAC) | Cheapest acquisition channel | Month 1 |
| SEO investment (long-term organic) | $0 marginal CAC at scale | Months 6-12 |
| Recurring customers (lawn care retention) | $0 re-acquisition cost | Immediate |
| Contractor-driven demand (pros bring their customers) | $0 acquisition for those users | Month 4 |

---

## 11. Break-Even Analysis

### 11.1 Fixed Costs Per Month

| Phase | Fixed Monthly Costs | Notes |
|---|---|---|
| Phase 0 | $540-1,530 | Founder-led, minimal spend |
| Phase 1 | $15,580-30,200 | First hires + marketing |
| Phase 2 | $43,310-98,390 | Growth team + expanded marketing |
| Phase 3 | $75,880-196,500 | Full team + aggressive marketing |

### 11.2 Contribution Margin Per Job (Blended)

```
Blended average job value: $500 (mix of lawn + repairs + remodels)
Blended platform fee: 14%
Average revenue per job: $70

Average variable cost per job:
  AI: $0.35
  Stripe: $14.80
  Communications: $0.08
  Maps: $0.01
  Scope review: $1.50 (Phase 1), $0.30 (Phase 2+)
  Compute + storage: $0.05
  ──────────────────────
  Total: $16.79 (Phase 1), $15.59 (Phase 2+)

Contribution margin per job: $53.21 (Phase 1), $54.41 (Phase 2+)
```

### 11.3 Break-Even Volume

```
Phase 0:  $1,000 fixed costs / $53 contribution = ~19 jobs/month
Phase 1: $23,000 fixed costs / $53 contribution = ~434 jobs/month
Phase 2: $70,000 fixed costs / $54 contribution = ~1,296 jobs/month
Phase 3: $136,000 fixed costs / $54 contribution = ~2,519 jobs/month
```

### 11.4 Path to Profitability

```
Month 1-2 (Phase 0):  50-100 jobs    → Possibly profitable (founder-led)
Month 3-4 (Phase 1):  200-500 jobs   → Burning ~$11-15K/month
Month 5-6 (Phase 2):  1,000-2,000    → Approaching break-even
Month 7-8 (Phase 2):  2,000-3,000    → Profitable ($10-40K/month)
Month 9-12 (Phase 3): 5,000-10,000   → Strong profit ($70-300K/month)
```

### 11.5 Funding Requirements

```
If bootstrapping:
  Phase 0 burns:    $0-2K total (2 months)
  Phase 1 burns:    $22-30K total (2 months at deficit)
  Phase 2 (early):  $14-28K total (2 months before break-even)
  ─────────────────────────────────────────────
  Total funding needed: $36-60K to reach profitability

If raising:
  Seed round: $150-300K covers 12 months runway with aggressive growth
  Spend more on marketing → reach break-even faster → better unit economics
```

---

## 12. Financial Risk Factors

### 12.1 AI Price Increases

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| AI API prices increase significantly | Low (trend is downward) | Low (AI is <2% of costs) | Multi-provider strategy (Claude, GPT, open-source fallback) |

Even if AI costs doubled, the impact on per-job economics is negligible ($0.30 → $0.60). AI cost is not a business risk.

### 12.2 Stripe Fee Increases

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Payment processing fees increase | Low | Medium (7.5% of revenue) | Negotiate volume pricing, explore alternatives (Adyen, direct ACH) |

### 12.3 Low-Ticket Job Dominance

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Job mix skews heavily toward $75-100 lawn jobs | Medium | Margin pressure (higher % to Stripe + AI per dollar revenue) | Push recurring (14 jobs/season vs one-time), upsell to landscaping/remodel, adjust take rate for low-ticket |

### 12.4 High CAC in Competitive Markets

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Google Ads CPC rises in competitive metros | High | CAC increases to $50-80+ | Invest in organic/SEO, referral program, viral estimate sharing, contractor-driven demand |

### 12.5 Scope Review Doesn't Scale

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| AI accuracy doesn't improve fast enough, requiring human review at scale | Medium | $0.50-3.00 per job in labor | Invest in AI feedback loop, focus on categories where AI is already accurate, auto-skip review for high-confidence jobs |

### 12.6 Summary of Financial Risks

```
RISK SEVERITY (impact × probability):

High:    CAC escalation in competitive markets
Medium:  Low-ticket job mix skewing margins
Medium:  Scope review labor not declining fast enough
Low:     AI cost increases
Low:     Stripe fee increases
Low:     Infrastructure costs
```

---

## Appendix: Cost Comparison with Competitors

### What Competitors Spend That You Don't

| Cost | Thumbtack | Angi | LawnStarter | BidWork |
|---|---|---|---|---|
| Sales team (selling leads to pros) | High | Very high | Medium | $0 (self-serve) |
| Call center (matching, disputes) | High | Very high | High | Low (AI + self-serve) |
| Manual matching labor | Medium | Medium | Medium | $0 (algorithmic) |
| Manual estimating/scoping | None (left to pros) | None | Partial (standardized) | AI ($0.15-0.60) |
| Lead quality insurance | High (refunds) | High | Medium | Low (pre-scoped = qualified) |

### What You Spend That Competitors Don't

| Cost | BidWork | Competitors |
|---|---|---|
| AI processing per job | $0.15-0.60 | $0 |
| Internal scope review (Phase 1) | $1-3 per job | $0 |
| Video processing compute | $0.01-0.02 per job | $0 |

**Net advantage:** Your unique costs (AI + review) total $1-4 per job. Competitors' costs for sales teams, call centers, and lead refunds are $20-100+ per lead. You are structurally cheaper to operate at scale.

---

*This cost analysis will be updated quarterly as actual platform data replaces projections.*
