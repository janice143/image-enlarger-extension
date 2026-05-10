// Global settings with defaults
let settings = {
  displayWidth: 800,
  hoverDelay: 100,
  includedDomains: ['*']
};

// Load settings from storage
chrome.storage.sync.get('imageEnlargerSettings', (data) => {
  if (data.imageEnlargerSettings) {
    settings = { ...settings, ...data.imageEnlargerSettings };
  }
  // Ensure displayWidth is always a number (fallback to 800)
  settings.displayWidth = Number(settings.displayWidth) || 800;
  // Ensure includedDomains is an array with at least ['*']
  if (!Array.isArray(settings.includedDomains)) {
    settings.includedDomains = ['*'];
  }
  initializeEnlarger();
});

// Check if current domain is in the included list
function isDomainEnabled() {
  const domains = Array.isArray(settings.includedDomains) ? settings.includedDomains : ['*'];
  if (domains.length === 0 || domains.includes('*')) return true;
  const hostname = window.location.hostname.toLowerCase();
  return domains.some(d => {
    const domain = d.toLowerCase();
    if (domain.startsWith('.')) {
      return hostname.endsWith(domain) || hostname === domain.slice(1);
    }
    return hostname === domain || hostname.endsWith('.' + domain);
  });
}

// Create overlay element for enlarged content
const overlay = document.createElement('div');
overlay.id = 'image-enlarger-overlay';
overlay.style.display = 'none';
document.body.appendChild(overlay);

let hoverTimer = null;
let currentTarget = null;
let lastEvent = null;
let lastPositionUpdate = 0;
const POSITION_THROTTLE_MS = 50;

function initializeEnlarger() {
  if (!isDomainEnabled()) return;

  // Add event listeners for images
  document.querySelectorAll('img').forEach((img) => {
    processNewElement(img);
  });

  // Handle dynamically added content
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            // Element node
            processNewElement(node);
          }
        });
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Listen for window resize to reposition overlay if needed
  window.addEventListener('resize', () => {
    if (overlay.style.display !== 'none' && lastEvent) {
      positionOverlaySmartly(lastEvent);
    }
  });

  // Listen for scroll events to reposition overlay
  window.addEventListener(
    'scroll',
    () => {
      if (overlay.style.display !== 'none' && lastEvent) {
        positionOverlaySmartly(lastEvent);
      }
    },
    { passive: true }
  );
}

function shouldProcessImage(img) {
  // Don't process images inside our overlay
  if (img.closest('#image-enlarger-overlay')) return false;
  return true;
}

function attachImageListeners(img) {
  img.addEventListener('mouseenter', handleMouseEnter);
  img.addEventListener('mouseleave', handleMouseLeave);
  img.addEventListener('mousemove', handleMouseMove);
}

function processNewElement(element) {
  if (settings.enlargeImages && element.tagName === 'IMG') {
    if (shouldProcessImage(element)) {
      const w = element.width || element.offsetWidth;
      const h = element.height || element.offsetHeight;

      if (w >= 30 && h >= 30) {
        attachImageListeners(element);
      } else if (w === 0 || h === 0) {
        // Lazy-loaded: wait for load/error, then attach if still valid
        const handler = () => {
          element.removeEventListener('load', handler);
          element.removeEventListener('error', handler);
          if (shouldProcessImage(element)) attachImageListeners(element);
        };
        element.addEventListener('load', handler);
        element.addEventListener('error', handler);
      }
    }
  } else if (element.tagName === 'A') {
    // Process link children but don't attach link listeners
    element.querySelectorAll('img, a').forEach((el) => {
      processNewElement(el);
    });
  }
}

function isImageLink(url) {
  return /\.(jpe?g|png|gif|webp|svg|bmp)(\?.*)?$/i.test(url);
}

function handleMouseEnter(event) {
  // Ignore if mouse is over the overlay itself
  if (event.target.closest('#image-enlarger-overlay')) return;

  lastEvent = event;
  currentTarget = event.target;

  // Clear any existing timer
  if (hoverTimer) {
    clearTimeout(hoverTimer);
  }

  // Set timer for hover delay
  hoverTimer = setTimeout(() => {
    if (event.target.tagName === 'IMG') {
      showEnlargedImage(event.target, event);
    }
  }, settings.hoverDelay);
}

function handleMouseLeave() {
  if (hoverTimer) {
    clearTimeout(hoverTimer);
    hoverTimer = null;
  }
  hideOverlay();
  currentTarget = null;
  lastEvent = null;
}

function handleMouseMove(event) {
  lastEvent = event;
  if (overlay.style.display !== 'none') {
    positionOverlaySmartly(event);
  }
}

