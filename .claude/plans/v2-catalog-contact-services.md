# TGV-Media v2 — Catalog, Offer-Builder, Contact, Services

## Context

v1 shipped (homepage + NavBar + Footer + ServiceCard + 3 content modules). This v2 round adds the site's two main revenue surfaces and the lead-capture flow that ties them together. All work is **frontend-only** — no backend, no new npm packages, no CMS. Same design system (CSS variable tokens, Outfit font, brand orange `#FF6600`), Server Components by default, Tailwind v4 with arbitrary-value tokens.

User decisions already locked:
- Quote-builder feedback = **floating dock + dedicated `/offer` page** + transient toast on add.
- Selections persist in **localStorage only** (`tgv:offer:v1`).
- Services scope = **overview page + per-service detail pages**.
- Catalog data = **realistic placeholder products** (swappable later).

---

## What changes, at a glance

| Area | What |
|---|---|
| Footer | Socials → Facebook, Instagram, LinkedIn, Behance. Add `/sitemap` link in legal column. |
| Services data | Replace 6 placeholder services with the 4 canonical Romanian-named services. First service carries 4 sub-techniques (CO2 / fiber laser / UV print / UV transfer). |
| Services pages | New `/services` overview + `/services/[service]` detail (statically generated). |
| Catalog | New `/catalog` overview + `/catalog/[category]` listing. 6 categories, 6–12 products each. Realistic placeholder data. |
| Offer-builder | Floating dock, toast on add, `/offer` review page with quantity inputs. localStorage state via React Context provider. |
| Contact | New `/contact` page — striking, creative, on-theme. Multi-section form, drag-and-drop file upload, project-type/quantity/personalization chip selectors. Pre-fills "Selected products" if arrived from `/offer`. Stubbed submit handler shows success state. |
| Sitemap | New `/sitemap` human-facing page (NOT sitemap.xml). Data-driven from content modules. |
| NavBar | Small offer count badge next to "Start a project" when count > 0. |
| Homepage | Update services preview to render the new 4 services automatically (no copy work needed, just data swap). |

---

## Architecture & state model

```
app/layout.tsx (Server)
└── <OfferProvider> (Client boundary — wraps everything below)
    ├── <NavBar />              — Client; reads useOffer() for count badge
    ├── <main>{children}</main>
    │     ├── /catalog/[category]/page.tsx (Server, SSG)
    │     │     └── <ProductCard> (Server)
    │     │           └── <AddToOfferButton> (Client)
    │     ├── /offer/page.tsx (Client)
    │     └── /contact/page.tsx (Server shell)
    │           └── <ContactForm> (Client)
    ├── <Footer />              — Server
    ├── <OfferDock />           — Client; hidden on /contact and /offer
    └── <OfferToast />          — Client; listens for window event
```

**Why a single Client provider at root:** Server Components below the provider still SSR. Only the small interactive children opt into the context. Pages remain statically generated.

**Hydration safety:** Provider exposes `hydrated: boolean`. Dock and NavBar badge render `null` until `hydrated = true` to avoid SSR/CSR text mismatch.

**Toast decoupling:** `OfferProvider.add()` dispatches a `window.dispatchEvent(new CustomEvent("tgv:offer:added", { detail }))`. `OfferToast` is a tiny listener — no toast context needed.

**Selected products into contact form:** `/offer` "Continue to brief" → `/contact?from=offer&items=<base64>`. Contact form decodes the URL param first; falls back to `readOffer()` from localStorage if URL lacks `items`. URL param makes the link shareable; localStorage is the source of truth.

---

## Type contracts (new + changed)

### `lib/content/services.ts` — REWRITE

```ts
export interface ServiceTechnique {
  slug: string                 // "co2", "fiber-laser", "uv-print", "uv-transfer"
  title: string                // "Gravură CO2"
  description: string
}

export interface Service {
  slug: string                 // kebab-case ASCII
  title: string                // Romanian
  summary: string
  lead: string                 // Hero paragraph for detail page
  useCases: string[]
  accent: string               // CSS gradient
  techniques?: ServiceTechnique[]   // only on personalizare-obiecte-promotionale
}

export const services: Service[]         // 4 entries
export const serviceSlugs: string[]
export function getServiceBySlug(slug: string): Service | undefined
```

The 4 services:
1. `personalizare-obiecte-promotionale` — Personalizare obiecte promoționale (carries 4 techniques)
2. `timbru-sec-si-folio` — Timbru sec și folio
3. `productie-custom` — Producție custom
4. `tipar-digital` — Tipar digital

### `lib/content/catalog.ts` — NEW

