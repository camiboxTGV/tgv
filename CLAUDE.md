# TGV-Media — Claude Code Project Context

## What Is TGV-Media

TGV-Media is a full-service customization and promotional production company. The web app is a **static showcase site** — its purpose is to present what we do, demonstrate our work, and route interested clients to a contact form.

We serve marketing teams, event planners, agencies, and SMBs who need branded merchandise, print collateral, signage, and promotional products — produced consistently across every format.

**Core value proposition:**
- Full-service customization under one roof
- Nine in-house decoration techniques across apparel, print, signage, and promo products
- Coordinated production for multi-format campaigns
- Single-piece samples to 10,000+ unit runs
- Artwork preparation, proofing, and production in one workflow

---

## Site Scope

This is a **showcase + lead-gen site**, not a storefront or quoting tool.

- No e-commerce, cart, or checkout
- No user accounts, login, or registration
- No real-time price calculator
- No authenticated areas
- Lead capture happens through a single **contact form**

If a feature requires auth, backend state, or transactional flow, it does not belong in this project.

---

## Business Domain

### Services We Offer

| Service | Description |
|---------|-------------|
| Branded Apparel & Merch | T-shirts, hoodies, caps, bags, uniforms — decorated to spec |
| Print Collateral | Business cards, flyers, brochures, catalogues, stationery |
| Large-Format & Signage | Banners, roll-ups, flags, window graphics, trade show displays |
| Promotional Products | Pens, mugs, drinkware, tech accessories, event giveaways |
| Packaging & Labels | Custom boxes, stickers, product labels, presentation sleeves |
| Design-to-Production | Artwork preparation, print proofing, and production in one workflow |

### Target Customers
- Marketing managers running brand campaigns, launches, and internal programs
- Event planners needing on-deadline signage, swag, and print materials
- Agencies executing client campaigns requiring coordinated production
- Procurement teams consolidating vendors for consistent brand output
- SMB owners needing retail-ready branding without a design department

### Pricing Model
Quotes are issued manually after artwork and quantity review. Pricing is not displayed on the site — the contact form routes requests to the production team for custom quoting.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | 16.x |
| UI Runtime | React | 19.x |
| Language | TypeScript | strict mode |
| Styling | Tailwind CSS | 4.x |
| CSS Processor | PostCSS + @tailwindcss/postcss | 8 |
| Display Font | Outfit (Google Fonts) | — |
| Node target | Node.js | 18+ |

**No UI libraries. No component libraries. No CSS frameworks.** Dependency surface is intentionally minimal.

---

## Architecture

### Rendering Strategy
- **Server Components by default** — every page is static or statically generated
- **Client Components only for interactivity** — the contact form, any carousels, mobile nav toggle
- **`generateStaticParams()`** for service/technique detail routes
- **No API caching concerns** — content is static

### File Structure

```
app/
  layout.tsx                        Root layout: NavBar, Footer, Outfit font
  globals.css                       Design system: CSS variables + Tailwind config
  page.tsx                          Homepage — Server Component

  about/page.tsx                    Company story — Server Component
  contact/page.tsx                  Contact page shell — Server Component
                                    (renders ContactForm as Client Component)

  services/page.tsx                 Services overview — Server Component
  services/[service]/page.tsx       Individual service pages (apparel, print,
                                    signage, promo, packaging) — Server,
                                    statically generated via generateStaticParams

  techniques/page.tsx               Techniques overview — Server Component
  techniques/[technique]/page.tsx   Individual technique pages (screen print, DTF,
                                    embroidery, UV, pad, laser, sublimation,
                                    large-format, offset/digital) — Server,
                                    statically generated

  portfolio/page.tsx                Portfolio/work gallery — Server Component

  privacy/page.tsx                  Privacy policy
  terms/page.tsx                    Terms of service

components/
  NavBar.tsx                        Client: sticky header, mobile hamburger
  Footer.tsx                        Server: nav links, socials, legal links
  ContactForm.tsx                   Client: name, email, company, message,
                                    optional file upload
  ServiceCard.tsx                   Server: service grid card
  TechniqueCard.tsx                 Server: technique grid card
  PortfolioCard.tsx                 Server: portfolio grid card with hover zoom
  ImageCarousel.tsx                 Client: auto-advancing carousel with dot nav
  Breadcrumbs.tsx                   Server: breadcrumb trail

lib/
  content/services.ts               Static service data (title, description,
                                    bullets, hero image)
  content/techniques.ts             Static technique data (title, description,
                                    best-for, limitations, substrates)
  content/portfolio.ts              Static portfolio items (title, category,
                                    image, client, tags)

public/
  logo.svg                          Brand logo
  logo.ico                          Favicon
  images/                           Portfolio photography, hero images
```

