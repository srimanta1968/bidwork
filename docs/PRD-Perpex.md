PRD v1 — AI-Powered Bidding Marketplace for Home Remodeling & Lawn Care

1. Product Summary
   Build a two-sided marketplace where:

Homeowners upload:

Videos, images, and a short description of the job (remodel, repair, lawn care, etc.).

AI converts that into:

Structured scope of work

Material list

Cost estimate (range)

Duration / timeline

Contractors (“Pros”) receive:

Pre-scoped, qualified jobs

AI-generated initial quote they can accept or adjust

Platform handles:

Smart matching

Pricing optimization

Booking and payments

Closed-loop feedback (quality, rating, actual vs estimated cost)

This is effectively a next-gen Angi + Thumbtack + LawnStarter + Houzz + TaskRabbit, with AI scope generation + auto-bidding as the core wedge.

2. Goals & Non-Goals
   2.1 Primary Goals (12–18 months)
   Launch in 1 focused vertical + 1–2 metros

e.g., “lawn clean-up + recurring mowing” OR “bathroom remodels” only.

Reduce time from homeowner request → first contractor quote to < 10 minutes via AI scopes/estimates.

Deliver contractors 2–3x faster, more qualified opportunities vs. lead-gen platforms (higher close rate, less time quoting).

Establish profitable take-rate economics in first market (e.g., 15–20% platform fee) with repeat usage.

2.2 Non-Goals (Phase 1)
Not a full CRM/field-service tool like ServiceTitan/Jobber.

Not a generic lead marketplace (no pay-per-lead).

Not covering all home-service categories from day 1.

Not replacing detailed in-person estimates for complex, high-ticket projects; we accelerate pre-qual and ballparks.

3. Target Users & JTBD
   3.1 Homeowners
   Profile: Busy, digitally native (25–55), wants quotes fast, doesn’t understand scope/pricing.

JTBD:

“Help me quickly understand what my project will cost and find a trustworthy pro to do it — without 5 site visits and 10 phone calls.”

3.2 Contractors / Service Pros
Profile: Small to mid-size local businesses in lawn care or remodeling; limited time to quote; already using Angi/Thumbtack/GreenPal.

JTBD:

“Send me qualified jobs that match my skills and pricing, with most of the scoping done so I can accept/adjust and start work quickly.”

4. Problem Statement
   Existing platforms (Angi, Thumbtack, Houzz, LawnStarter, GreenPal, TaskRabbit) solve lead generation and matching, but they do not solve:

“What exactly needs to be done?”

“How much should it cost?”

“Who is the best contractor for THIS specific job?”

Contractors waste time on unqualified leads and manual estimates; homeowners waste time describing jobs repeatedly and getting wildly different quotes. AI cost estimators exist, but they typically rely on manual form inputs, not real job media (photos/video) and they don’t tie into a live marketplace of contractors.

5. Competitive Landscape (USA)
   5.1 Direct Marketplace / Lead Platforms
   LawnStarter – lawn care marketplace with standardized SKUs, strong Pro acquisition and supply density.

GreenPal – “Uber for lawn care”; homeowners post request, pros bid manually.

Thumbtack – broad home-services lead marketplace; pros pay per lead.

Angi/HomeAdvisor – subscription + lead-gen; strong demand, but expensive for pros, low ROI.

TaskRabbit – gig-style marketplace for simple tasks; standardized jobs and pricing.

Houzz – inspiration + pro directory + Houzz Pro SaaS; strong visual UX, weak transactional flow.

5.2 Workflow / Estimating Tools (Indirect but Important)
Houzz Pro, Jobber, Housecall Pro, JobNimbus, ServiceTitan – contractor OS: scheduling, quoting, invoicing.

AI estimating tools (e.g., AI that scans drawings/scopes and outputs estimates in minutes) prove the feasibility and value of rapid AI-driven estimating for remodels.

5.3 Gaps (Your Edge)
No major player:

Uses uploaded photos/video as the primary input for scope + estimate + auto-bid.

Runs a closed-loop marketplace where the platform controls job definition, price band, matching, and feedback (Uber-like) vs. just selling leads.

6. Key Differentiators
   AI Scope Generation (Core Wedge)

Input: homeowner’s video, images, minimal text.

Output:

Structured scope of work (tasks, areas, quantities).

Material list (with quality tiers).

Cost estimate range, calibrated by local labor/material data.

Estimated duration / schedule window.

Impact:

Reduces homeowner confusion.

Eliminates initial scoping ambiguity for pros.

Drastically reduces time to first meaningful quote (vs. manual site visits).

Auto-Bidding Engine

Platform generates an initial quote based on:

AI scope + local price data.

Contractor’s historical pricing profile.

Pros can:

Accept as-is.

Adjust markup, materials, or scope.

Value:

Pros spend time on adjustments, not from-scratch quoting.

Creates consistent pricing expectations for homeowners.

Quality Matching (Not Lead Selling)

Matching based on:

Skill tags (e.g., “bathroom remodel,” “paver installation,” “tree trimming”).

Past project performance and NPS.

Price-performance profile (no pure “lowest bid wins” race to the bottom).

Platform optimizes for successful completion & satisfaction, not lead volume.

Closed-Loop System (Uber-like, not Craigslist-like)

