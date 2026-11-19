/**
 * APP.JS — Editorial Storefront Initializer & Page Controller
 * Masthead counter, catalog rendering, bag invoice updates, search filters.
 * No icon dependencies, pure semantic DOM.
 */

import { PRODUCTS, filterProducts } from './products.js';
import { addToCart, getCartSummary, updateQuantity, removeFromCart, applyPromoCode, removePromoCode } from './cart.js';
import { formatINR, showToast } from './utils.js';
import { initCheckoutPage } from './checkout.js';

document.addEventListener('DOMContentLoaded', () => {
  initNavbarBagCount();
  window.addEventListener('cartUpdated', initNavbarBagCount);

  const page = document.body.dataset.page;
  if (page === 'home') {
    initHomePage();
  } else if (page === 'cart') {
    initCartPage();
  } else if (page === 'checkout') {
    initCheckoutPage();
  }
});

/**
 * Update Masthead Bag Count across all pages: e.g. "Bag (3)"
 */
export function initNavbarBagCount() {
  const countEls = document.querySelectorAll('.bag-count');
  const summary = getCartSummary();
  countEls.forEach(el => {
    el.textContent = `[${summary.totals.itemCount}]`;
  });
}

/**
 * HOME PAGE: Catalog Filtering, Search, and Editorial Grid
 */
function initHomePage() {
  const grid = document.getElementById('products-grid');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const searchInput = document.getElementById('catalog-search');

  let activeCategory = 'all';
  let searchQuery = '';

  function renderGrid() {
    if (!grid) return;
    const items = filterProducts(activeCategory, searchQuery);

    if (items.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: var(--space-10) 0; text-align: center;">
          <p style="font-size: 1.1rem; color: var(--color-ink-muted);">No studio editions match your criteria.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = items.map(product => `
      <article class="product-card">
        <div class="product-image-container">
          <span class="product-badge-number">ED. ${product.editionNumber}</span>
          ${product.image.startsWith('data:image/svg+xml') 
            ? `<img src="${product.image}" alt="${product.name}" loading="lazy" />` 
            : `<img src="${product.image}" alt="${product.name}" loading="lazy" />`}
        </div>
        <div class="product-meta">
          <span class="product-category">${product.category}</span>
          <span class="product-rating-text">Rated ${product.rating.toFixed(1)}/5</span>
        </div>
        <h3 class="product-title">${product.name}</h3>
        <p class="product-description">${product.description}</p>
        <div class="product-footer">
          <span class="product-price tabular">${formatINR(product.price)}</span>
          <button class="product-add-link" data-id="${product.id}" type="button">Add to bag</button>
        </div>
      </article>
    `).join('');

    // Attach Add to Bag listeners
    grid.querySelectorAll('.product-add-link').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        addToCart(id, 1);
      });
    });
  }

  // Filter category buttons
  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterBtns.forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      activeCategory = e.currentTarget.dataset.category || 'all';
      renderGrid();
    });
  });

  // Search input
  if (searchInput) {
    let timeout = null;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        searchQuery = e.target.value.trim();
        renderGrid();
      }, 150);
    });
  }

  renderGrid();
}

/**
 * BAG / CART PAGE: Printed Manifest Table & Invoice Totals
 */