### Content Model
All page content (services, techniques, portfolio items) lives as **typed static data** in `lib/content/`. No CMS, no database, no fetch calls. Pages import from these modules at build time.

Swap to a CMS later (Sanity, Contentful, local MDX) without touching page components — just replace the module bodies. Keep function signatures stable.

### Client-Side State
Minimal. No state libraries, no context providers.
- `useState()` — contact form fields, mobile nav open/close
- `useRef()` — file input DOM ref, click-outside detection
- `useEffect()` — scroll lock when mobile nav is open
- `usePathname()` — active nav link detection

---

## Contact Form

The contact form is the site's single conversion point. Fields:
- Name (required)
- Email (required)
- Company (optional)
- Phone (optional)
- Project type (select: apparel, print, signage, promo, packaging, mixed)
- Quantity estimate (optional)
- Deadline (optional)
- Message (required)
- File attachment (optional — artwork, brief, reference images)

### Submission — Not Yet Decided

The form submission backend is **deliberately unspecified**. Options on the table:

- **Static form service** (Formspree, Web3Forms, Getform) — zero backend, POST directly from client
- **Serverless function** — Next.js route handler at `/api/contact` forwarding to email (Resend, SendGrid, Postmark)
- **Custom backend API** — if infrastructure already exists, set `NEXT_PUBLIC_API_URL` and POST to `/inquiries`

When the submission method is chosen, update `ContactForm.tsx` and document it here. Until then, stub the submit handler with a clear placeholder that logs the payload and shows a success state — do **not** build speculative backend plumbing.

### File Uploads

If the chosen submission path doesn't support file uploads natively, files should be uploaded separately (pre-signed URL to object storage) before the form POST — or omitted until the backend is decided. Do not invent an upload flow speculatively.

---

## Design System

All tokens are CSS variables in `app/globals.css`. Use them via Tailwind's arbitrary-value syntax `[var(--token)]`.

### Color Tokens

```css
/* Brand */
--brand-orange: #FF6600   /* Logo, primary actions, CTAs, success */
--brand-gray: #4D4D4D     /* Secondary CTAs */
--brand-black: #0F0F10    /* Primary text accent */

/* Surfaces */
--bg: #F6F5F9             /* Page background */
--surface: #FFFFFF        /* Cards, panels */
--surface-soft: #F1F0F5   /* Hover states, light fills */
--surface-elevated: #E9E8EF

/* Text */
--text-primary: #0F0F10   /* Main body text */
--text-soft: #3C3C45      /* Secondary text */
--text-muted: #6F6F7A     /* Labels, captions, tertiary */

/* Borders */
--border: #E2E1E8         /* Standard */
--border-soft: #ECEBF2    /* Subtle */
--border-strong: #D2D1DA  /* Emphasized */

/* Semantic */
--primary: #FF6600        /* Orange CTAs */
--primary-hover: #FF6600
--secondary: #4D4D4D      /* Gray CTAs */
--secondary-hover: #4D4D4D
```

### Typography
- Display/headings: **Outfit** (Google Fonts), loaded in root layout via `next/font/google`
- Body: system-ui fallback
- Heading scale: `text-3xl sm:text-4xl lg:text-5xl` (responsive pattern)

### Tailwind Class Ordering
Maintain this order within `className` strings:
1. Layout (`flex`, `grid`, `block`, `hidden`)
2. Positioning (`relative`, `absolute`, `top-`, `left-`)
3. Spacing (`p-`, `m-`, `gap-`)
4. Sizing (`w-`, `h-`, `max-w-`)
5. Typography (`text-`, `font-`, `leading-`)
6. Visual (`bg-`, `border-`, `rounded-`, `shadow-`)
7. State modifiers (`hover:`, `focus:`, `active:`)

---

## Domain Knowledge

### Decoration Techniques

| Technique | Best For | Not Suited For |
|-----------|----------|----------------|
| Screen Printing | Large textile runs, bold colour blocks | Photographic artwork, small runs |
| DTF Transfer | Full-colour artwork, small runs, gradients | Very large volume (cost per unit) |
| Embroidery | Caps, polos, workwear, premium logos | Fine detail, photographic imagery |
| UV Printing | Pens, hardware, flat rigid surfaces | Flexible fabrics, curved items |
| Pad Printing | Curved and irregular surfaces | Full-colour photographic artwork |
| Laser Engraving | Metal, wood, leather, awards | Multi-colour artwork |
| Sublimation | Polyester sportswear, mugs, all-over prints | Cotton, dark substrates |
| Large-Format Digital | Banners, signage, vehicle graphics | Small-detail text, premium hand-feel |
| Offset & Digital Print | Paper collateral, brochures, business cards | Non-paper substrates |

