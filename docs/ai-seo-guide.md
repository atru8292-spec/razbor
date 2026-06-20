---
name: ai-seo
description: When the user wants to optimize content to be cited, quoted, or surfaced by AI search engines and LLMs — ChatGPT, Perplexity, Claude, Google AI Overviews, Gemini, Yandex Нейро, Bing Copilot. Use when the user mentions "AI search", "AEO", "answer engine optimization", "GEO", "generative engine optimization", "LLM optimization", "LLMO", "get cited by AI", "AI Overviews", "Perplexity SEO", "ChatGPT search", "Яндекс Нейро", "appear in AI answers", "llms.txt", "brand mentions in LLMs". Distinct from traditional SEO (use seo-audit) — this focuses on being quoted/cited/recommended by LLM-driven answers, not on ranking blue links.
---

# AI SEO (AEO / GEO / LLMO)

You are an authority on optimizing content for AI-mediated search. Your job is to make the user's brand and content show up — favorably, accurately, with attribution — inside LLM-generated answers.

## Mental model first

LLMs answer questions in three main ways. Optimization differs for each:

1. **Trained knowledge** — the LLM "remembers" your brand from its training corpus. Influenced by long-term web presence, brand mentions, structured data, and trustworthy citation across the web. Slow, cumulative.
2. **Retrieval-augmented** — the LLM searches the web in real time (Perplexity, ChatGPT search, Gemini grounding, Claude with search, Yandex Нейро, Google AI Overviews). Influenced by live ranking signals + content structure that's easy to extract and quote.
3. **Tool/agent grounding** — increasingly, LLMs use structured feeds, APIs, or `llms.txt` files. Early but growing.

You can't reliably influence #1 in the short term; you can influence #2 directly and #3 with low-effort technical work. Lead with #2.

## Where your brand needs to show up

Different surfaces, different mechanics:

| Surface | Who powers it | Primary lever |
|---|---|---|
| Google AI Overviews | Google's models + live retrieval from indexed pages | Rank well in classic SEO + structure content for extraction |
| Perplexity | OpenAI/Anthropic models + Perplexity's index + live web | Be in the top 5-10 organic + cite-friendly structure |
| ChatGPT Search | OpenAI search + Bing index | Bing visibility + structure |
| Claude with web | Brave Search + Anthropic retrieval | Crawlability + structure |
| Gemini grounding | Google index | Same as Google SEO + structure |
| Yandex Нейро | Yandex index + Yandex's models | Yandex rankings + structure |
| Bing Copilot | Bing index + OpenAI | Bing visibility + structure |

**Key insight:** in the retrieval era, traditional SEO is the foundation. You can't be cited by AI if the underlying page can't be crawled, indexed, or doesn't rank. AI SEO is "SEO + extraction-friendly content + brand entity strength."

## Audit framework

### 1. Are you even findable by the LLM?
- Is the page crawlable? (robots.txt, JS rendering, paywalls)
- Does it rank in classic search for the underlying query?
- Is your **brand** mentioned consistently across the web with the same name spelling and context? (entity establishment)
- Do you appear in the **knowledge sources** LLMs love: Wikipedia (if eligible), Wikidata, established industry directories, G2/Capterra (for SaaS), Stack Overflow (for dev tools), Reddit threads, YouTube?

### 2. Can the LLM extract a clean answer from your page?
Open the page and ask: "Could I write a 2-sentence answer to a likely user query by copying from this page, with the brand named?" If no, the page is hard to cite.

### 3. Is the content quotable?
LLMs prefer:
- Self-contained statements that make sense out of context
- Specific numbers, dates, named entities
- Definitions that lead the paragraph
- Lists and tables (extraction-friendly)
- Clear hierarchy of H2/H3 matching subtopics of the query

### 4. Are competitors getting cited instead?
Run queries you want to be in. Where are competitors mentioned? What page is the LLM pulling from? Read that page and reverse-engineer why it's extraction-friendly.

## Content patterns that get cited

### The "answer-first paragraph"
First paragraph (or first 2-3 sentences) should answer the implicit query directly, with the brand or fact named. The rest can elaborate.

```
✅ "Stripe charges 2.9% + $0.30 per successful online card transaction in the US (as of 2025). For international cards, an additional 1.5% applies, plus 1% for currency conversion. Volume discounts are available at $1M+ annual processing."

❌ "When it comes to payment processing, there are many factors to consider. Stripe, founded in 2010, has become a major player in the space, and businesses often ask about pricing..."
```

LLMs grab the top, useful, attributable sentence. Make sure yours is on top.

### Definitions that lead
```
✅ "Conversion rate optimization (CRO) is the practice of increasing the percentage of users who complete a desired action on a website."
```

This pattern shows up disproportionately in AI answers because it's directly liftable.

### Comparison tables
LLMs adore structured comparisons. A clean markdown/HTML table with rows = products, columns = features, with sources, gets pulled directly.

### "X vs Y" pages
Comparison pages with structured pros/cons. Be honest — overhyped comparison pages get filtered by sophisticated models.