```ts
export type Personalization = "co2" | "fiber-laser" | "uv-print" | "uv-transfer"

export const PERSONALIZATION_LABELS: Record<Personalization, { label: string; short: string }> = {
  "co2":          { label: "Gravură CO2",   short: "CO2" },
  "fiber-laser":  { label: "Fiber laser",   short: "Fiber" },
  "uv-print":     { label: "Print UV",      short: "UV print" },
  "uv-transfer":  { label: "Transfer UV",   short: "UV transfer" },
}

export interface CatalogCategory {
  slug: string                 // "drinkware", "office-desk", ...
  name: string
  description: string
  accent: string               // CSS gradient
}

export interface CatalogProduct {
  slug: string                 // unique site-wide
  name: string
  category: string             // CatalogCategory["slug"]
  summary: string
  accent: string               // CSS gradient
  personalizations: Personalization[]
}

export const categories: CatalogCategory[]    // 6 entries
export const products: CatalogProduct[]       // 36–72 entries
export const categorySlugs: string[]
export function getCategoryBySlug(slug: string): CatalogCategory | undefined
export function getProductsByCategory(slug: string): CatalogProduct[]
export function getProductBySlug(slug: string): CatalogProduct | undefined
```

The 6 categories:
- `drinkware` — Drinkware
- `office-desk` — Office & desk
- `tech-travel` — Tech & travel
- `apparel-accessories` — Apparel & accessories
- `awards-gifting` — Awards & gifting
- `event-promo` — Event & promo

### `lib/offer/storage.ts` — NEW

```ts
export const OFFER_STORAGE_KEY = "tgv:offer:v1"

export interface OfferItem {
  slug: string
  name: string
  category: string
  quantity: number             // integer 1..10000, default 1
}

export function readOffer(): OfferItem[]
export function writeOffer(items: OfferItem[]): void
export function serializeForUrl(items: OfferItem[]): string
export function deserializeFromUrl(s: string): OfferItem[] | null
```

All SSR-safe (`typeof window === "undefined"` guards).

### `components/contact/ContactForm.tsx` state

```ts
type ProjectType = "promotional" | "custom-production" | "print-collateral" | "awards-gifting" | "other"
type QuantityBucket = "1-50" | "50-500" | "500-5000" | "5000+" | "other"
type PersonalizationPref = "co2" | "fiber-laser" | "uv-print" | "uv-transfer" | "hot-foil" | "custom-production" | "digital-print" | "not-sure"

interface ContactFormState {
  name: string
  email: string
  phone: string
  company: string
  projectType: ProjectType | null
  quantity: QuantityBucket | null
  quantityOther: string
  deadline: string             // YYYY-MM-DD
  context: string              // textarea, min 20 chars
  personalizationPrefs: PersonalizationPref[]
  files: File[]
  selectedProducts: OfferItem[]  // from ?from=offer
  errors: Partial<Record<keyof ContactFormState, string>>
  touched: Partial<Record<keyof ContactFormState, boolean>>
  submitting: boolean
  submitted: boolean
}
```

---

## Routing map

| Route | Type | SSG | Notes |
|---|---|---|---|
| `/` | Server | yes | unchanged (homepage auto-picks new services) |
| `/services` | Server | yes | NEW overview |
| `/services/[service]` | Server | yes via `generateStaticParams` | 4 paths |
| `/catalog` | Server | yes | NEW overview |
| `/catalog/[category]` | Server | yes via `generateStaticParams` | 6 paths |
| `/offer` | Client | shell static, hydrates from storage + URL | NEW |
| `/contact` | Server shell + Client form | yes (shell) | NEW |
| `/sitemap` | Server | yes | NEW human-facing |
| `/about`, `/portfolio`, `/privacy`, `/terms`, `/techniques` | — | — | Don't exist yet. Sitemap lists them. Out of scope this round. |

---

## File-by-file execution order

### Phase 0 — Foundations (types + content, no UI)
1. `lib/content/services.ts` — REWRITE to 4 canonical services with new schema.
2. `lib/content/catalog.ts` — NEW. 6 categories + ~36–72 placeholder products.
3. `lib/offer/storage.ts` — NEW. localStorage helpers, SSR-safe.

### Phase 1 — Offer state
4. `components/OfferProvider.tsx` — Client. Context + `useOffer()` hook + localStorage hydration.
5. `components/OfferDock.tsx` — Client. Floating bottom-right pill. Hidden on /contact, /offer, and during SSR.
6. `components/OfferToast.tsx` — Client. Bottom-center auto-dismissing toast, listens for `tgv:offer:added` event.
7. `components/AddToOfferButton.tsx` — Client. Renders inside ProductCard. Toggles to "Added ✓" if already in offer.