Platform owns:

Job creation (scope/estimate).

Matching and job assignment.

Communication, scheduling, and payments.

Feedback, dispute resolution, rework loop.

Over time:

Trains models on actual vs estimated cost, duration, and satisfaction.

Improves future estimates and matching.

7. Business Model
   7.1 Primary Model: Take Rate
   10–20% platform fee on job value (like LawnStarter/TaskRabbit).

Homeowner sees:

All-in price (fees embedded).

Contractor:

Sees payout net of platform fee.

7.2 Future Hybrid: SaaS + Marketplace
For high-usage pros:

Monthly subscription for:

Advanced analytics

CRM-lite

Priority in matching queue

Plus lower incremental take rate.

7.3 Avoid: Pure Lead Gen
No “pay per lead” without accountability for outcomes (Angi/Thumbtack model weaknesses).

Core metric: jobs completed and net revenue per contractor, not number of leads.

8. Scope v1 (MVP)
   8.1 Vertical & Geography
   Start with one:

Option A: Lawn care (clean-up + recurring mowing)

Option B: Bathroom remodels in 1 metro

Choose based on:

Data availability (cost distributions).

Ease of scoping from images.

Repeatability and average ticket size.

8.2 Homeowner Experience (MVP)
Onboarding

Simple web/mobile flow.

Choose job type (lawn clean-up / mowing / bathroom remodel).

Media Upload

Capture/upload:

30–60s video walkthrough.

3–10 photos.

Prompted capture instructions (“stand back 10 feet,” “show full area,” etc.).

Quick Questionnaire

Location, rough dimensions, urgency.

Quality level (budget / standard / premium).

AI Output (Homeowner View)

Display:

“We think this is a: [Job type]”

Estimated price range.

Estimated duration ("1 day", "3–5 days").

Ask for confirmation:

Homeowner can correct obvious misclassifications.

Booking Intent

Let user:

Request bids from recommended pros.

Or accept a “recommended package” at midpoint of estimate.

8.3 Pro Experience (MVP)
Onboarding and Vetting

KYC, insurance info, license (where applicable).

Category/skills selection.

Service areas and travel radius.

Pricing preferences (e.g., $/sq ft bands, min job value).

Job Feed

See only pre-scoped jobs matching skills and geography.

AI-Generated Quote

System proposes quote based on:

Estimated labor hours.

Material cost for selected tier.

Pro’s pricing profile.

Pro can:

Accept.

Adjust line items / markup.

Activation Metrics

Track:

Time from signup → first completed job.

Acceptance rate of AI quotes vs manual overrides.

Job completion and rating.

8.4 Matching & Routing Engine (MVP)
Input:

Job type, scope complexity, location, budget tier.

Constraints:

Pro availability, distance, rating threshold.

Output:

3–5 qualified pros notified.

First to accept (or best scoring after brief bid window) wins the job.

9. AI & Data Requirements
   9.1 Inputs
   Media:

Photos & videos of lawn, rooms, exterior, etc.

Metadata:

Location, property type, job type, rough dimensions.

Historical data (gradually):

Actual job cost, duration, rating.

9.2 Models
Computer Vision

Detect:

Lawn area size & condition, obstacles, overgrowth (for lawn).

Fixtures, finishes, and room dimensions (for remodel).

Classify job into standardized SKUs or templates.

Cost Estimation Model

Combine:

Detected quantities.

Localized cost curves (materials, labor) via 3rd-party data + platform history.

Output:

Low–high price band and confidence score.

Matching & Scoring

Predict likelihood of:

Pro accepting job.

On-time completion.

High rating.

10. Success Metrics
    10.1 Marketplace-Level
    North Star: Jobs completed with 4.5+ rating per active market/month.

Liquidity:

% of homeowner requests that receive at least one accepted bid.

Median time to first accepted bid.

Supply coverage (active pros per zip code/category).

10.2 Homeowner
Time from request → first AI estimate.

Time from request → booked job.

NPS / CSAT.

10.3 Contractor
Time from signup → first completed job.

Close rate per job offered.

Net earnings per active pro.

Reduction in time spent on estimating vs their baseline.

10.4 AI Performance
Delta between AI estimate and actual job cost.

% of jobs requiring major scope revisions.

Pro override rate of AI-generated quotes.

11. Rollout & Phasing
    Phase 0 — Prototype (4–8 weeks)
    Single vertical, single city.

Manual curation + semi-automated AI (human-in-the-loop cost checking).

Directly recruit first 10–20 contractors.

Phase 1 — MVP (3–6 months)
Full homeowner and pro flows.

Automated AI scoping for defined templates.

Payments + simple dispute resolution.

Phase 2 — Scale (6–12 months)
Additional categories/geos.

Improved AI models with feedback loops.

SaaS-like features for high-volume pros.

12. Why You Can Win
    You combine:

Marketplace & demand (Angi/Thumbtack/LawnStarter/GreenPal growth playbooks).

AI scoping & estimating proven valuable in construction and remodeling contexts.

Closed-loop control over job creation, pricing, and feedback (Uber-style).

No current U.S. player tightly integrates video/image-based scoping + AI quotes + contractor marketplace into a single, outcome-accountable system. That’s your category-creation opportunity.
