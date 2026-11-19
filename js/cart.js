/**
 * CART.JS — Editorial Bag Management
 * Handles localStorage state, item quantities, discounts, and dispatch counts.
 * Zero emojis, zero icon dependencies.
 */

import { PRODUCTS, getProductById } from './products.js';
import { calculateTotals, showToast } from './utils.js';

const CART_STORAGE_KEY = 'editorial_cart_items_v2';
const PROMO_STORAGE_KEY = 'editorial_cart_promo_v2';

const VALID_PROMOS = {
  'STUDIO10': 10,
  'EDITION15': 15,
  'ATELIER20': 20
};

export function getCartItems() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    const items = raw ? JSON.parse(raw) : [];
    return items.map(item => {
      const prod = getProductById(item.id);
      if (prod) {
        item.image = prod.image;
      }
      return item;
    });
  } catch (e) {
    console.error('Failed to parse cart items:', e);
    return [];
  }
}

export function saveCartItems(items) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { items } }));
  } catch (e) {
    console.error('Failed to save cart:', e);
  }
}

export function addToCart(productId, quantity = 1) {
  const product = getProductById(productId);
  if (!product) return false;

  const currentItems = getCartItems();
  const existingIndex = currentItems.findIndex(i => i.id === productId);

  if (existingIndex > -1) {
    currentItems[existingIndex].quantity += quantity;
  } else {
    currentItems.push({
      id: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
      editionNumber: product.editionNumber,
      image: product.image,
      quantity: quantity
    });
  }

  saveCartItems(currentItems);
  showToast(`Added “${product.name}” to bag`);
  return true;
}

export function updateQuantity(productId, quantity) {
  let currentItems = getCartItems();
  if (quantity <= 0) {
    currentItems = currentItems.filter(i => i.id !== productId);
  } else {
    const item = currentItems.find(i => i.id === productId);
    if (item) {
      item.quantity = quantity;
    }
  }
  saveCartItems(currentItems);
}

export function removeFromCart(productId) {
  const currentItems = getCartItems().filter(i => i.id !== productId);
  saveCartItems(currentItems);
  showToast('Item removed from bag');
}

export function clearCart() {
  localStorage.removeItem(CART_STORAGE_KEY);
  localStorage.removeItem(PROMO_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { items: [] } }));
}

export function getAppliedPromo() {
  try {
    return JSON.parse(localStorage.getItem(PROMO_STORAGE_KEY)) || null;
  } catch (e) {
    return null;
  }
}

export function applyPromoCode(code) {
  const cleanCode = (code || '').trim().toUpperCase();
  if (VALID_PROMOS[cleanCode]) {
    const promoData = { code: cleanCode, discount: VALID_PROMOS[cleanCode] };
    localStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify(promoData));
    showToast(`Promo applied: ${cleanCode} (${promoData.discount}% off)`);
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { items: getCartItems() } }));
    return { success: true, discount: promoData.discount };
  } else {
    showToast('Invalid voucher code. Try STUDIO10 or EDITION15', 'error');
    return { success: false, message: 'Invalid code' };
  }
}

export function removePromoCode() {
  localStorage.removeItem(PROMO_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { items: getCartItems() } }));
}

export function getCartSummary() {
  const items = getCartItems();
  const promo = getAppliedPromo();
  const discountPercent = promo ? promo.discount : 0;
  return {
    items,
    promo,
    totals: calculateTotals(items, discountPercent)
  };
}