### Phase 2 — Layout integration
8. `app/layout.tsx` — Wrap children in `<OfferProvider>`. Render `<OfferDock />` and `<OfferToast />` after `<Footer />`.
9. `components/NavBar.tsx` — Add small orange count badge next to "Start a project" CTA when `hydrated && count > 0`.
10. `components/Footer.tsx` — Replace socials → Facebook, Instagram, LinkedIn, Behance. Add `/sitemap` to legal links. Add Catalog + Offer links.

### Phase 3 — Services routes
11. `components/ServiceCard.tsx` — Adapt to new schema. Add "View service →" footer link. Small accent strip from `service.accent`.
12. `app/services/page.tsx` — NEW Server overview. Hero + 4 ServiceCards + closing CTA.
13. `app/services/[service]/page.tsx` — NEW Server detail. `generateStaticParams` from `serviceSlugs`. Sections: breadcrumbs, hero, sub-techniques (only if `service.techniques`), use cases, "Start a project" CTA, related services strip.

### Phase 4 — Catalog routes
14. `components/CategoryCard.tsx` — NEW Server. Tile linking to `/catalog/[slug]`.
15. `components/ProductCard.tsx` — NEW Server. Gradient placeholder + name + summary + personalization pill row + `<AddToOfferButton />`.
16. `app/catalog/page.tsx` — NEW Server. Hero + 6 CategoryCards + "How it works" 3-step explainer.
17. `app/catalog/[category]/page.tsx` — NEW Server. `generateStaticParams` from `categorySlugs`. Breadcrumbs + category header + personalization legend + product grid + closing CTA.

### Phase 5 — Offer page
18. `app/offer/page.tsx` — NEW Client. Empty state OR list with quantity inputs (1–10000 clamped) + remove + "Clear all" + "Continue to brief" → `/contact?from=offer&items=<base64>`.

### Phase 6 — Contact page
19. `components/contact/ContactHero.tsx` — NEW Server. "What happens next" 3-step panel + decorative dot grid background.
20. `components/contact/ChipGroup.tsx` — NEW Client. Reusable `single` | `multi` chip selector. Orange-when-selected pill style.
21. `components/contact/FileDropZone.tsx` — NEW Client. Drag-and-drop + hidden `<input type="file" multiple>`. Accepts CLAUDE.md formats. Per-file size validation (25MB cap). File list with name/size/type icon/remove.
22. `components/contact/ContactForm.tsx` — NEW Client. Single state object. Sections: ABOUT YOU / ABOUT THE PROJECT / FILES & ARTWORK. Reads `?from=offer&items=...` to pre-fill Selected Products pills (with "Edit selection →" link to /offer). Stubbed submit: validate → console.log → setTimeout 800ms → success state card.
23. `app/contact/page.tsx` — NEW Server shell. Grid `lg:grid-cols-[5fr_7fr]` with `<ContactHero />` left + `<ContactForm />` right. Stacks on mobile.

### Phase 7 — Sitemap
24. `app/sitemap/page.tsx` — NEW Server. Lead paragraph + sections (Main, Services, Catalog, Quote, Legal). Iterates `services` and `categories` content modules so it stays in sync.

### Phase 8 — Verify
25. `npm run build` clean. `npm run dev` no hydration warnings.

---

## UX details that matter

