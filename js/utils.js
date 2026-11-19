/**
 * UTILS.JS — Editorial Print E-Commerce Utility Functions
 * Single source of truth for Indian Rupee formatting, order ID generation,
 * invoice financial calculations, and text-only notifications.
 */

/**
 * Format any numerical amount strictly into Indian Rupees (INR)
 * e.g., 124999 -> ₹1,24,999
 */
export function formatINR(amount) {
  const numeric = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(numeric);
}

/**
 * Calculate full invoice totals
 * Free delivery if subtotal > ₹999, otherwise ₹49 flat shipping.
 * 18% standard GST included/applied.
 */
export function calculateTotals(items, discountPercent = 0) {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = Math.round(subtotal * (discountPercent / 100));
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  
  // Free shipping above ₹999, otherwise ₹49
  const shipping = subtotal > 0 ? (discountedSubtotal >= 999 ? 0 : 49) : 0;
  
  // Standard Indian GST (18% applied to discounted subtotal)
  const gst = Math.round(discountedSubtotal * 0.18);
  const grandTotal = discountedSubtotal + shipping + gst;

  return {
    subtotal,
    discountAmount,
    discountedSubtotal,
    shipping,
    gst,
    grandTotal,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0)
  };
}

/**
 * Generate an editorial catalogue Order Reference ID
 * e.g. ORD-2026-48213
 */
export function generateOrderId() {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  return `ORD-${year}-${randomSuffix}`;
}

/**
 * Display a restrained, typographic toast message (zero icons, zero emoji)
 */
export function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 200);
  }, 3200);
}
