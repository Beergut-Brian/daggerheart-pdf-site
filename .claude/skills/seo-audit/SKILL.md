---
name: seo-audit
description: Audit an existing website's SEO and produce a prioritized report without changing anything. Use when Kaden asks for an SEO audit, review, or report on any live site, his own or a client's.
---

# seo-audit

Read-only. Change no code. Output is `../report.md`.

## Collect

1. Crawl the site (sitemap first, then follow internal links). Record every URL, status code, title, description, H1, canonical, index status, word count, and inbound internal link count.
2. Run Lighthouse mobile on the home page, one category or service page, one detail page, and one content page.
3. Check `robots.txt`, `sitemap.xml`, HTTPS, redirects (chains, loops, http to https), 404s.
4. Validate structured data on each page type.
5. Local businesses: compare NAP on the site with the Google Business Profile given in the brief.
6. Check for duplicate titles, duplicate content between pages, thin pages, orphan pages, broken links and images, missing alt text.

## Report format (`report.md`)

1. Summary: three sentences on the overall state and the top three fixes.
2. Prioritized findings table: issue, pages affected, impact (high/medium/low), effort (hours), fix.
3. Quick wins: fixes under an hour each.
4. Page inventory: the crawl table.
5. Lighthouse scores per page type.
6. What was not checked and why (no Search Console access, for example).

## Rules

Facts from the crawl only; no guesses about rankings or traffic without data. Where a fix depends on a business decision (merging pages, changing the service list), say so rather than recommending it outright.
