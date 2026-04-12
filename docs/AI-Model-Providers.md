# BidWork — AI Model Providers, Pricing & Configuration Guide

**Version:** 1.0
**Date:** April 9, 2026
**Purpose:** Reference for selecting and configuring AI models per provider, per task, per job category to optimize cost and quality.

---

## Table of Contents

1. [Provider & Model Directory](#1-provider--model-directory)
2. [Head-to-Head Pricing Comparison](#2-head-to-head-pricing-comparison)
3. [BidWork AI Pipeline — Task Breakdown](#3-bidwork-ai-pipeline--task-breakdown)
4. [Model Configuration Matrix — By Task](#4-model-configuration-matrix--by-task)
5. [Model Configuration Matrix — By Job Category](#5-model-configuration-matrix--by-job-category)
6. [Cost Per Job — All Providers Compared](#6-cost-per-job--all-providers-compared)
7. [Monthly Cost Projections — By Provider Strategy](#7-monthly-cost-projections--by-provider-strategy)
8. [Multi-Provider Optimization Strategy](#8-multi-provider-optimization-strategy)
9. [Provider Reliability & Risk Assessment](#9-provider-reliability--risk-assessment)
10. [Configuration Recommendations](#10-configuration-recommendations)

---

## 1. Provider & Model Directory

### 1.1 Anthropic (Claude)

| Model | Input $/MTok | Output $/MTok | Vision | Video | Context Window | Batch Discount | Best For |
|---|---|---|---|---|---|---|---|
| **Claude Opus 4.6** | $5.00 | $25.00 | Yes | Via frames | 1M tokens | 50% | Complex remodel scoping, highest accuracy |
| **Claude Sonnet 4.6** | $3.00 | $15.00 | Yes | Via frames | 1M tokens | 50% | Primary scope generation, best price/quality |
| **Claude Haiku 4.5** | $1.00 | $5.00 | Yes | Via frames | 200K tokens | 50% | Classification, bid calculation, simple tasks |

**Cost optimizations available:**
- Prompt caching: Cache hits cost 0.1x input price (90% savings on cached portions)
- Batch API: 50% flat discount on both input and output tokens
- Extended thinking: Separate token pricing for reasoning tokens

**Vision notes:** Images are tokenized based on resolution. ~1,600 tokens for small images, ~6,400 tokens for large (1024px+). No native video — requires frame extraction.

---

### 1.2 OpenAI (GPT)

| Model | Input $/MTok | Output $/MTok | Vision | Video | Context Window | Batch Discount | Best For |
|---|---|---|---|---|---|---|---|
| **GPT-4.1** | $2.00 | $8.00 | Yes | Via frames | 1M tokens | 50% | Scope generation alternative to Sonnet |
| **GPT-4.1 mini** | $0.40 | $1.60 | Yes | Via frames | 1M tokens | 50% | Mid-tier scoping, cost-effective vision |
| **GPT-4.1 nano** | $0.10 | $0.40 | Yes | Via frames | 1M tokens | 50% | Classification, simple extraction, bid calc |
| **GPT-4o** | $2.50 | $10.00 | Yes | Via frames | 128K tokens | 50% | Legacy, still strong vision capabilities |
| **GPT-4o mini** | $0.15 | $0.60 | Yes | Via frames | 128K tokens | 50% | Budget vision tasks, classification |
| **o4-mini** | $0.55 | $2.20 | Yes | Via frames | 200K tokens | — | Reasoning-heavy tasks (complex estimates) |

**Cost optimizations available:**
- Batch API: 50% discount on all models
- Cached input tokens: Reduced pricing on repeated prefixes
- Predicted outputs: Reduced output token costs for structured output

**Vision notes:** Images tokenized similarly to Claude. Supports base64 and URL input. No native video.

---

### 1.3 Google (Gemini)

| Model | Input $/MTok | Output $/MTok | Vision | Video | Context Window | Batch Discount | Best For |
|---|---|---|---|---|---|---|---|
| **Gemini 2.5 Pro** | $1.25 | $10.00 | Yes | Yes (native) | 1M tokens | 50% | Complex scoping with native video support |
| **Gemini 2.5 Flash** | $0.30 | $2.50 | Yes | Yes (native) | 1M tokens | 50% | Primary scope generation (cheapest quality option) |
| **Gemini 2.0 Flash** | $0.10 | $0.40 | Yes | Yes (native) | 1M tokens | 50% | Budget tasks, classification |
| **Gemini 2.0 Flash Lite** | $0.075 | $0.30 | Yes | Limited | 1M tokens | 50% | Ultra-budget classification and routing |

**Cost optimizations available:**
- Context caching: Up to 90% savings on cached content
- Batch API: 50% discount
- Free tier: 15 RPM / 1M TPM on most models (development/testing)
- Grounding with Google Search: Additional capability

**Vision notes:** Gemini 2.5 Pro and Flash support **native video input** — can process video directly without frame extraction. This is a unique advantage for BidWork's video analysis pipeline. Video tokens are priced at image rates.

**Critical advantage:** Native video support means potentially skipping the entire FFmpeg frame extraction pipeline for Gemini, sending raw video clips directly. This saves compute costs and may improve analysis quality since the model sees motion/context.

---

### 1.4 DeepSeek

| Model | Input $/MTok | Output $/MTok | Vision | Video | Context Window | Batch Discount | Best For |
|---|---|---|---|---|---|---|---|
| **DeepSeek V4** | $0.30 | $0.50 | Yes (native) | Yes (native) | 1M tokens | — | Budget scope generation with multimodal |
| **DeepSeek V3.2 (Chat)** | $0.28 | $0.42 | No | No | 128K tokens | — | Text-only tasks (bid calc, matching) |
| **DeepSeek R1** | $0.55 | $2.19 | No | No | 128K tokens | — | Complex reasoning (cost estimation logic) |

**Cost optimizations available:**
- Cache hits: $0.028/MTok input (90% savings) on DeepSeek V3.2
- Off-peak pricing: Potential discounts during low-traffic hours (UTC-based)
- OpenAI-compatible API: Easy integration, same SDK

**Vision notes:** DeepSeek V4 supports native multimodal (image + video) input, integrated during pre-training. Supports JPEG, PNG, WEBP. Quality benchmarks for vision tasks are limited compared to Claude/GPT/Gemini.

**Caveats:**
- Based in China — data privacy and regulatory considerations for U.S. home services data
- U.S. export controls may limit access in some jurisdictions
- Less proven for production vision tasks compared to Claude/GPT/Gemini
- API reliability and uptime less established than major providers

---

### 1.5 Together AI (Open-Source Model Hosting)

Together AI hosts open-source models (Llama, Qwen, DeepSeek, etc.) via serverless inference, offering near-frontier quality at significantly lower prices than closed-source providers. $100 free credits at signup.

| Model | Input $/MTok | Output $/MTok | Vision | Video | Context Window | Batch Discount | Best For |
|---|---|---|---|---|---|---|---|
| **Llama 4 Maverick** | $0.27 | $0.85 | Yes (native) | Yes (native) | 1M tokens | Up to 50% | Best value vision model, GPT-4o-class quality |
| **Llama 4 Scout** | $0.15 | $0.60 | Yes (native) | Yes (native) | 10M tokens | Up to 50% | Ultra-cheap vision, massive context window |
| **Qwen 2.5 VL 72B** | $0.90 | $0.90 | Yes (native) | Yes | 128K tokens | Up to 50% | Strong vision understanding, competitive quality |
| **Qwen 2.5 72B** | $1.20 | $1.20 | No | No | 128K tokens | Up to 50% | Text-only tasks, strong reasoning |
| **DeepSeek R1 (via Together)** | $3.00 | $7.00 | No | No | 128K tokens | Up to 50% | Complex reasoning (hosted alternative) |
| **Llama 3.3 70B Turbo** | $0.88 | $0.88 | No | No | 128K tokens | Up to 50% | Fast text-only, bid calculations |
| **Llama 3.1 8B Turbo** | $0.05 | $0.18 | No | No | 128K tokens | Up to 50% | Ultra-cheap text classification |

**Cost optimizations available:**
- Batch processing: Up to 50% discount for async workloads (up to 30B tokens)
- $100 free signup credits for development and testing
- Volume discounts on enterprise plans
- Dedicated endpoints available for high-throughput (custom pricing)

**Vision notes:** Llama 4 Maverick and Scout are natively multimodal — trained on text, image, and video from pre-training. Supports standard image formats. Vision quality benchmarks show GPT-4o-class performance at ~10x lower cost.

**Key advantages:**
- Open-source models — no vendor lock-in, can self-host later if scale justifies it
- OpenAI-compatible API — drop-in replacement, same SDK works
- Llama 4 Scout's 10M token context window is the largest available — could process entire video transcripts + massive image sets in a single call
- U.S.-based company — no data sovereignty concerns (unlike direct DeepSeek API)
- Runs DeepSeek models on U.S. infrastructure — get DeepSeek quality without China data concerns

**Caveats:**
- Open-source models may have slightly lower accuracy than frontier closed-source models on complex tasks
- Model availability can change (open-source models rotate)
- Less polished structured output compared to Claude/GPT (may need more prompt engineering)

---

## 2. Head-to-Head Pricing Comparison

### 2.1 All Models Ranked By Input Price (Cheapest First)

| Rank | Provider | Model | Input $/MTok | Output $/MTok | Vision | Quality Tier |
|---|---|---|---|---|---|---|
| 1 | Together AI | Llama 3.1 8B Turbo | $0.05 | $0.18 | No | Ultra-Budget |
| 2 | Google | Gemini 2.0 Flash Lite | $0.075 | $0.30 | Yes | Ultra-Budget |
| 3 | OpenAI | GPT-4.1 nano | $0.10 | $0.40 | Yes | Budget |
| 4 | Google | Gemini 2.0 Flash | $0.10 | $0.40 | Yes | Budget |
| 5 | Together AI | Llama 4 Scout | $0.15 | $0.60 | Yes + Video | Budget |
| 6 | OpenAI | GPT-4o mini | $0.15 | $0.60 | Yes | Budget |
| 7 | Together AI | Llama 4 Maverick | $0.27 | $0.85 | Yes + Video | Budget-Mid |
| 8 | DeepSeek | V3.2 (Chat) | $0.28 | $0.42 | No | Budget |
| 9 | DeepSeek | V4 | $0.30 | $0.50 | Yes + Video | Mid |
| 10 | Google | Gemini 2.5 Flash | $0.30 | $2.50 | Yes + Video | Mid |
| 11 | OpenAI | GPT-4.1 mini | $0.40 | $1.60 | Yes | Mid |
| 12 | OpenAI | o4-mini | $0.55 | $2.20 | Yes | Mid (reasoning) |
| 13 | DeepSeek | R1 | $0.55 | $2.19 | No | Mid (reasoning) |
| 14 | Together AI | Llama 3.3 70B Turbo | $0.88 | $0.88 | No | Mid |
| 15 | Together AI | Qwen 2.5 VL 72B | $0.90 | $0.90 | Yes | Mid |
| 16 | Anthropic | Haiku 4.5 | $1.00 | $5.00 | Yes | Mid |
| 17 | Google | Gemini 2.5 Pro | $1.25 | $10.00 | Yes + Video | Premium |
| 18 | OpenAI | GPT-4.1 | $2.00 | $8.00 | Yes | Premium |
| 19 | OpenAI | GPT-4o | $2.50 | $10.00 | Yes | Premium |
| 20 | Anthropic | Sonnet 4.6 | $3.00 | $15.00 | Yes | Premium |
| 21 | Together AI | DeepSeek R1 (hosted) | $3.00 | $7.00 | No | Premium (reasoning) |
| 22 | Anthropic | Opus 4.6 | $5.00 | $25.00 | Yes | Top |

### 2.2 Price Tiers Summary

| Tier | Input Range | Output Range | Models | Use In BidWork |
|---|---|---|---|---|
| **Ultra-Budget** | $0.05-0.15 | $0.18-0.60 | Llama 3.1 8B, Gemini 2.0 Flash Lite, GPT-4.1 nano, GPT-4o mini, Gemini 2.0 Flash, Llama 4 Scout | Classification, routing, simple extraction |
| **Budget** | $0.15-0.55 | $0.42-2.50 | Llama 4 Scout/Maverick, DeepSeek V4/V3.2, Gemini 2.5 Flash, GPT-4.1 mini, o4-mini | Scope generation (simple jobs), bid calculation |
| **Mid** | $1.00-2.00 | $5.00-8.00 | Haiku 4.5, GPT-4.1 | Scope generation (standard jobs) |
| **Premium** | $2.50-5.00 | $10.00-25.00 | Gemini 2.5 Pro, GPT-4o, Sonnet 4.6, Opus 4.6 | Complex remodel scoping, high-accuracy needs |

---

## 3. BidWork AI Pipeline — Task Breakdown

Every job runs through these AI tasks. Each task can use a different model/provider:

```
┌─────────────────────────────────────────────────────────────────┐
│  TASK 1: CATEGORY CLASSIFICATION                                │
│  Input: 1 photo + description text                              │
│  Output: category label + confidence                            │
│  Token load: ~7K input, ~100 output                             │
│  Quality needed: LOW (simple classification)                    │
│  Vision needed: YES (1 image)                                   │
├─────────────────────────────────────────────────────────────────┤
│  TASK 2: SCOPE GENERATION (primary vision task)                 │
│  Input: 10-20 images + system prompt + category rules           │
│  Output: structured task list with materials                    │
│  Token load: ~80K-160K input, ~4K-7K output                    │
│  Quality needed: HIGH (core product value)                      │
│  Vision needed: YES (multiple images)                           │
├─────────────────────────────────────────────────────────────────┤
│  TASK 3: BID RANGE CALCULATION                                  │
│  Input: task list + local pricing data                          │
│  Output: floor/ceiling per task + total                         │
│  Token load: ~4K-5K input, ~2K-3K output                       │
│  Quality needed: MEDIUM (math + data lookup)                    │
│  Vision needed: NO (text only)                                  │
├─────────────────────────────────────────────────────────────────┤
│  TASK 4: CONTRACTOR BID SUGGESTION (per contractor)             │
│  Input: task list + contractor pricing profile                  │
│  Output: suggested bid amount + reasoning                       │
│  Token load: ~3K input, ~500 output                             │
│  Quality needed: LOW-MEDIUM                                     │
│  Vision needed: NO (text only)                                  │
│  Note: Can be algorithmic (no AI), or light AI                  │
├─────────────────────────────────────────────────────────────────┤
│  TASK 5: SCOPE REFINEMENT (when homeowner edits)                │
│  Input: original scope + homeowner changes + notes              │
│  Output: updated task list + recalculated estimates             │
│  Token load: ~5K-8K input, ~3K-5K output                       │
│  Quality needed: MEDIUM                                         │
│  Vision needed: MAYBE (if new photos added)                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Model Configuration Matrix — By Task

### Recommended model per task, with cost per call:

| Task | Best Value | Cost/Call | Budget Pick | Cost/Call | Premium Pick | Cost/Call |
|---|---|---|---|---|---|---|
| **Classification** | GPT-4.1 nano | $0.001 | Llama 3.1 8B (Together) | $0.0004 | Haiku 4.5 | $0.008 |
| **Scope (simple: lawn, repair)** | Llama 4 Scout (Together) | $0.02-0.04 | Gemini 2.5 Flash | $0.04-0.07 | Sonnet 4.6 | $0.30-0.55 |
| **Scope (medium: patio, repair)** | Llama 4 Maverick (Together) | $0.04-0.08 | GPT-4.1 mini | $0.04-0.06 | GPT-4.1 | $0.20-0.38 |
| **Scope (complex: remodel)** | Sonnet 4.6 | $0.30-0.55 | Llama 4 Maverick (Together) | $0.04-0.08 | Opus 4.6 | $1.50-2.75 |
| **Scope (video — native)** | Llama 4 Scout (Together) | $0.02-0.04 | Gemini 2.5 Flash | $0.04-0.07 | Gemini 2.5 Pro | $0.15-0.30 |
| **Bid range calc** | GPT-4.1 nano | $0.002 | Llama 3.1 8B (Together) | $0.0004 | Haiku 4.5 | $0.015 |
| **Contractor bid suggestion** | Algorithm (no AI) | $0.00 | GPT-4.1 nano | $0.001 | Haiku 4.5 | $0.005 |
| **Scope refinement** | Llama 4 Maverick (Together) | $0.005-0.01 | GPT-4.1 mini | $0.01-0.02 | Sonnet 4.6 | $0.05-0.10 |

---

## 5. Model Configuration Matrix — By Job Category

### 5.1 Lawn Care (Simple, Low Ticket: $75-300)

Priority: **Minimize cost** — margins are thin on low-ticket recurring jobs.

| Task | Recommended Model | Cost | Budget Model | Cost | Fallback |
|---|---|---|---|---|---|
| Classification | Llama 3.1 8B (Together) | $0.0004 | GPT-4.1 nano | $0.001 | Gemini 2.0 Flash Lite |
| Scope generation | Llama 4 Scout (Together) | $0.02-0.03 | Gemini 2.5 Flash | $0.04-0.05 | GPT-4.1 mini |
| Bid range calc | Llama 3.1 8B (Together) | $0.0004 | GPT-4.1 nano | $0.002 | Gemini 2.0 Flash Lite |
| **Total AI cost** | | **$0.02-0.03** | | **$0.04-0.05** | |

### 5.2 General Repairs / Handyman (Variable, $100-500)

Priority: **Balance cost and accuracy** — diverse tasks need decent understanding.

| Task | Recommended Model | Cost | Budget Model | Cost | Fallback |
|---|---|---|---|---|---|
| Classification | GPT-4.1 nano | $0.001 | Llama 3.1 8B (Together) | $0.0004 | Gemini 2.0 Flash Lite |
| Scope generation | Llama 4 Maverick (Together) | $0.04-0.06 | Llama 4 Scout (Together) | $0.02-0.04 | Gemini 2.5 Flash |
| Bid range calc | GPT-4.1 nano | $0.002 | Llama 3.1 8B (Together) | $0.0004 | Gemini 2.0 Flash |
| **Total AI cost** | | **$0.04-0.06** | | **$0.02-0.04** | |

### 5.3 Patio & Outdoor Living (Medium Complexity, $2,000-10,000)

Priority: **Good accuracy** — higher ticket justifies better models.

| Task | Recommended Model | Cost | Budget Model | Cost | Fallback |
|---|---|---|---|---|---|
| Classification | GPT-4.1 nano | $0.001 | Llama 3.1 8B (Together) | $0.0004 | Gemini 2.0 Flash |
| Scope generation | GPT-4.1 | $0.20-0.35 | Llama 4 Maverick (Together) | $0.04-0.08 | Sonnet 4.6 |
| Bid range calc | GPT-4.1 nano | $0.002 | Llama 3.1 8B (Together) | $0.0004 | Haiku 4.5 |
| **Total AI cost** | | **$0.20-0.35** | | **$0.04-0.08** | |

### 5.4 Bathroom Remodel (High Complexity, $5,000-20,000)

Priority: **High accuracy** — but Maverick benchmarks at GPT-4o-class on vision, sufficient for most remodels.

| Task | Recommended Model | Cost | Upgrade Model | Cost | Fallback |
|---|---|---|---|---|---|
| Classification | Llama 3.1 8B (Together) | $0.0004 | GPT-4.1 nano | $0.001 | Haiku 4.5 |
| Scope generation | Llama 4 Maverick (Together) | $0.04-0.08 | Qwen 2.5 VL 72B (Together) | $0.08-0.14 | Sonnet 4.6 |
| Bid range calc | Llama 3.1 8B (Together) | $0.0004 | GPT-4.1 nano | $0.002 | Haiku 4.5 |
| **Total AI cost** | | **$0.04-0.08** | | **$0.08-0.14** | |

When to escalate to Claude Sonnet: Only if internal review finds Maverick's scope accuracy drops below 80% for bathroom remodels during A/B testing. Until then, Maverick is the default.

### 5.5 Kitchen Remodel (Highest Complexity, $10,000-30,000)

Priority: **Maximum accuracy** — use Maverick as default, dual-model verification for jobs over $15K.

| Task | Recommended Model | Cost | Upgrade Model | Cost | Fallback |
|---|---|---|---|---|---|
| Classification | Llama 3.1 8B (Together) | $0.0004 | GPT-4.1 nano | $0.001 | Haiku 4.5 |
| Scope generation | Llama 4 Maverick (Together) | $0.05-0.10 | Qwen 2.5 VL 72B (Together) | $0.10-0.18 | Sonnet 4.6 |
| Bid range calc | Llama 3.1 8B (Together) | $0.0004 | Llama 3.3 70B (Together) | $0.005 | GPT-4.1 nano |
| **Total AI cost** | | **$0.05-0.10** | | **$0.11-0.19** | |

**Dual-model verification for high-value jobs (>$15K):**
For kitchen remodels above $15K, run Maverick AND Qwen 2.5 VL in parallel, compare outputs, flag discrepancies for internal review. Total cost: $0.15-0.28 — still 90% cheaper than Claude.

### 5.6 Category Configuration Summary — All Together AI

| Category | Job Value | Revenue (15%) | AI Cost (Together) | AI % of Revenue | Upgrade Cost (if needed) |
|---|---|---|---|---|---|
| Lawn mowing | $100 | $15 | **$0.02** | 0.13% | $0.04 (Gemini Flash) |
| Lawn cleanup | $300 | $45 | **$0.03** | 0.07% | $0.05 (Maverick) |
| Handyman repair | $250 | $37 | **$0.04** | 0.11% | $0.06 (Maverick) |
| Patio install | $5,000 | $600 | **$0.06** | 0.01% | $0.12 (Qwen VL) |
| Bathroom remodel | $10,000 | $1,000 | **$0.06** | 0.006% | $0.14 (Qwen VL) |
| Kitchen remodel | $20,000 | $2,000 | **$0.08** | 0.004% | $0.28 (dual-model) |
| **Blended average** | | | **$0.04** | **<0.1%** | |

---

## 6. Cost Per Job — All Providers Compared

### 6.1 Single-Provider Strategies

What if you used ONLY one provider for everything?

**Scenario: Standard lawn care job (8 images, simple scope)**

| Provider | Classification | Scope Gen | Bid Calc | Total | vs Cheapest |
|---|---|---|---|---|---|
| Together AI (Llama 8B→Scout→8B) | $0.0004 | $0.02 | $0.0004 | **$0.02** | 1x (cheapest) |
| DeepSeek (V4→V4→V3.2) | $0.002 | $0.03 | $0.002 | **$0.03** | 1.5x |
| Google (Flash Lite→2.5 Flash→Flash Lite) | $0.0006 | $0.04 | $0.001 | **$0.04** | 2x |
| OpenAI (nano→4.1 mini→nano) | $0.001 | $0.05 | $0.002 | **$0.05** | 2.5x |
| Anthropic (Haiku→Sonnet→Haiku) | $0.008 | $0.30 | $0.015 | **$0.32** | 16x |

**Scenario: Bathroom remodel job (18 images, complex scope)**

| Provider | Classification | Scope Gen | Bid Calc | Total | vs Cheapest |
|---|---|---|---|---|---|
| Together AI (Llama 8B→Maverick→8B) | $0.0004 | $0.06 | $0.0004 | **$0.06** | 1x (cheapest) |
| DeepSeek (V4→V4→V3.2) | $0.003 | $0.06 | $0.002 | **$0.07** | 1.2x |
| Google (Flash Lite→2.5 Pro→Flash Lite) | $0.0006 | $0.25 | $0.001 | **$0.25** | 4.2x |
| OpenAI (nano→4.1→nano) | $0.001 | $0.35 | $0.002 | **$0.35** | 5.8x |
| Anthropic (Haiku→Sonnet→Haiku) | $0.008 | $0.55 | $0.015 | **$0.57** | 9.5x |
| Anthropic (Haiku→Opus→Haiku) | $0.008 | $2.50 | $0.015 | **$2.52** | 42x |

### 6.2 Multi-Provider Strategy (Recommended)

Cherry-pick the best model per task:

**Lawn care job — Ultra-optimized (Together AI):**
```
Classification:  Llama 3.1 8B (Together)  $0.0004
Scope gen:       Llama 4 Scout (Together) $0.02
Bid calc:        Llama 3.1 8B (Together)  $0.0004
─────────────────────────────────────────────
Total:                                    $0.021
```

**Lawn care job — Balanced (multi-provider):**
```
Classification:  GPT-4.1 nano             $0.001
Scope gen:       Gemini 2.5 Flash          $0.04
Bid calc:        GPT-4.1 nano             $0.001
─────────────────────────────────────────────
Total:                                    $0.042
```

**Bathroom remodel — Budget (Together AI):**
```
Classification:  Llama 3.1 8B (Together)  $0.0004
Scope gen:       Llama 4 Maverick (Together) $0.06
Bid calc:        Llama 3.1 8B (Together)  $0.0004
─────────────────────────────────────────────
Total:                                    $0.061
```

**Bathroom remodel — Accuracy-optimized:**
```
Classification:  GPT-4.1 nano             $0.001
Scope gen:       Claude Sonnet 4.6         $0.55
Bid calc:        GPT-4.1 nano             $0.002
─────────────────────────────────────────────
Total:                                    $0.553
```

**Kitchen remodel — Maximum accuracy:**
```
Classification:  GPT-4.1 nano             $0.001
Scope gen:       Claude Opus 4.6           $2.50
Bid calc:        Claude Haiku 4.5          $0.015
─────────────────────────────────────────────
Total:                                    $2.516
```

---

## 7. Monthly Cost Projections — By Provider Strategy

### At 1,000 jobs/month (blended mix: 50% lawn, 20% repair, 15% patio, 10% bathroom, 5% kitchen)

| Strategy | Monthly AI Cost | Annual AI Cost | Notes |
|---|---|---|---|
| **All Anthropic** (Haiku + Sonnet) | $380 | $4,560 | Highest quality, most expensive |
| **All OpenAI** (nano + 4.1) | $230 | $2,760 | Good quality, reliable |
| **All Google** (Flash Lite + 2.5 Flash) | $65 | $780 | Native video support |
| **All Together AI** (Scout + Maverick) | **$40** | **$480** | **Recommended: cheapest with vision, U.S.-based** |
| Together + dual-model on high-value | **$45** | **$540** | **Best value: adds Qwen VL verification on >$15K jobs** |
| All DeepSeek direct | $45 | $540 | Privacy concerns — use Together-hosted instead |

**Together AI is 9.5x cheaper than Anthropic and 5.7x cheaper than OpenAI** at the same scale.

### At 10,000 jobs/month

| Strategy | Monthly AI Cost | Annual AI Cost | vs Together |
|---|---|---|---|
| All Anthropic | $3,800 | $45,600 | 9.5x more |
| All OpenAI | $2,300 | $27,600 | 5.8x more |
| All Google | $650 | $7,800 | 1.6x more |
| **All Together AI** | **$400** | **$4,800** | **baseline** |
| Together + dual-model verification | **$450** | **$5,400** | 1.1x |
| Together + batch discounts | **$240** | **$2,880** | 0.6x (40% savings) |

### At 50,000 jobs/month

| Strategy | Monthly AI Cost | Annual AI Cost | vs Together |
|---|---|---|---|
| All Anthropic | $19,000 | $228,000 | 9.5x more |
| All OpenAI | $11,500 | $138,000 | 5.8x more |
| All Google | $3,250 | $39,000 | 1.6x more |
| **All Together AI** | **$2,000** | **$24,000** | **baseline** |
| Together + batch | **$1,200** | **$14,400** | 0.6x |
| Together + volume negotiation | **$1,000** | **$12,000** | 0.5x |
| Self-hosted Llama 4 (GPU cluster) | **$3,500-5,000** | **$42,000-60,000** | 1.75-2.5x (only worth it at 100K+) |

---

## 8. Multi-Provider Optimization Strategy

### 8.1 Provider Selection Logic (Runtime Configuration)

The platform should dynamically select models based on job attributes:

```
function selectModel(task, jobCategory, jobValue, urgency) {

  // TASK 1: Classification — always use cheapest
  if (task === "classification") {
    return { provider: "together", model: "llama-3.1-8b-turbo" }  // $0.0004
  }

  // TASK 3: Bid calculation — always use cheapest text model
  if (task === "bid_calculation") {
    return { provider: "together", model: "llama-3.1-8b-turbo" }  // $0.0004
  }

  // TASK 2: Scope generation — varies by category and job value
  if (task === "scope_generation") {

    // Simple jobs: use Together AI for maximum cost savings
    if (["lawn", "repair"].includes(jobCategory)) {
      return { provider: "together", model: "llama-4-scout" }     // $0.02
    }

    // Medium jobs: use Maverick for good quality at low cost
    if (["patio", "fence", "painting"].includes(jobCategory)) {
      return { provider: "together", model: "llama-4-maverick" }  // $0.06
    }

    // Complex jobs under $15K: Maverick handles well at GPT-4o-class quality
    if (jobValue < 15000) {
      return { provider: "together", model: "llama-4-maverick" }   // $0.06
    }

    // Complex jobs over $15K: dual-model verification (Maverick + Qwen VL)
    return dualModelVerify(
      { provider: "together", model: "llama-4-maverick" },         // $0.06
      { provider: "together", model: "qwen-2.5-vl-72b" }          // $0.12
    )  // Total: $0.18 — still 93% cheaper than Claude Sonnet
  }

  // TASK 2 ALT: If homeowner uploaded VIDEO (not just photos)
  if (task === "scope_generation" && hasVideo) {
    // Together AI Llama 4 and Gemini handle native video
    if (["lawn", "repair", "patio"].includes(jobCategory)) {
      return { provider: "together", model: "llama-4-scout" }     // native video
    }
    // Alternative: Gemini for native video on medium jobs
    if (["patio", "fence"].includes(jobCategory)) {
      return { provider: "google", model: "gemini-2.5-flash" }    // native video
    }
    // For complex remodels, extract frames and use Claude
    return extractFramesAndUse("anthropic", "claude-sonnet-4.6")
  }
}
```

### 8.2 Fallback Chain

If primary provider is down or rate-limited:

```
Classification fallback chain:
  Llama 3.1 8B (Together) → GPT-4.1 nano → Gemini 2.0 Flash Lite → Haiku 4.5

Scope generation fallback chain (simple jobs):
  Llama 4 Scout (Together) → Gemini 2.5 Flash → GPT-4.1 mini → Haiku 4.5

Scope generation fallback chain (medium jobs):
  Llama 4 Maverick (Together) → GPT-4.1 → Gemini 2.5 Pro → Sonnet 4.6

Scope generation fallback chain (complex jobs):
  Llama 4 Maverick (Together) → Qwen 2.5 VL 72B (Together) → GPT-4.1 → Sonnet 4.6

Bid calculation fallback chain:
  Llama 3.1 8B (Together) → GPT-4.1 nano → Gemini 2.0 Flash Lite
```

### 8.3 A/B Testing Framework

Run models head-to-head to find the best quality/cost ratio per category:

```
For each new job category launch:
  1. Send same job to 2-3 models simultaneously
  2. Internal reviewer scores each output (accuracy 1-5)
  3. Track: accuracy score, latency, cost
  4. After 100 jobs: pick winner for that category
  5. Re-evaluate quarterly with new model releases
```

| Metric | How to Measure | Threshold to Switch Models |
|---|---|---|
| Scope accuracy | Internal reviewer score (1-5) | Drop below 3.5 avg |
| Task completeness | % of tasks that don't need human additions | Drop below 80% |
| Cost estimate accuracy | AI estimate vs actual job cost | Delta > ±20% |
| Latency | Time from API call to response | > 30 seconds |
| Uptime | Provider availability | < 99.5% monthly |

### 8.4 Video Strategy: Gemini Native vs Frame Extraction

| Approach | Provider | Process | Cost | Quality |
|---|---|---|---|---|
| **Native video** | Google Gemini | Upload raw video clip → model processes directly | Lower (no compute for extraction) | Good (model sees motion, transitions) |
| **Frame extraction** | Any provider | FFmpeg → deduplicate → send key frames as images | Higher (compute + more tokens) | Good (curated frames, less noise) |

**Recommendation:**
- For **lawn/repair/patio** (simple): Use Gemini native video — cheaper, fast, good enough
- For **remodels** (complex): Use frame extraction + Claude/GPT — better accuracy on details like fixtures, materials, damage

---

## 9. Provider Reliability & Risk Assessment

### 9.1 Provider Comparison

| Factor | Anthropic | OpenAI | Google | Together AI | DeepSeek |
|---|---|---|---|---|---|
| **API uptime (est.)** | 99.8%+ | 99.9%+ | 99.9%+ | 99.5%+ | 99.0-99.5% |
| **Rate limits** | Generous with tier scaling | Generous | Very generous + free tier | Good, scales with plan | Limited info |
| **Vision quality** | Excellent | Excellent | Very good | Good (Llama 4 ≈ GPT-4o) | Good (limited benchmarks) |
| **Structured output** | Strong (tool use, JSON mode) | Strong (function calling) | Good | Good (OpenAI-compatible) | Good (OpenAI-compatible) |
| **Data privacy** | U.S. company, SOC 2 | U.S. company, SOC 2 | U.S. company, SOC 2 | U.S. company | China-based, data concerns |
| **Enterprise support** | Available | Available | Available | Available | Limited |
| **Pricing stability** | Trending down | Trending down | Trending down + free tier | Competitive, stable | Very cheap but unstable |
| **Long-term viability** | High | High | High | Medium-High | Uncertain (regulatory risk) |
| **Vendor lock-in risk** | Medium (proprietary) | Medium (proprietary) | Medium (proprietary) | Low (open-source models) | Low (open-source) |

### 9.2 Risk Assessment

| Provider | Risk Level | Key Risk | Mitigation |
|---|---|---|---|
| **Anthropic** | Low | Pricing higher than alternatives | Use only for complex tasks where quality matters |
| **OpenAI** | Low | Model deprecation (GPT-4o → legacy) | Pin model versions, plan migrations |
| **Google** | Low | Free tier may be reduced/removed | Budget for paid tier from the start |
| **Together AI** | Low-Medium | Open-source model quality may lag frontier on edge cases | A/B test against closed-source; use Together for simple/medium, Claude for complex |
| **DeepSeek** | Medium-High | Data sovereignty, regulatory, reliability | Use only for non-sensitive text tasks, never for primary scope gen with customer photos |

### 9.3 Data Privacy Considerations

For BidWork, AI models process **homeowner photos and videos of their properties**. This is sensitive data.

| Provider | Data Processing Location | Data Retention | Acceptable Use |
|---|---|---|---|
| Anthropic | U.S. | No training on API data | All tasks including vision |
| OpenAI | U.S. | No training on API data (business) | All tasks including vision |
| Google | U.S./Global (configurable) | Configurable retention | All tasks including vision |
| Together AI | U.S. | No training on API data | All tasks including vision — **U.S.-hosted open-source models solve DeepSeek's privacy concern** |
| DeepSeek (direct) | China | Unclear | Text-only tasks (bid calc, classification) — **avoid sending customer media** |

**Important:** Together AI runs DeepSeek and other Chinese-origin models on **U.S. infrastructure** under U.S. data protection laws. This means you can use DeepSeek-quality models through Together AI without the data sovereignty risk of calling DeepSeek's API directly.

---

## 10. Configuration Recommendations

### 10.1 Phase 0 — Prototype (Start Here)

**Strategy: Together AI for everything. One provider, one SDK, near-zero cost.**

```
Provider: Together AI (ALL tasks)

  Classification:      Llama 3.1 8B Turbo        $0.0004/call
  Scope gen (all):     Llama 4 Maverick           $0.04-0.08/call
  Bid calculation:     Llama 3.1 8B Turbo         $0.0004/call

Monthly cost (100 jobs): $5-10
Why: One provider, one SDK (OpenAI-compatible), ultra-cheap.
     $100 free signup credits covers 2-3 months of prototype.
     Maverick is GPT-4o-class — good enough for ALL categories at this stage.
     Focus engineering time on product, not AI provider juggling.
```

### 10.2 Phase 1 — MVP (Add Tiering Within Together AI)

**Strategy: Together AI for all jobs, tiered by model within Together**

```
Provider: Together AI (95% of calls)
Backup:  OpenAI GPT-4.1 nano (fallback only)

  Classification:          Llama 3.1 8B Turbo (Together)    $0.0004
  Scope gen (lawn/repair): Llama 4 Scout (Together)          $0.02-0.03
  Scope gen (patio):       Llama 4 Maverick (Together)       $0.04-0.06
  Scope gen (bathroom):    Llama 4 Maverick (Together)       $0.04-0.08
  Scope gen (kitchen):     Llama 4 Maverick (Together)       $0.05-0.10
  Bid calculation:         Llama 3.1 8B Turbo (Together)     $0.0004
  Scope refinement:        Llama 4 Maverick (Together)       $0.005-0.01

Monthly cost (500 jobs): $15-35
Why: Scout for simple, Maverick for everything else.
     Run A/B quality checks: compare Maverick output vs internal reviewer corrections.
     If Maverick accuracy > 80% on remodels, no need for Claude at all.
```

### 10.3 Phase 2 — Scale (Dual-Model Verification for High-Value Jobs)

**Strategy: Together AI for all, dual-model verification for jobs >$15K**

```
  Classification:            Llama 3.1 8B (Together)         $0.0004
  Scope gen (lawn):          Llama 4 Scout (Together)         $0.02-0.03
  Scope gen (repair):        Llama 4 Maverick (Together)      $0.04-0.06
  Scope gen (patio):         Llama 4 Maverick (Together)      $0.04-0.06
  Scope gen (bathroom):      Llama 4 Maverick (Together)      $0.04-0.08
  Scope gen (kitchen <$15K): Llama 4 Maverick (Together)      $0.05-0.10
  Scope gen (kitchen >$15K): Maverick + Qwen 2.5 VL (dual)   $0.15-0.28
  Bid calculation:           Llama 3.1 8B (Together)          $0.0004
  Scope refinement:          Llama 4 Maverick (Together)      $0.005-0.01
  Batch jobs (non-urgent):   Together batch API                50% discount
  Video (all categories):    Llama 4 Scout (Together)         native video

Monthly cost (3,000 jobs): $80-180
Why: 100% Together AI. No Claude dependency.
     Dual-model verification on high-value jobs costs $0.28 max — vs $2.50 for Opus.
     If dual-model outputs agree, auto-approve scope. If they diverge, flag for internal review.
     This gives you Claude-level confidence at Together-level pricing.
```

### 10.4 Phase 3 — Volume + Self-Hosting Evaluation

```
At 10,000+ jobs/month:
  - Negotiate enterprise pricing with Together AI
  - Expected discount: 30-50% off published rates
  - Use batch API for all non-urgent processing (50% savings)
  - Evaluate self-hosting Llama 4 models (Together → own GPU cluster)
    - Break-even: ~$3K-5K/month on GPU vs ~$1K on Together API
    - Self-hosting makes sense at 100K+ jobs/month
  - Fine-tune Llama 4 Maverick on accumulated platform data
    - Together AI offers fine-tuning as a service
    - Fine-tuned model = higher accuracy + potentially smaller/cheaper model

Monthly cost (10,000 jobs): $150-300 (with discounts)
Monthly cost (50,000 jobs): $500-1,200 (volume + batch)
Monthly cost (50,000 jobs, self-hosted): $3K-5K fixed (GPU rental, no per-call cost)

WHEN TO ADD CLAUDE (optional):
  Only if A/B testing shows Maverick accuracy drops below 75% on a specific category
  AND Qwen 2.5 VL also fails on that category.
  Then add Claude Sonnet as a targeted fallback for THAT category only.
  Expected: this may never be needed.
```

### 10.5 Platform Configuration Schema

The model selection should be configurable in the platform settings, not hardcoded:

```json
{
  "ai_config": {
    "providers": {
      "anthropic": {
        "api_key": "sk-ant-...",
        "enabled": true,
        "base_url": "https://api.anthropic.com"
      },
      "openai": {
        "api_key": "sk-...",
        "enabled": true,
        "base_url": "https://api.openai.com"
      },
      "google": {
        "api_key": "...",
        "enabled": true,
        "base_url": "https://generativelanguage.googleapis.com"
      },
      "together": {
        "api_key": "...",
        "enabled": true,
        "base_url": "https://api.together.xyz/v1",
        "note": "OpenAI-compatible API — uses OpenAI SDK with base_url override"
      },
      "deepseek": {
        "api_key": "sk-...",
        "enabled": false,
        "base_url": "https://api.deepseek.com",
        "allowed_tasks": ["bid_calculation", "classification"],
        "note": "Disabled by default — use Together AI for DeepSeek models instead (U.S.-hosted)"
      }
    },
    "task_routing": {
      "classification": {
        "primary": { "provider": "together", "model": "meta-llama/Llama-3.1-8B-Instruct-Turbo" },
        "fallback": { "provider": "openai", "model": "gpt-4.1-nano" }
      },
      "scope_generation": {
        "lawn":     { "primary": { "provider": "together", "model": "meta-llama/Llama-4-Scout-17B-16E-Instruct" },
                      "fallback": { "provider": "together", "model": "meta-llama/Llama-4-Maverick-17B-128E-Instruct" } },
        "repair":   { "primary": { "provider": "together", "model": "meta-llama/Llama-4-Maverick-17B-128E-Instruct" },
                      "fallback": { "provider": "google", "model": "gemini-2.5-flash" } },
        "patio":    { "primary": { "provider": "together", "model": "meta-llama/Llama-4-Maverick-17B-128E-Instruct" },
                      "fallback": { "provider": "together", "model": "Qwen/Qwen2.5-VL-72B-Instruct" } },
        "bathroom": { "primary": { "provider": "together", "model": "meta-llama/Llama-4-Maverick-17B-128E-Instruct" },
                      "fallback": { "provider": "together", "model": "Qwen/Qwen2.5-VL-72B-Instruct" } },
        "kitchen":  { "primary": { "provider": "together", "model": "meta-llama/Llama-4-Maverick-17B-128E-Instruct" },
                      "fallback": { "provider": "together", "model": "Qwen/Qwen2.5-VL-72B-Instruct" } }
      },
      "dual_model_verification": {
        "enabled": true,
        "threshold_job_value": 15000,
        "models": [
          { "provider": "together", "model": "meta-llama/Llama-4-Maverick-17B-128E-Instruct" },
          { "provider": "together", "model": "Qwen/Qwen2.5-VL-72B-Instruct" }
        ],
        "action_on_disagreement": "flag_for_internal_review"
      },
      "bid_calculation": {
        "primary": { "provider": "together", "model": "meta-llama/Llama-3.1-8B-Instruct-Turbo" },
        "fallback": { "provider": "openai", "model": "gpt-4.1-nano" }
      },
      "scope_refinement": {
        "primary": { "provider": "together", "model": "meta-llama/Llama-4-Maverick-17B-128E-Instruct" },
        "fallback": { "provider": "openai", "model": "gpt-4.1-mini" }
      }
    },
    "video_strategy": {
      "native_video_categories": ["lawn", "repair", "patio"],
      "native_video_providers": {
        "primary": { "provider": "together", "model": "meta-llama/Llama-4-Scout-17B-16E-Instruct" },
        "fallback": { "provider": "google", "model": "gemini-2.5-flash" }
      },
      "frame_extraction_categories": ["bathroom", "kitchen"],
      "frame_extraction_max_frames": 15,
      "frame_extraction_scope_provider": "anthropic"
    },
    "cost_controls": {
      "max_cost_per_job": 5.00,
      "alert_threshold_monthly": 1000,
      "use_batch_api_for_non_urgent": true,
      "batch_urgency_threshold_hours": 4
    }
  }
}
```

---

## Appendix A: Token Cost Calculator

### Formula for estimating cost per job:

```
Total Cost = Classification Cost + Scope Generation Cost + Bid Calculation Cost

Where:
  Classification Cost =
    (1 image tokens + description tokens + system prompt tokens) × input_price
    + (output tokens) × output_price

  Scope Generation Cost =
    (N images × avg_tokens_per_image + system_prompt + category_rules) × input_price
    + (task_list_output tokens) × output_price

  Bid Calculation Cost =
    (task_list + pricing_data + instructions) × input_price
    + (bid_range_output) × output_price
```

### Quick Reference — Tokens Per Image By Resolution:

| Resolution | Approx. Tokens (Claude) | Approx. Tokens (GPT) | Approx. Tokens (Gemini) |
|---|---|---|---|
| 256px | ~1,300 | ~1,100 | ~1,000 |
| 512px | ~2,600 | ~2,200 | ~2,000 |
| 768px | ~4,500 | ~4,000 | ~3,500 |
| 1024px | ~6,400 | ~5,500 | ~5,000 |
| 1536px+ | ~10,000+ | ~8,500+ | ~7,500+ |

**Recommendation:** Resize all images to 1024px max dimension before sending to any API. Going above this adds cost without meaningful quality improvement for scope generation.

---

## Appendix B: Provider API Compatibility

| Feature | Anthropic | OpenAI | Google | Together AI | DeepSeek |
|---|---|---|---|---|---|
| SDK language | Python, TS | Python, TS | Python, TS | Python, TS (OpenAI-compatible) | Python, TS (OpenAI-compatible) |
| Structured output (JSON) | Yes (tool_use) | Yes (response_format) | Yes (response_mime_type) | Yes (OpenAI-compatible) | Yes (OpenAI-compatible) |
| Streaming | Yes | Yes | Yes | Yes | Yes |
| Batch API | Yes (50% off) | Yes (50% off) | Yes (50% off) | Yes (up to 50% off) | No |
| Prompt caching | Yes (90% savings) | Yes (cached_tokens) | Yes (context_cache) | Model-dependent | Yes (cache hits) |
| Image input | base64, url | base64, url | base64, url, GCS | base64, url | base64, url |
| Video input | No (frames only) | No (frames only) | Yes (native) | Yes (Llama 4, native) | Yes (native, V4) |
| Rate limits | Tier-based | Tier-based | Generous + free | Good, scales with plan | Limited info |
| OpenAI SDK compatible | No (own SDK) | Yes (native) | No (own SDK) | **Yes (drop-in)** | Yes |
| Free credits | None | None | Free tier (15 RPM) | **$100 signup credit** | Limited free tier |

### Integration Effort Per Provider:

| Provider | Integration Effort | Notes |
|---|---|---|
| Together AI | **Very Low** | OpenAI SDK with `base_url = "https://api.together.xyz/v1"` — same code works for OpenAI, Together, and DeepSeek |
| OpenAI | Low | Native SDK, most documented |
| Anthropic | Low | Own SDK, slightly different API shape |
| Google | Medium | Different SDK patterns, Vertex AI vs AI Studio options |
| DeepSeek | Low | OpenAI-compatible API, use OpenAI SDK with base_url override |

**Recommendation for MVP:** Start with **OpenAI SDK** — it natively covers OpenAI, Together AI, and DeepSeek (all OpenAI-compatible). Add **Anthropic SDK** for Claude models. That's only **2 SDKs** to integrate 4 providers. Add Google SDK later for native video experiments.

```typescript
// One SDK, three providers — code example
import OpenAI from 'openai';

// OpenAI direct
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Together AI (same SDK, different base URL)
const together = new OpenAI({
  apiKey: process.env.TOGETHER_API_KEY,
  baseURL: 'https://api.together.xyz/v1'
});

// DeepSeek (same SDK, different base URL)
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com'
});

// All three use the exact same .chat.completions.create() call
```

---

*Pricing data sourced April 2026. AI model pricing trends downward — expect 20-40% reductions annually. Re-evaluate this document quarterly.*

Sources:
- [Anthropic Claude API Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [OpenAI API Pricing](https://openai.com/api/pricing/)
- [Google Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Together AI Pricing](https://www.together.ai/pricing)
- [Together AI Models](https://www.together.ai/models)
- [Together AI Vision LLMs Docs](https://docs.together.ai/docs/vision-overview)
- [DeepSeek API Pricing](https://api-docs.deepseek.com/quick_start/pricing/)
- [LLM API Pricing Comparison 2026](https://pecollective.com/blog/llm-api-pricing-comparison/)
- [Llama 4 Scout vs Maverick Pricing](https://tokencost.app/blog/llama-4-scout-vs-maverick-api-pricing)
- [GPT-4.1 Nano Pricing](https://pricepertoken.com/pricing-page/model/openai-gpt-4.1-nano)
- [Gemini 2.5 Flash Pricing](https://pricepertoken.com/pricing-page/model/google-gemini-2.5-flash)
- [o4-mini Pricing](https://pricepertoken.com/pricing-page/model/openai-o4-mini)
