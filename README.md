# KILN & CLAY — Editorial Print-Inspired E-Commerce Platform

An independent, print-inspired storefront designed with a custom art-directed identity. Built with semantic HTML5, modern CSS3 (Flexbox, Grid, CSS custom properties), vanilla ES6+ modules, and a calm, tactile Three.js (r160) paper-craft packing studio.

---

## 1. Design Direction: Unique, Human & Print-Inspired

Unlike typical AI-generated interfaces or generic bootstrap templates, this storefront adheres to strict art-direction principles:
* **Editorial Paper Palette**:
  - Background: Warm unbleached paper newsprint (`#F4EFE6`)
  - Typography: Dense typographic charcoal-ink (`#1B1A17`)
  - Primary Accent: Terracotta ink (`#B5472B`)
  - Secondary Accents: Muted olive (`#5A6351`) and structural paper tint (`#ECE5D8`)
* **Banned Elements**:
  - No dark navy/black voids
  - No purple-to-blue or pink gradients
  - No neon glow or bloom effects
  - No glassmorphism or floating blurred blobs
  - No card drop shadows
* **Typography Pairing**:
  - Headings: **Fraunces** (characterful high-contrast optical serif)
  - Body: **Instrument Sans** (crisp geometric grotesque)
  - Tabular numerals (`tabular-nums`) for currency and order references
* **Zero Icons Standard**:
  - Completely free of icon fonts, SVG icon sets, emoji, or pictograms.
  - All communication is delivered via typography, numbers, hairlines, and words ("Bag [3]", "Remove", "Confirmed").

---

## 2. Currency & Financial Specification (Indian Rupees — ₹)

* Every price across the platform is displayed exclusively in Indian Rupees (`₹` INR) using the single pure helper:
  ```js
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount)
  ```
* **Shipping Rules**: Free delivery above ₹999; otherwise flat ₹49.
* **Statutory Taxes**: 18% standard Indian GST computed and displayed itemized on the packing invoice.
* **Promo Vouchers**: Supports promo codes `STUDIO10` (10% off) and `EDITION15` (15% off).

---

## 3. Project Structure

```
project/
├── index.html            -> Home / asymmetric catalogue of editions
├── cart.html             -> Bag review & printed packing manifest
├── checkout.html         -> Indian dispatch specification & settlement form
├── processing.html       -> 3D tactile paper-craft studio animation
├── confirmation.html     -> Order confirmed page with ink-drawn rule & receipt
├── css/
│   ├── variables.css     -> Editorial paper, ink, terracotta design tokens
│   ├── base.css          -> Typography, reset, tabular numerals, focus states
│   ├── components.css    -> Buttons, cards, forms, masthead, toasts (zero icons)
│   ├── pages.css         -> Catalogue grid, invoice tables, checkout layouts
│   └── processing.css    -> Tactile studio HUD, 2px progress bar, paper-wipe
├── js/
│   ├── app.js            -> Masthead bag counter, catalogue filters, router
│   ├── products.js       -> 8 curated studio physical goods with duotone SVG art
│   ├── cart.js           -> LocalStorage bag state, voucher logic, totals
│   ├── checkout.js       -> 10-digit Indian mobile & 6-digit PIN validation
│   ├── scene3d.js        -> Three.js (r160) kraft box, falling cards, ribbon
│   ├── processing.js     -> Step timeline (01-04), microcopy, paper-wipe redirect
│   ├── confirmation.js   -> Order summary display, print receipt trigger
│   └── utils.js          -> formatINR(), calculateTotals(), generateOrderId()
└── README.md
```

---

## 4. Key Pages & Features

1. **Home (`index.html`)**:
   - Masthead-style top bar and brand mark.
   - Large serif headline and editorial manifesto.
   - Filterable catalogue grid (Ceramics, Textiles, Objects, Paper) with text search.
   - Product cards featuring duotone vector artwork, edition numbering, tabular ₹ prices, and "Add to bag" text links.

2. **Bag / Cart (`cart.html`)**:
   - Laid out like a printed warehouse packing manifest.
   - Item controls: `+` and `-` quantity steppers, text `Remove` button.
   - Promotional voucher code validation (`STUDIO10`, `EDITION15`).
   - Itemized invoice breakdown with subtotal, statutory 18% GST, shipping, and grand total.

3. **Dispatch Specification (`checkout.html`)**:
   - Numbered sections (01 Recipient, 02 Physical Premises, 03 Settlement Protocol).
   - Validation for 10-digit Indian mobile numbers (`^[6-9]\d{9}$`) and 6-digit PIN codes (`^\d{6}$`).
   - Complete list of Indian States and Union Territories.
   - Text payment options: UPI & Instant Netbanking, Credit or Debit Card, Cash on Delivery.
   - Live invoice sidebar and "Place order" button with loading state.

4. **3D Virtual Animation Studio (`processing.html`)**:
   - Ambient paper-craft packing studio built in Three.js (r160) with soft real shadow mapping.
   - Matte kraft paper box with folding flaps, falling paper cards, terracotta ribbon seal, and tactile bounce.
   - Mouse/touch parallax response.
   - Flat paper HUD with oversized serif percentage, 2px progress bar, quiet typographic loader strip, and struck-through step tracker.
   - Clean terracotta paper-wipe transition into confirmation.
   - Pure CSS paper-folding fallback if WebGL is unavailable.

5. **Confirmation (`confirmation.html`)**:
   - Oversized serif headline: "Your order is confirmed."
   - Animated ink-drawn underline rule (no checkmark icons).
   - Large unique order reference ID (e.g. `ORD-2026-48213`).
   - Customer dispatch address and scheduled delivery date.
   - Itemized manifest table and print-ready stylesheet for `Print receipt`.

---

## 5. How to Run Locally

You can serve the project using any static file server:

### Option A: Using `npx serve` (Node.js)
```bash
npx serve .
```
Then open `http://localhost:3000` in your web browser.

### Option B: Using Python
```bash
python -m http.server 8000
```
Then open `http://localhost:8000` in your web browser.

### Option C: VS Code Live Server
Right-click `index.html` and choose **"Open with Live Server"**.
