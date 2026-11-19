/**
 * CONFIRMATION.JS — Order Manifest & Print Receipt
 * Editorial layout, ink-drawn rule animation, zero icons or emojis.
 */

import { formatINR } from './utils.js';

export function initConfirmationPage() {
  const orderIdEl = document.getElementById('conf-order-id');
  const dateEl = document.getElementById('conf-date');
  const deliveryDateEl = document.getElementById('conf-delivery-date');
  const customerNameEl = document.getElementById('conf-customer-name');
  const addressEl = document.getElementById('conf-address');
  const paymentMethodEl = document.getElementById('conf-payment-method');
  const itemsContainer = document.getElementById('conf-items-list');
  const totalEl = document.getElementById('conf-total-paid');
  const subtotalEl = document.getElementById('conf-subtotal');
  const shippingEl = document.getElementById('conf-shipping');
  const gstEl = document.getElementById('conf-gst');
  const discountRow = document.getElementById('conf-discount-row');
  const discountEl = document.getElementById('conf-discount');
  const printBtn = document.getElementById('print-receipt-btn');

  // Load confirmed order
  let order = null;
  try {
    const raw = sessionStorage.getItem('confirmed_order');
    if (raw) order = JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load order:', e);
  }

  // Graceful fallback dummy if visited directly
  if (!order) {
    order = {
      orderId: 'ORD-2026-78419',
      createdAt: new Date().toISOString(),
      customer: {
        fullname: 'Ananya Sharma',
        email: 'ananya.sharma@studio.in',
        mobile: '9845012345',
        address: '42 Lavelle Road, Richmond Town',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001'
      },
      paymentMethod: 'UPI (Instant Settlement)',
      items: [
        { name: 'Glazed Terracotta Vessel', category: 'Ceramics', price: 3200, quantity: 1 },
        { name: 'Archival Ledger Journal', category: 'Paper', price: 1250, quantity: 1 }
      ],
      totals: {
        subtotal: 4450,
        discountAmount: 0,
        shipping: 0,
        gst: 801,
        grandTotal: 5251
      },
      estimatedDelivery: 'Thursday, 26 November 2026'
    };
  }

  // Render text data
  if (orderIdEl) orderIdEl.textContent = order.orderId;
  if (dateEl) {
    dateEl.textContent = new Date(order.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
  if (deliveryDateEl) deliveryDateEl.textContent = order.estimatedDelivery;
  if (customerNameEl) customerNameEl.textContent = order.customer.fullname;
  if (addressEl) {
    addressEl.innerHTML = `
      ${order.customer.address}<br>
      ${order.customer.city}, ${order.customer.state} — ${order.customer.pincode}<br>
      Phone: +91 ${order.customer.mobile}
    `;
  }
  if (paymentMethodEl) paymentMethodEl.textContent = order.paymentMethod;

  // Render items table
  if (itemsContainer && order.items) {
    itemsContainer.innerHTML = order.items.map(item => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid var(--color-border);">
          <div style="font-family: var(--font-serif); font-size: 1.05rem; color: var(--color-ink);">${item.name}</div>
          <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-olive);">${item.category || 'Curated Object'}</div>
        </td>
        <td style="padding: 12px 0; text-align: center; border-bottom: 1px solid var(--color-border); font-variant-numeric: tabular-nums;">${item.quantity}</td>
        <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid var(--color-border); font-variant-numeric: tabular-nums;">${formatINR(item.price)}</td>
        <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid var(--color-border); font-weight: 600; font-variant-numeric: tabular-nums;">${formatINR(item.price * item.quantity)}</td>
      </tr>
    `).join('');
  }

  // Financial breakdowns
  if (subtotalEl) subtotalEl.textContent = formatINR(order.totals.subtotal);
  if (shippingEl) shippingEl.textContent = order.totals.shipping === 0 ? 'Free' : formatINR(order.totals.shipping);
  if (gstEl) gstEl.textContent = formatINR(order.totals.gst);
  if (totalEl) totalEl.textContent = formatINR(order.totals.grandTotal);

  if (discountRow && discountEl) {
    if (order.totals.discountAmount > 0) {
      discountRow.style.display = 'flex';
      discountEl.textContent = `-${formatINR(order.totals.discountAmount)}`;
    } else {
      discountRow.style.display = 'none';
    }
  }

  // Print Receipt handler
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initConfirmationPage);
} else {
  initConfirmationPage();
}
