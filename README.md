# Chisel & Groove Studio — Website

Static HTML/CSS website for [chiselandgroovestudio.com](https://www.chiselandgroovestudio.com), hosted on AWS Amplify.

Chisel & Groove is a custom hardwood furniture studio based in Pittsboro, NC, owned by Stacey and Michelle Robinson. This repo is a clean static rebuild of their Squarespace site, following the same architecture used for [gp-website](https://github.com/GrowthPointTech/gp-website).

## Quick Start

```bash
# Clone the repo
git clone https://github.com/elcidk89/rx3-website.git
cd rx3-website

# Start local dev server (no build step — site is pure static HTML/CSS/JS)
node server.js
# Open http://localhost:3000
```

No frameworks, no build tools for the site itself. The only optional dependency is Puppeteer (for style extraction — see below).

## Project Structure

```
rx3-website/
├── index.html                # Home page
├── our-process.html          # Our Process + FAQ
├── gallery.html              # Furniture Gallery (lightbox)
├── about.html                # About Us
├── contact.html              # Contact form (Formspree)
├── privacy.html              # Privacy Policy
│
├── css/
│   ├── variables.css         # Brand tokens (colors, fonts, spacing)
│   ├── base.css              # Reset, typography, layout primitives
│   ├── components.css        # Nav, footer, buttons, gallery, form
│   └── pages.css             # Page-specific overrides
│
├── js/
│   ├── nav.js                # Scroll behavior + mobile menu toggle
│   ├── gallery.js            # Lightbox (open/close/keyboard nav)
│   └── contact.js            # Formspree AJAX submission
│
├── assets/
│   └── images/               # All site images (downloaded from Squarespace CDN)
│
├── tools/
│   ├── extract-styles.js     # Puppeteer style extractor (requires gp-website node_modules)
│   └── run-extract.js        # Same extractor, direct path to puppeteer
│
├── reference/                # Generated — gitignored. Output of Puppeteer extraction.
│
├── server.js                 # Local dev server (port 3000, no-cache headers)
├── amplify.yml               # AWS Amplify redirect rules
├── customHttp.yml            # Security headers (HSTS, CSP, X-Frame-Options, etc.)
└── package.json              # puppeteer dev dependency (style extraction only)
```

## Tech Stack

- **HTML5 + CSS3 + Vanilla JS** — no framework, no build step
- **CSS Custom Properties** — all brand tokens in `css/variables.css`
- **Responsive** — mobile-first, breakpoints at 768px and 900px
- **AWS Amplify** — static hosting with auto-deploy on branch merge
- **Formspree** — contact form backend (see below)

## Brand Tokens

The original site runs on Squarespace 7.1, which injects all styles at runtime via JavaScript — there are no static CSS files to download. We used Puppeteer (headless Chrome) to extract `getComputedStyle()` values from the live site across all pages.

The commercial fonts (PP-Fragment, myriad-pro via Adobe Typekit) were substituted with equivalent Google Fonts:

| Element | Original Font | Static Substitute | Notes |
|---------|--------------|-------------------|-------|
| Headings | PP-Fragment | Cormorant Garamond | High-contrast display serif |
| Body / Nav | myriad-pro | Source Sans 3 | Humanist sans-serif |

### Colors (from computed styles)

| Name | Value | Usage |
|------|-------|-------|
| Black | `#000000` | Header, footer background |
| Charcoal | `#585651` | Secondary text, warm dark |
| Gray | `#404040` | Body text, headings on light bg |
| Silver | `#bbbbbb` | Dividers, borders |
| Cream | `#fbf0db` | Warm section backgrounds |
| Off-White | `#fff8ec` | Page background |
| White | `#ffffff` | Hero text, nav on dark |

## Contact Form — Formspree

The contact page uses [Formspree](https://formspree.io) — a form backend that works with static HTML, requires no server, and has a free tier (50 submissions/month, more than enough for project inquiries).

The form is **already wired up** using the `@formspree/ajax` CDN (endpoint `xeewylep`). Submissions go to `sales@chiselandgroovenc.com`. No configuration needed — it's live.

The library handles field-level validation errors, submit button state, and the success/error messages entirely via `data-fs-*` attributes. No custom JS required.

## Hosting — AWS Amplify

Same AWS account as GrowthPoint. Two environments:

| Environment | Branch | URL | Password |
|-------------|--------|-----|----------|
| **Preview / Staging** | `preview` | [preview.chiselandgroovestudio.com](https://preview.chiselandgroovestudio.com) | `chisel` / `grooves` |
| **Production** | `main` | [chiselandgroovestudio.com](https://chiselandgroovestudio.com) | None |

**Amplify setup:**
1. AWS Console → Amplify → New app → Host web app → GitHub
2. Connect `elcidk89/rx3-website`
3. Build settings: **no build command**, publish directory `/`
4. Create two environments: `main` (production) and `preview` (staging, enable password protection)
5. Upload `amplify.yml` and `customHttp.yml` are picked up automatically from the repo root

**DNS (Route 53 — same hosted zone as GrowthPoint):**

| Record | Type | Value |
|--------|------|-------|
| `chiselandgroovestudio.com` | ALIAS | Amplify main environment |
| `www.chiselandgroovestudio.com` | CNAME | Amplify main environment |
| `preview.chiselandgroovestudio.com` | CNAME | Amplify preview environment |

Amplify provisions the SSL certificate automatically once the domain is connected.

## Branch Strategy

| Branch | Purpose | Deploys To |
|--------|---------|------------|
| `feature/*` | Working branches | PR preview URLs |
| `preview` | Staging | preview.chiselandgroovestudio.com (password protected) |
| `main` | Production | chiselandgroovestudio.com |

### Workflow

1. Create a branch: `git checkout -b feature/your-feature-name`
2. Open a PR targeting `preview`
3. Merge to `preview` → auto-deploys to staging
4. Stacey/Michelle review on preview site
5. PR from `preview` → `main` → auto-deploys to production

## Style Extraction (Puppeteer)

Because Squarespace renders styles at runtime, we use Puppeteer to extract computed CSS from the live site. This is useful when updating the static clone to match any changes made on the Squarespace side.

```bash
# Requires puppeteer — borrow node_modules from gp-website (same machine)
node tools/run-extract.js

# Outputs to reference/ (gitignored):
#   computed-styles.json  — getComputedStyle() per element, per page
#   site-css.css          — all <style> blocks captured from the live site
#   site-fonts.json       — all font families detected
#   site-colors.json      — all color values detected
#   site-images.json      — all image URLs detected
```

The `reference/` directory is gitignored — these are working files, not source files.

## Pages

| Page | File | Status |
|------|------|--------|
| Home | `index.html` | Live |
| Our Process | `our-process.html` | Live |
| Gallery | `gallery.html` | Live (10 pieces, lightbox) |
| About | `about.html` | Live |
| Contact | `contact.html` | Live (Formspree endpoint `xeewylep` active) |
| Privacy Policy | `privacy.html` | Live |

## Security

- HTTPS enforced via Amplify (automatic SSL)
- Security headers in `customHttp.yml`: HSTS, CSP, X-Frame-Options, X-Content-Type-Options
- No inline JavaScript (CSP compliant)
- No secrets in the repo
- Branch protection on `main` and `preview` — PRs required, Stacey + Michelle as reviewers

## License

Proprietary — Chisel & Groove Studio. All rights reserved.