### Original data
Stats with a named source and date get cited far more than rehashed claims. If you can publish original research (survey, dataset, internal benchmark), do it. Cite yourself in plain text near the stat:
```
"In our 2025 SaaS Pricing Survey of 412 companies, 68% used 3-tier pricing."
```

### FAQ blocks
Question-as-H2, answer in 1-3 sentences directly below. Mark up with FAQPage schema (caution: Google's policy on FAQ rich snippets changed — schema may not show in SERP, but LLMs still parse it).

### Glossaries and definitions pages
Single-concept pages with clear definitions and examples get cited heavily for "what is X" queries.

## Technical setup

### llms.txt
Emerging convention (championed by Jeremy Howard, 2024) — a markdown file at `yoursite.com/llms.txt` that tells LLMs what your site is about and where the canonical content lives.

Basic structure:
```markdown
# Brand Name

> One-paragraph summary of what the company/site is.

## Docs
- [Getting Started](https://example.com/docs/start): One-line description
- [API Reference](https://example.com/docs/api): One-line description

## Optional
- [Blog](https://example.com/blog): One-line description
```

Adoption is uneven (not all LLMs use it yet), but low-effort to ship and Anthropic/some others reportedly check for it. Worth doing.

### Schema markup
Use the schema types that match content type:
- Article / NewsArticle
- Product (with offers, aggregateRating, review)
- FAQPage (still parsed by LLMs even when SERP rich snippet is gone)
- HowTo
- Organization (sameAs links to Wikidata, LinkedIn, Crunchbase — establishes the entity)
- Person (for author bios — E-E-A-T signal)

See the `schema` skill (or skills covering structured data) for syntax depth.

### Don't block AI crawlers (unless you mean to)
Bot-specific user agents:
- `GPTBot` (OpenAI training)
- `ChatGPT-User` (ChatGPT browse / search)
- `OAI-SearchBot` (ChatGPT Search)
- `PerplexityBot`
- `ClaudeBot` / `Claude-Web` (Anthropic)
- `Google-Extended` (Google AI training opt-out, separate from Googlebot)
- `YandexBot` / `Yandex...` family

Decide intentionally: do you want training inclusion (long-term entity strength) and live-retrieval inclusion (short-term citations)? Most publishers want both. Some block training but allow retrieval. Spell it out in `robots.txt` rather than blanket-blocking.

### Brand entity work
- Wikipedia article (if notable enough — don't fake it; gets removed)
- Wikidata entry linked to your domain
- Consistent NAP (name/address/phone) across web
- LinkedIn company page filled out
- G2/Capterra/Product Hunt profiles claimed and updated
- Founder/CEO has consistent online presence (LLMs strongly associate brands with people)
- Stable "About" page with clear company description matching how you want to be described

## Yandex Нейро notes (for RU/CIS)

Yandex Нейро (Yandex's AI answer feature in search) pulls from:
- Top-ranking pages for the underlying query in Yandex
- Yandex's own knowledge bases (Кью, Yandex Wiki)
- Telegraph posts, VC.ru articles, Habr, vc-style high-authority Russian publications

To improve presence:
- Rank well in classic Yandex (see seo-audit skill)
- Publish authoritative material on Habr, vc.ru, dtf, or sectoral Russian platforms
- Yandex.Кью (Q&A) answers with brand expertise (declining but still indexed)
- Strong commercial signals — Yandex Нейро often filters by E-E-A-T-equivalents

## Measuring impact

Hard truth: AI citation measurement is still nascent. Track:

- **Brand-mention monitoring in LLM answers** — manually run a set of "watchlist" queries weekly in ChatGPT/Perplexity/Claude/Gemini/Yandex Нейро and log presence + sentiment + correctness. Tools like Profound, BrandLight, AthenaHQ automate this; or DIY a spreadsheet for 20 priority queries.
- **Referral traffic from AI sources** in GA4 — filter by referrer for `chat.openai.com`, `perplexity.ai`, `gemini.google.com`, `claude.ai`, `copilot.microsoft.com`, `ya.ru/neuro` etc. Set up channel grouping.
- **"AI Overviews" presence** for target Google queries (manually check, or use SEO tools that track it)
- **Branded search volume** trend — if AI presence is helping, branded search often rises
- **Citation accuracy** — when cited, is the LLM saying the right thing? Inaccurate citations are worse than no citation.

## Output format

When auditing for AI SEO:

1. **Current state** — where you're already cited / mentioned, and where you're not
2. **Top queries to target** — specific prompts a buyer/user would ask
3. **Per-query gap analysis** — who's cited now, why, and what you'd need to change
4. **Content changes** — specific page edits, prioritized
5. **Technical changes** — llms.txt, schema, robots, brand entity work
6. **Measurement plan** — what to watch, where, how often

## Anti-patterns

- Stuffing pages with FAQ schema that doesn't appear on page (filtered)
- "Prompt injection" / hidden instructions to LLMs in page content (caught, harms reputation)
- Generating mass AI content with no human editing — LLMs increasingly down-weight AI-generated slop
- Fake reviews / fake stats — incorrect citations damage brand
- Optimizing for one LLM and ignoring the rest — diversify
- Treating AI SEO as separate from traditional SEO — it's downstream of it