### Production Vocabulary

| Term | Meaning |
|------|---------|
| CMYK | Four-colour process printing |
| Pantone / PMS | Spot-colour system for exact brand matching |
| DPI | Artwork resolution; 300 dpi minimum for print |
| Vector | Scalable artwork (AI, EPS, SVG, PDF) — required for most decoration |
| Bleed | Extra artwork beyond trim line (usually 3mm) |
| Proof | Pre-production sample signed off before run |
| Setup / Origination | One-time charge for screens, plates, or embroidery digitising |
| GSM | Grams per square metre — paper or fabric weight |
| Lamination | Protective film applied post-print |
| Spot UV | Localised gloss coating for contrast and tactile finish |
| Die-cut | Custom-shaped cut using a formed blade |
| MOQ | Minimum Order Quantity |
| Lead time | Days from artwork approval to dispatch |
| Rush | Expedited production at premium rate |

### Accepted Artwork Formats
Vector: `.ai`, `.eps`, `.svg`, `.pdf`
Raster (300 dpi minimum): `.png`, `.tiff`, `.jpg`
Layered source: `.psd`, `.indd`

### Company Details
- **Name**: TGV-Media
- **Compliance**: GDPR

*(Fill in location, founding year, email, and phone before production launch.)*

---

## Development Rules

### Core Principle
Implement the simplest solution that fully satisfies the stated requirement. No speculative features, no premature abstractions, no extra dependencies. This is a static showcase site — resist the urge to add state, backends, or complexity that doesn't serve the content.

### Stack Rules
- Stack is **Next.js + React + TypeScript + Tailwind CSS only**
- No UI libraries (shadcn, MUI, Chakra, Ant Design, Radix, etc.)
- No CSS frameworks (Bootstrap, etc.)
- No custom `.css` files — Tailwind utilities only in JSX
- No `@apply` in CSS
- No `style={{}}` inline attributes unless absolutely unavoidable (comment why)
- No new `npm` packages without explicit user instruction
- No CMS integration until explicitly requested

### Component Rules
- Server Components by default; add `"use client"` only when genuinely needed
- JSX nesting: max 4–5 levels before extracting a component
- No meaningless wrapper `<div>` elements — every element must serve a purpose
- All props must be TypeScript-typed (interfaces, not `any`)
- Reusable components belong in `components/`; page-specific UI stays in the page file

### Styling Rules
- Mobile-first: base → `md:` → `lg:`
- Use CSS variable tokens: `text-[var(--text-muted)]`, `bg-[var(--surface)]`
- Avoid arbitrary Tailwind values `[arbitrary]` when a theme token exists
- Keep class ordering consistent: layout → position → spacing → size → typography → visual → state

### Editing Rules
- Read the target file fully before making any change
- Make the smallest effective change that solves the task
- Do not touch unrelated files
- Do not reorganize folder structure without explicit instruction
- Do not rename files or folders without a reason
- Do not convert JS↔TS unless asked
- Do not add comments to code you didn't change

### Code Quality
- No AI signatures, meta-commentary, or placeholder notes in code
- No `TODO` / `FIXME` / `lorem ipsum` in production code
- No dead code or unused imports
- No error handling for impossible scenarios
- Validate only at system boundaries (contact form input)
- Trust Next.js internals and framework guarantees

### Consistency
- Match the naming style, spacing, and class ordering of surrounding code
- Similar page sections must follow similar JSX structure
- No stylistic drift between files or between sections within a file

---

## Common Commands

```bash
npm run dev     # Start dev server (localhost:3000)
npm run build   # Production build
npm run start   # Start production server
npm run lint    # ESLint
```

Environment variables (as needed):
```
# Only if a backend or form service is wired up later
NEXT_PUBLIC_CONTACT_ENDPOINT=<tbd>
NEXT_PUBLIC_CLARITY_PROJECT_ID=<your-clarity-id>
```

---

## Open Decisions / To Resolve Before Launch

### Contact Form Submission
Decide between static form service, serverless route, or custom API. Until chosen, the form logs payload and shows success state only. **Do not build speculative backend plumbing.**

### Content Authoring
Services, techniques, and portfolio items live in `lib/content/` as typed static modules. If content editors need non-developer access later, migrate to a lightweight CMS (Sanity, Contentful, MDX) — keep the module function signatures stable so pages don't change.

### Company Details
Location, founding year, contact email, and phone need to be filled in before production launch (see Company Details section above and wherever they surface in `Footer.tsx` / contact page).

### Legal Pages
`privacy/page.tsx` and `terms/page.tsx` need real copy reviewed for the jurisdiction TGV-Media operates in. Placeholder content should not ship.