### Offer dock (bottom-right)
- `count > 0` → orange pill, count badge + "Build my offer" → /offer.
- `count === 0` → subtle ghost pill "Browse catalog →" linking /catalog (or hidden entirely on / and /catalog where the CTA is already on the page).
- `z-40` (below mobile nav overlay's `z-50`).

### Toast (bottom-center)
- "Added to your offer — view 3 items →" with View link to /offer.
- Auto-dismiss 3000ms. Stack supports rapid clicks.
- Translate-y + opacity transition on exit.

### Contact form creative touches
- Outfit-bold uppercase micro-labels above field groups (ABOUT YOU / ABOUT THE PROJECT / FILES & ARTWORK).
- Field focus rings use `--brand-orange`.
- Project type + Personalization chips animate on hover/select (small `scale-105` or border ring).
- Drop zone shows full-area orange overlay on `dragover`.
- "What happens next" panel left = 3 numbered cards with oversized Outfit numerals in `--brand-orange`.
- Decorative subtle dot grid background pattern via inline SVG (one of the rare cases inline SVG patterns earn their keep).
- Mobile: hero stacks above form; form fields go full-width.

### Validation
- Per-field inline error text below input + red border ring.
- Submit disabled until: name + email + projectType + context (≥20 chars) all valid.
- HTML5 `type="email"` + custom regex check on blur.
- Total file size hint shown live ("3 files, 4.2 MB").

### Success state
- Replaces form with check-mark card + "Brief received. We'll be in touch within 1 business day." + "Back to homepage →" link + small "Clear my offer" link if selectedProducts was non-empty.

---

## Things considered & rejected

- **`useSyncExternalStore` for offer state** — overkill for single-tab. Standard `useState + useEffect` writeback is sufficient.
- **Toast via context** — would force every consumer to subscribe and re-render. CustomEvent is one-line in `add()` and zero coupling.
- **Product detail pages (`/catalog/[category]/[product]`)** — out of scope this round. ProductCard carries summary + personalizations + add-to-offer. Adding later is non-breaking.
- **Auto-clearing offer on submit success** — rejected. User may want to brief multiple variants. Success card includes optional "Clear my offer" link instead.
- **`react-dropzone`, `zod`, `yup`, etc.** — banned by CLAUDE.md stack rules. HTML5 events + 30 lines of imperative validation cover everything.
- **Shared `<Section>` wrapper component** — banned by CLAUDE.md "no premature abstractions". Stay with the inline `mx-auto px-6 lg:px-8 py-16 lg:py-24 max-w-6xl` pattern.
- **5th footer column for Catalog/Offer** — rejected. Insert into existing Company column (rename to "Site"). Keeps the 4-column grid intact at lg.
- **Cross-tab sync via storage event** — out of scope. Single-tab is the realistic browse pattern.

---

## Verification plan

1. **Build + dev**
   - `npm run build` succeeds, all new routes show as `○ (Static)` or appropriate.
   - `npm run dev` boots, no hydration warnings.
2. **Footer socials** — Facebook, Instagram, LinkedIn, Behance render in order, hover turns each orange. `/sitemap` link present in legal column.
3. **Sitemap** — `/sitemap` lists all sections. Service and category links match content modules (data-driven).
4. **Services**
   - `/services` shows 4 cards (no leftover apparel/print/etc.).
   - `/services/personalizare-obiecte-promotionale` shows the 4 sub-techniques as cards.
   - `/services/tipar-digital` renders WITHOUT the techniques section.
   - Bad slug → Next 404.
5. **Catalog → Add to offer**
   - `/catalog` shows 6 categories. Click "Drinkware" → product grid renders.
   - Add 3 products from 2 categories. Each click → toast → button switches to "Added ✓".
   - Bottom-right dock pill appears, shows "3", "Build my offer".
   - NavBar shows "3" badge next to "Start a project".
6. **Offer page**
   - `/offer` lists items with default qty 1. Increment to 25, decrement clamps at 1, attempt 0 → clamped.
   - Remove one → count → 2; dock + nav badge update.
   - Reload → state persists (localStorage).
   - "Continue to brief" → URL becomes `/contact?from=offer&items=<base64>`.
7. **Contact form**
   - Selected Products section visible at top with 2 pills + "Edit selection →" link to /offer.
   - Dock and Toast HIDDEN on /contact.
   - Submit empty → inline errors. Submit disabled until valid.
   - Type 19 chars in Context → error "min 20 chars". 20 → error clears.
   - Drag a `.png` onto drop zone → file appears in list. Drop a 30MB file → inline error.
   - Select chips → orange-state visible.
   - Submit valid form → success state replaces form. Console shows full payload including `selectedProducts`.
8. **Edge cases**
   - `/contact` direct (no `?from=offer`) → no Selected Products section.
   - `/contact?from=offer` with items in localStorage but no URL param → form reads from storage.
   - Clear localStorage, reload `/offer` → empty state with "Browse catalog →".
   - Resize <640px → dock stays accessible bottom-right; "What happens next" stacks above form.

---

## Critical files for implementation

- `/Users/plentydev/Desktop/tgv/lib/content/services.ts` — schema change drives all services UI.
- `/Users/plentydev/Desktop/tgv/lib/content/catalog.ts` — establishes catalog data shape.
- `/Users/plentydev/Desktop/tgv/lib/offer/storage.ts` — single source of truth for storage schema.
- `/Users/plentydev/Desktop/tgv/components/OfferProvider.tsx` — state + hydration + event dispatch.
- `/Users/plentydev/Desktop/tgv/app/layout.tsx` — provider wiring + dock/toast mount.
- `/Users/plentydev/Desktop/tgv/components/contact/ContactForm.tsx` — biggest component; orchestrates URL param + storage + validation + file upload + submit.
- `/Users/plentydev/Desktop/tgv/app/contact/page.tsx` — most-visited page surface.