function initCartPage() {
  const container = document.getElementById('cart-content-container');
  if (!container) return;

  function renderCartView() {
    const summary = getCartSummary();

    if (summary.items.length === 0) {
      container.innerHTML = `
        <div class="empty-bag-notice">
          <p class="eyebrow-label" style="margin-bottom: var(--space-2);">Manifest Empty</p>
          <h2 style="font-size: 2.2rem; margin-bottom: var(--space-4);">Your bag contains no objects.</h2>
          <p style="margin-bottom: var(--space-6);">Explore our current editions to commission studio crafts.</p>
          <a href="index.html" class="btn btn-primary">Return to Catalogue</a>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="cart-layout-grid">
        <!-- Left: Packing Manifest Table -->
        <div class="manifest-section">
          <table class="manifest-table">
            <thead>
              <tr>
                <th style="width: 45%;">Edition</th>
                <th style="width: 20%; text-align: center;">Quantity</th>
                <th style="width: 15%; text-align: right;">Unit Price</th>
                <th style="width: 20%; text-align: right;">Line Total</th>
              </tr>
            </thead>
            <tbody>
              ${summary.items.map(item => `
                <tr>
                  <td>
                    <div class="manifest-item-info">
                      <div class="manifest-item-img">
                        <img src="${item.image}" alt="${item.name}" />
                      </div>
                      <div>
                        <div class="manifest-item-name">${item.name}</div>
                        <div class="manifest-item-category">${item.category}</div>
                        <button class="manifest-remove-btn" data-remove-id="${item.id}" type="button" style="margin-top: 6px;">Remove</button>
                      </div>
                    </div>
                  </td>
                  <td style="text-align: center;">
                    <div class="qty-control">
                      <button class="qty-btn" data-action="dec" data-id="${item.id}" type="button" aria-label="Decrease quantity">-</button>
                      <span class="qty-value">${item.quantity}</span>
                      <button class="qty-btn" data-action="inc" data-id="${item.id}" type="button" aria-label="Increase quantity">+</button>
                    </div>
                  </td>
                  <td style="text-align: right;" class="tabular">
                    ${formatINR(item.price)}
                  </td>
                  <td style="text-align: right; font-weight: 600;" class="tabular">
                    ${formatINR(item.price * item.quantity)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="margin-top: var(--space-6); display: flex; justify-content: space-between; align-items: center;">
            <a href="index.html" class="btn btn-secondary" style="font-size: 0.78rem;">Continue Browsing</a>
          </div>
        </div>

        <!-- Right: Invoice Summary -->
        <div class="invoice-summary-box">
          <div class="invoice-summary-title">
            <span>Invoice Estimate</span>
            <span>Tax Inclusive</span>
          </div>

          <div class="invoice-line">
            <span>Subtotal (${summary.totals.itemCount} items)</span>
            <span class="tabular">${formatINR(summary.totals.subtotal)}</span>
          </div>

          ${summary.totals.discountAmount > 0 ? `
            <div class="invoice-line" style="color: var(--color-terracotta);">
              <span>Voucher Applied (${summary.promo.code})</span>
              <span class="tabular">-${formatINR(summary.totals.discountAmount)}</span>
            </div>
          ` : ''}

          <div class="invoice-line invoice-line-muted">
            <span>Estimated Shipping</span>
            <span class="tabular">${summary.totals.shipping === 0 ? 'Free' : formatINR(summary.totals.shipping)}</span>
          </div>

          <div class="invoice-line invoice-line-muted">
            <span>GST (18% Statutory Rate)</span>
            <span class="tabular">${formatINR(summary.totals.gst)}</span>
          </div>

          <div class="invoice-line total-line">
            <span>Grand Total</span>
            <span class="tabular" style="color: var(--color-terracotta);">${formatINR(summary.totals.grandTotal)}</span>
          </div>

          <!-- Promo Voucher Input -->
          <div style="margin-top: var(--space-6); border-top: 1px solid var(--color-border); padding-top: var(--space-4);">
            <div class="form-label">Promotional Voucher</div>
            <div class="promo-form">
              <input type="text" id="promo-code-input" class="promo-input" placeholder="e.g. STUDIO10" value="${summary.promo ? summary.promo.code : ''}" />
              <button id="apply-promo-btn" class="btn btn-secondary" type="button" style="padding: 8px 16px;">${summary.promo ? 'Remove' : 'Apply'}</button>
            </div>
            <p style="font-size: 0.74rem; color: var(--color-ink-light);">Codes available: STUDIO10 (10%), EDITION15 (15%)</p>
          </div>

          <div style="margin-top: var(--space-6);">
            <a href="checkout.html" class="btn btn-primary btn-full">Proceed to Dispatch</a>
          </div>
        </div>
      </div>
    `;

    // Quantity events
    container.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const action = e.currentTarget.dataset.action;
        const item = summary.items.find(i => i.id === id);
        if (!item) return;

        if (action === 'inc') {
          updateQuantity(id, item.quantity + 1);
        } else if (action === 'dec') {
          updateQuantity(id, item.quantity - 1);
        }
        renderCartView();
      });
    });

    // Remove buttons
    container.querySelectorAll('.manifest-remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.removeId;
        removeFromCart(id);
        renderCartView();
      });
    });

    // Promo button
    const promoBtn = document.getElementById('apply-promo-btn');
    const promoInput = document.getElementById('promo-code-input');
    if (promoBtn && promoInput) {
      promoBtn.addEventListener('click', () => {
        if (summary.promo) {
          removePromoCode();
          renderCartView();
        } else {
          const code = promoInput.value.trim();
          if (code) {
            applyPromoCode(code);
            renderCartView();
          }
        }
      });
    }
  }

  window.addEventListener('cartUpdated', renderCartView);
  renderCartView();
}