function showEnlargedImage(img, event) {
  // Create enlarged image
  const enlargedImg = document.createElement('img');
  enlargedImg.src = img.src;

  // Add loading indicator
  overlay.innerHTML = '<div style="background:#f5f5f5; color:#333; text-align:center; padding:20px; border-radius:4px;">Loading...</div>';
  overlay.style.display = 'block';

  // Position the overlay initially
  positionOverlaySmartly(event);

  // When image loads, update the overlay
  enlargedImg.onload = function () {
    // Clear overlay and add enlarged image
    overlay.innerHTML = '';

    // Calculate dimensions to fit displayWidth while maintaining aspect ratio
    const originalWidth = enlargedImg.naturalWidth;
    const originalHeight = enlargedImg.naturalHeight;
    const ratio = originalHeight / originalWidth;

    // Always display at displayWidth (scale up small images, scale down large ones)
    const width = settings.displayWidth;
    const height = width * ratio;

    // Apply via style so CSS custom property can override if needed
    enlargedImg.style.width = `${width}px`;
    enlargedImg.style.height = `${height}px`;

    overlay.appendChild(enlargedImg);

    // Reposition after image is loaded
    positionOverlaySmartly(event);
  };

  // Handle image load errors
  enlargedImg.onerror = function () {
    overlay.innerHTML = '<div style="background:#f5f5f5; color:#333; text-align:center; padding:20px; border-radius:4px;">Error loading image</div>';
  };
}

function positionOverlaySmartly(event) {
  // Throttle position updates to avoid performance issues
  const now = Date.now();
  if (now - lastPositionUpdate < POSITION_THROTTLE_MS) return;
  lastPositionUpdate = now;

  // Get viewport dimensions
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Get scroll position
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  // Get target element dimensions and position
  const targetRect = currentTarget
    ? currentTarget.getBoundingClientRect()
    : null;

  // Wait for overlay to have dimensions
  requestAnimationFrame(() => {
    // Get overlay dimensions
    const overlayWidth = overlay.offsetWidth;
    const overlayHeight = overlay.offsetHeight;

    // Default position variables
    let left, top;

    // Smart positioning logic
    if (targetRect) {
      // Calculate available space in different directions
      const spaceBelow = viewportHeight - (targetRect.bottom + 10);
      const spaceRight = viewportWidth - (targetRect.right + 10);
      const spaceLeft = targetRect.left - 10;
      const spaceAbove = targetRect.top - 10;

      // PRIORITY 1: Position below the target (preferred position)
      if (spaceBelow >= Math.min(overlayHeight, viewportHeight - 20)) {
        top = targetRect.bottom + 10;
        // Center horizontally with the target
        left = targetRect.left + targetRect.width / 2 - overlayWidth / 2;
      }
      // PRIORITY 2: Position to the right
      else if (spaceRight >= Math.min(overlayWidth, viewportHeight - 20)) {
        left = targetRect.right + 10;
        // Center vertically with the target
        top = targetRect.top + targetRect.height / 2 - overlayHeight / 2;
      }
      // PRIORITY 3: Position to the left
      else if (spaceLeft >= Math.min(overlayWidth, viewportHeight - 20)) {
        left = targetRect.left - overlayWidth - 10;
        // Center vertically with the target
        top = targetRect.top + targetRect.height / 2 - overlayHeight / 2;
      }
      // PRIORITY 4: Position above
      else if (spaceAbove >= Math.min(overlayHeight, viewportHeight - 20)) {
        top = targetRect.top - overlayHeight - 10;
        // Center horizontally with the target
        left = targetRect.left + targetRect.width / 2 - overlayWidth / 2;
      }
      // PRIORITY 5: If no good position, use viewport-based positioning
      else {
        // Position at top of viewport to ensure visibility
        top = scrollY + 10;
        // Center horizontally
        left = scrollX + (viewportWidth - overlayWidth) / 2;
      }
    } else {
      // Fallback to cursor position if no target
      const x = event.clientX;
      const y = event.clientY;
      left = x + 20;
      top = y + 20;
    }

    // Final bounds checking to ensure overlay stays within viewport
    if (left + overlayWidth > scrollX + viewportWidth) {
      left = Math.max(scrollX, scrollX + viewportWidth - overlayWidth - 10);
    }
    if (left < scrollX) {
      left = scrollX + 10;
    }
    if (top + overlayHeight > scrollY + viewportHeight) {
      top = Math.max(scrollY, scrollY + viewportHeight - overlayHeight - 10);
    }
    if (top < scrollY) {
      top = scrollY + 10;
    }

    // Apply the calculated position (add scroll offset to convert to absolute position)
    overlay.style.left = `${left}px`;
    overlay.style.top = `${top}px`;
    overlay.style.transform = 'none'; // Reset any transform
  });
}

function hideOverlay() {
  overlay.style.display = 'none';
  overlay.innerHTML = '';
}

// Listen for settings updates
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'settingsUpdated') {
    settings = { ...settings, ...message.settings };
    settings.displayWidth = Number(settings.displayWidth) || 800;
    if (!Array.isArray(settings.includedDomains)) {
      settings.includedDomains = ['*'];
    }
    // Re-check domain state — if now disabled, hide overlay
    if (!isDomainEnabled()) {
      hideOverlay();
    }
  }
});
