/**
 * CHECKOUT.JS — Dispatch Specification & Validation
 * Strict Indian phone and PIN validation, honest text errors,
 * payment selection, order staging for the 3D processing room.
 */

import { getCartSummary, clearCart } from './cart.js';
import { formatINR, generateOrderId, showToast } from './utils.js';
import { getSessionUser } from './auth.js';

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Puducherry'
];

export function initCheckoutPage() {
  const form = document.getElementById('checkout-form');
  const summaryBox = document.getElementById('checkout-summary-box');
  const stateSelect = document.getElementById('state');

  if (!form || !summaryBox) return;

  // Populate Indian States
  if (stateSelect && stateSelect.children.length <= 1) {
    INDIAN_STATES.forEach(state => {
      const opt = document.createElement('option');
      opt.value = state;
      opt.textContent = state;
      stateSelect.appendChild(opt);
    });
  }

  // Auto-fill from active Cognito Session if logged in
  const currentUser = getSessionUser();
  if (currentUser) {
    const nameInput = document.getElementById('fullname');
    const emailInput = document.getElementById('email');
    if (nameInput && !nameInput.value) nameInput.value = currentUser.name || '';
    if (emailInput && !emailInput.value) emailInput.value = currentUser.email || '';
  }

  // Render Order Summary
  renderCheckoutSummary();

  // Attach live validation
  attachValidation(form);

  // Form Submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (validateAllFields(form)) {
      handleOrderPlacement(form);
    }
  });
}

function renderCheckoutSummary() {
  const summary = getCartSummary();
  const summaryBox = document.getElementById('checkout-summary-box');
  if (!summaryBox) return;

  if (summary.items.length === 0) {
    summaryBox.innerHTML = `
      <p style="margin-bottom: var(--space-4);">Your bag is currently empty.</p>
      <a href="index.html" class="btn btn-primary btn-full">Browse Catalogue</a>
    `;
    const submitBtn = document.getElementById('submit-order-btn');
    if (submitBtn) submitBtn.disabled = true;
    return;
  }

  const itemsHtml = summary.items.map(item => `
    <div style="display:flex; justify-content:space-between; margin-bottom: var(--space-3); font-size: 0.88rem;">
      <div>
        <span style="font-weight:600;">${item.name}</span>
        <span style="color:var(--color-ink-muted); margin-left: 6px;">x${item.quantity}</span>
      </div>
      <div class="tabular">${formatINR(item.price * item.quantity)}</div>
    </div>
  `).join('');

  summaryBox.innerHTML = `
    <div style="margin-bottom: var(--space-5); border-bottom: 1px solid var(--color-border); padding-bottom: var(--space-4);">
      ${itemsHtml}
    </div>
    <div class="invoice-line invoice-line-muted">
      <span>Subtotal</span>
      <span class="tabular">${formatINR(summary.totals.subtotal)}</span>
    </div>
    ${summary.totals.discountAmount > 0 ? `
      <div class="invoice-line" style="color: var(--color-terracotta);">
        <span>Voucher (${summary.promo.code})</span>
        <span class="tabular">-${formatINR(summary.totals.discountAmount)}</span>
      </div>
    ` : ''}
    <div class="invoice-line invoice-line-muted">
      <span>Delivery (${summary.totals.shipping === 0 ? 'Complimentary above ₹999' : 'Standard flat rate'})</span>
      <span class="tabular">${summary.totals.shipping === 0 ? 'Free' : formatINR(summary.totals.shipping)}</span>
    </div>
    <div class="invoice-line invoice-line-muted">
      <span>GST (18% Statutory Rate)</span>
      <span class="tabular">${formatINR(summary.totals.gst)}</span>
    </div>
    <div class="invoice-line total-line">
      <span>Total Payable</span>
      <span class="tabular" style="color:var(--color-terracotta);">${formatINR(summary.totals.grandTotal)}</span>
    </div>
  `;
}

function attachValidation(form) {
  const fields = ['fullname', 'email', 'mobile', 'address', 'city', 'state', 'pincode'];
  
  fields.forEach(fieldId => {
    const input = document.getElementById(fieldId);
    if (!input) return;

    input.addEventListener('input', () => {
      validateSingleField(input);
    });

    input.addEventListener('blur', () => {
      validateSingleField(input);
    });
  });
}

