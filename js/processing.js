/**
 * PROCESSING.JS — Paper Studio Orchestration & Flow Control
 * Drives 3D paper studio canvas, typographic HUD updates, honest microcopy,
 * and the terracotta paper-wipe transition.
 */

import { PaperCraftStudio } from './scene3d.js';
import { clearCart } from './cart.js';

const STATUS_STEPS = [
  {
    range: [0, 25],
    stepIndex: 0,
    text: '01 Verifying payment',
    microcopy: 'Authorizing payment and issuing transaction token'
  },
  {
    range: [25, 50],
    stepIndex: 1,
    text: '02 Confirming stock',
    microcopy: 'Reserving studio edition inventory and printing invoice'
  },
  {
    range: [50, 78],
    stepIndex: 2,
    text: '03 Packing parcel',
    microcopy: 'Wrapping objects in unbleached kraft paper and sealing box'
  },
  {
    range: [78, 100],
    stepIndex: 3,
    text: '04 Ready for courier',
    microcopy: 'Affixing postal dispatch tag and scheduling local pickup'
  }
];

export function initProcessingPage() {
  const percentageEl = document.getElementById('hud-percentage-val');
  const barFillEl = document.getElementById('hud-bar-fill');
  const microcopyEl = document.getElementById('hud-microcopy');
  const stepItems = document.querySelectorAll('.hud-step-item');
  const orderRefEl = document.getElementById('hud-order-ref');
  const fallbackStudio = document.getElementById('paper-studio-fallback');
  const paperWipe = document.getElementById('paper-wipe-overlay');

  // Verify pending order
  let pendingOrder = null;
  try {
    const raw = sessionStorage.getItem('pending_order');
    if (raw) pendingOrder = JSON.parse(raw);
  } catch (e) {
    console.error('No pending order:', e);
  }

  if (orderRefEl && pendingOrder) {
    orderRefEl.textContent = pendingOrder.orderId;
  }

  // Initialize Three.js Studio
  const studio = new PaperCraftStudio('canvas3d-container');
  const webGLSuccess = studio.init();

  if (!webGLSuccess && fallbackStudio) {
    fallbackStudio.style.display = 'block';
  }

  // Animation timeline configuration (approx 5.5 seconds total)
  const totalDuration = 5500;
  const startTime = performance.now();

  function updateHUD(progressPercent) {
    const rounded = Math.min(100, Math.floor(progressPercent));
    if (percentageEl) percentageEl.textContent = `${rounded}%`;
    if (barFillEl) barFillEl.style.width = `${progressPercent}%`;

    // Match status step
    const currentStep = STATUS_STEPS.find(s => 
      progressPercent >= s.range[0] && progressPercent <= s.range[1]
    ) || STATUS_STEPS[STATUS_STEPS.length - 1];

    if (microcopyEl && microcopyEl.textContent !== currentStep.microcopy) {
      microcopyEl.textContent = currentStep.microcopy;
    }

    // Step tracker styling: struck-through when complete, underlined when active
    stepItems.forEach((item, idx) => {
      if (idx < currentStep.stepIndex) {
        item.classList.remove('is-active');
        item.classList.add('is-done');
      } else if (idx === currentStep.stepIndex) {
        item.classList.add('is-active');
        item.classList.remove('is-done');
      } else {
        item.classList.remove('is-active', 'is-done');
      }
    });

    // Update 3D studio progress
    if (webGLSuccess) {
      studio.updateProgress(progressPercent);
    }
  }

  function frame(now) {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / totalDuration);
    // Smooth easeInOutQuad easing
    const easeProgress = progress < 0.5 
      ? 2 * progress * progress 
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    
    const percent = easeProgress * 100;
    updateHUD(percent);

    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      completeProcessing();
    }
  }

  function completeProcessing() {
    // Commit order from pending to confirmed
    if (pendingOrder) {
      sessionStorage.setItem('confirmed_order', JSON.stringify(pendingOrder));
      sessionStorage.removeItem('pending_order');
    }
    clearCart();

    // Trigger terracotta paper-wipe transition
    if (paperWipe) {
      paperWipe.classList.add('is-active');
    }

    setTimeout(() => {
      studio.dispose();
      window.location.href = 'confirmation.html';
    }, 550);
  }

  requestAnimationFrame(frame);
}

// Auto-run if on processing.html
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProcessingPage);
} else {
  initProcessingPage();
}
