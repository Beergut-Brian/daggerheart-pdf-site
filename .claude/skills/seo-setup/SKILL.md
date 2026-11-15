---
name: seo-setup
description: Technical and on-page SEO for a new or rebuilt site: metadata, structured data, sitemaps, robots, redirects, local SEO, and performance basics. Use on every build and redesign. For reviewing an existing site, use seo-audit instead.
---

# seo-setup

> **WordPress + Bricks jobs:** use WordPress settings and Bricks page settings for titles, meta and Open Graph; no SEO plugin is in Kaden's standard stack, so propose one in Blocked if the site needs sitemaps or schema beyond core WordPress.

## Standard (every site)

1. Metadata: `seo/metadata.json` with title (under 60 chars), description (under 155), canonical, and Open Graph image per page. Titles are unique and describe the page; the brand goes at the end.
2. Structured data: Organization on the home page; BreadcrumbList on inner pages; type-specific schema below. Validate every block.
3. `sitemap.xml` generated from routes, excluding account, cart, checkout, and admin. `robots.txt` allows the site and blocks those paths; points to the sitemap.
4. Redirects: if an old site exists, map every old URL to the closest new page in `seo/redirects.csv`. 301s. No chains.
5. Performance: images optimized, fonts preloaded and swapped, no render-blocking scripts. Core Web Vitals pass on mobile.
6. Internal linking: every page reachable within three clicks from home; related pages link to each other with descriptive anchor text.

## By site type

- Ecommerce: Product schema with offers from live data (price, availability), category pages indexable, filtered and sorted URLs canonicalized to the base category, out-of-stock products stay indexable with availability marked.
- Local service: LocalBusiness schema with name, address, phone, hours, service area; NAP identical to Google Business Profile; one page per service area with distinct content; Service schema per service page.
- Nonprofit: NGO or Organization schema with `nonprofitStatus`; Event schema for events; DonateAction where supported.
- Portfolio: Person schema; CreativeWork per project.

## Done when

Every page has unique metadata; schema validates with no errors; sitemap and robots deployed to staging; redirect map tested; Core Web Vitals pass in Lighthouse mobile.