function validateSingleField(input) {
  const fieldId = input.id;
  const value = input.value.trim();
  let isValid = true;
  let errorMessage = '';

  switch (fieldId) {
    case 'fullname':
      if (value.length < 3) {
        isValid = false;
        errorMessage = 'Please provide your full legal name.';
      }
      break;
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        isValid = false;
        errorMessage = 'A valid email address is required for your dispatch receipt.';
      }
      break;
    case 'mobile':
      // 10-digit Indian Mobile starting with 6-9
      const mobileRegex = /^[6-9]\d{9}$/;
      if (!mobileRegex.test(value)) {
        isValid = false;
        errorMessage = 'Enter a valid 10-digit Indian mobile number.';
      }
      break;
    case 'address':
      if (value.length < 10) {
        isValid = false;
        errorMessage = 'Full street address and premise number required.';
      }
      break;
    case 'city':
      if (value.length < 2) {
        isValid = false;
        errorMessage = 'Specify your city or town.';
      }
      break;
    case 'state':
      if (!value) {
        isValid = false;
        errorMessage = 'Please select a state or territory.';
      }
      break;
    case 'pincode':
      // 6-digit Indian Postal PIN
      const pinRegex = /^\d{6}$/;
      if (!pinRegex.test(value)) {
        isValid = false;
        errorMessage = 'Enter a valid 6-digit postal PIN code.';
      }
      break;
  }

  const errorEl = document.getElementById(`${fieldId}-error`);
  if (!isValid) {
    input.classList.add('is-invalid');
    if (errorEl) errorEl.textContent = errorMessage;
  } else {
    input.classList.remove('is-invalid');
    if (errorEl) errorEl.textContent = '';
  }

  return isValid;
}

function validateAllFields(form) {
  const fields = ['fullname', 'email', 'mobile', 'address', 'city', 'state', 'pincode'];
  let allValid = true;

  fields.forEach(fieldId => {
    const input = document.getElementById(fieldId);
    if (input) {
      const valid = validateSingleField(input);
      if (!valid) allValid = false;
    }
  });

  const paymentOption = form.querySelector('input[name="paymentMethod"]:checked');
  if (!paymentOption) {
    showToast('Please select a payment method', 'error');
    allValid = false;
  }

  return allValid;
}

function handleOrderPlacement(form) {
  const summary = getCartSummary();
  if (summary.items.length === 0) {
    showToast('Your bag is empty', 'error');
    return;
  }

  const submitBtn = document.getElementById('submit-order-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Placing your order...';
  }

  const paymentEl = form.querySelector('input[name="paymentMethod"]:checked');
  const paymentMethod = paymentEl ? paymentEl.value : 'UPI';

  // Live AWS API Gateway Endpoint
  const AWS_API_GATEWAY_URL = 'https://rxo2vbnavg.execute-api.us-east-1.amazonaws.com/ProcessOrderFunction';

  // Construct staged pending order
  const pendingOrder = {
    orderId: generateOrderId(),
    createdAt: new Date().toISOString(),
    customer: {
      fullname: document.getElementById('fullname').value.trim(),
      email: document.getElementById('email').value.trim(),
      mobile: document.getElementById('mobile').value.trim(),
      address: document.getElementById('address').value.trim(),
      city: document.getElementById('city').value.trim(),
      state: document.getElementById('state').value,
      pincode: document.getElementById('pincode').value.trim()
    },
    paymentMethod: paymentMethod,
    items: summary.items,
    totals: summary.totals,
    estimatedDelivery: getEstimatedDeliveryDate()
  };

  sessionStorage.setItem('pending_order', JSON.stringify(pendingOrder));

  // Asynchronously dispatch order payload to AWS API Gateway -> Lambda -> DynamoDB -> SNS -> SES
  try {
    fetch(AWS_API_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(pendingOrder)
    }).then(res => res.json()).then(result => {
      console.log('AWS Serverless Order Processed:', result);
      if (result && result.orderId) {
        pendingOrder.orderId = result.orderId;
        sessionStorage.setItem('pending_order', JSON.stringify(pendingOrder));
      }
    }).catch(err => {
      console.warn('API Gateway dispatch note:', err);
    });
  } catch (apiErr) {
    console.warn('AWS Dispatch error:', apiErr);
  }

  // Redirect to 3D virtual animation processing page
  setTimeout(() => {
    window.location.href = 'processing.html';
  }, 450);
}

function getEstimatedDeliveryDate() {
  const date = new Date();
  date.setDate(date.getDate() + 4);
  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}
