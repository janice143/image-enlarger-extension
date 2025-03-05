// Global settings with defaults
let settings = {
  enlargeOnHover: true,
  enlargeImages: true,
  showImagesFromLinks: true,
  showVideosFromLinks: true,
  zoomFactor: 2,
  hoverDelay: 100,
  displayPosition: 'cursor',
  minImageSize: 50,
  maxEnlargedSize: 1500,
  excludedDomains: []
};

// Load settings from storage
chrome.storage.sync.get('imageEnlargerSettings', (data) => {
  if (data.imageEnlargerSettings) {
    settings = { ...settings, ...data.imageEnlargerSettings };
  }
  initializeEnlarger();
});

// Create overlay element for enlarged content
const overlay = document.createElement('div');
overlay.id = 'image-enlarger-overlay';
overlay.style.display = 'none';
document.body.appendChild(overlay);

let hoverTimer = null;
let currentTarget = null;
let lastEvent = null;

function initializeEnlarger() {
  if (!settings.enlargeOnHover) return;

  // Add event listeners for images
  if (settings.enlargeImages) {
    document.querySelectorAll('img').forEach((img) => {
      if (shouldProcessImage(img)) {
        img.addEventListener('mouseenter', handleMouseEnter);
        img.addEventListener('mouseleave', handleMouseLeave);
        img.addEventListener('mousemove', handleMouseMove);
      }
    });
  }

  // Add event listeners for links that might contain images/videos
  if (settings.showImagesFromLinks || settings.showVideosFromLinks) {
    document.querySelectorAll('a').forEach((link) => {
      const href = link.href.toLowerCase();
      if (
        (settings.showImagesFromLinks && isImageLink(href)) ||
        (settings.showVideosFromLinks && isVideoLink(href))
      ) {
        link.addEventListener('mouseenter', handleLinkEnter);
        link.addEventListener('mouseleave', handleMouseLeave);
        link.addEventListener('mousemove', handleMouseMove);
      }
    });
  }

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

function processNewElement(element) {
  if (
    settings.enlargeImages &&
    element.tagName === 'IMG' &&
    shouldProcessImage(element)
  ) {
    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);
    element.addEventListener('mousemove', handleMouseMove);
  } else if (
    (settings.showImagesFromLinks || settings.showVideosFromLinks) &&
    element.tagName === 'A'
  ) {
    const href = element.href.toLowerCase();
    if (
      (settings.showImagesFromLinks && isImageLink(href)) ||
      (settings.showVideosFromLinks && isVideoLink(href))
    ) {
      element.addEventListener('mouseenter', handleLinkEnter);
      element.addEventListener('mouseleave', handleMouseLeave);
      element.addEventListener('mousemove', handleMouseMove);
    }
  }

  // Process child elements
  element.querySelectorAll('img, a').forEach((el) => {
    processNewElement(el);
  });
}

function shouldProcessImage(img) {
  // Check if image is large enough to process
  return (
    img.width >= settings.minImageSize || img.height >= settings.minImageSize
  );
}

function isImageLink(url) {
  return /\.(jpe?g|png|gif|webp|svg|bmp)(\?.*)?$/i.test(url);
}

function isVideoLink(url) {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
}

function handleMouseEnter(event) {
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

function handleLinkEnter(event) {
  lastEvent = event;
  currentTarget = event.target;

  // Clear any existing timer
  if (hoverTimer) {
    clearTimeout(hoverTimer);
  }

  // Set timer for hover delay
  hoverTimer = setTimeout(() => {
    const href = event.target.href;
    if (settings.showImagesFromLinks && isImageLink(href)) {
      showImageFromLink(href, event);
    } else if (settings.showVideosFromLinks && isVideoLink(href)) {
      showVideoFromLink(href, event);
    }
  }, settings.hoverDelay);
}

function handleMouseLeave() {
  // Clear timer and hide overlay
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
  if (
    overlay.style.display !== 'none' &&
    settings.displayPosition === 'cursor'
  ) {
    positionOverlaySmartly(event);
  }
}

function showEnlargedImage(img, event) {
  // Create enlarged image
  const enlargedImg = document.createElement('img');
  enlargedImg.src = img.src;

  // Add loading indicator
  overlay.innerHTML =
    '<div style="color: white; text-align: center;">Loading...</div>';
  overlay.style.display = 'block';

  // Position the overlay initially
  positionOverlaySmartly(event);

  // When image loads, update the overlay
  enlargedImg.onload = function () {
    // Clear overlay and add enlarged image
    overlay.innerHTML = '';

    // Set image size based on zoom factor but respect max size
    const originalWidth = enlargedImg.naturalWidth;
    const originalHeight = enlargedImg.naturalHeight;

    // Calculate dimensions that maintain aspect ratio
    let width = originalWidth * settings.zoomFactor;
    let height = originalHeight * settings.zoomFactor;

    // Apply maximum size constraint while maintaining aspect ratio
    if (width > settings.maxEnlargedSize) {
      const ratio = settings.maxEnlargedSize / width;
      width = settings.maxEnlargedSize;
      height = height * ratio;
    }

    if (height > settings.maxEnlargedSize) {
      const ratio = settings.maxEnlargedSize / height;
      height = settings.maxEnlargedSize;
      width = width * ratio;
    }

    // Apply dimensions directly
    enlargedImg.width = width;
    enlargedImg.height = height;

    overlay.appendChild(enlargedImg);

    // Reposition after image is loaded
    positionOverlaySmartly(event);
  };

  // Handle image load errors
  enlargedImg.onerror = function () {
    overlay.innerHTML =
      '<div style="color: white; text-align: center;">Error loading image</div>';
  };
}

function showImageFromLink(url, event) {
  // Create image element
  const img = document.createElement('img');

  // Add loading indicator
  overlay.innerHTML =
    '<div style="color: white; text-align: center;">Loading...</div>';
  overlay.style.display = 'block';

  // Position the overlay initially
  positionOverlaySmartly(event);

  img.src = url;

  // When image loads, update the overlay
  img.onload = function () {
    // Clear overlay and add image
    overlay.innerHTML = '';

    // Set image size based on zoom factor but respect max size
    const originalWidth = img.naturalWidth;
    const originalHeight = img.naturalHeight;

    // Calculate dimensions that maintain aspect ratio
    let width = originalWidth * settings.zoomFactor;
    let height = originalHeight * settings.zoomFactor;

    // Apply maximum size constraint while maintaining aspect ratio
    if (width > settings.maxEnlargedSize) {
      const ratio = settings.maxEnlargedSize / width;
      width = settings.maxEnlargedSize;
      height = height * ratio;
    }

    if (height > settings.maxEnlargedSize) {
      const ratio = settings.maxEnlargedSize / height;
      height = settings.maxEnlargedSize;
      width = width * ratio;
    }

    // Apply dimensions directly
    img.width = width;
    img.height = height;

    overlay.appendChild(img);

    // Reposition after image is loaded
    positionOverlaySmartly(event);
  };

  // Handle image load errors
  img.onerror = function () {
    overlay.innerHTML =
      '<div style="color: white; text-align: center;">Error loading image</div>';
  };
}

function showVideoFromLink(url, event) {
  // Create video element
  const video = document.createElement('video');
  video.src = url;
  video.controls = true;
  video.autoplay = true;
  video.muted = true;
  video.style.maxWidth = `${settings.maxEnlargedSize}px`;
  video.style.maxHeight = `${settings.maxEnlargedSize}px`;

  // Add loading indicator
  overlay.innerHTML =
    '<div style="color: white; text-align: center;">Loading video...</div>';
  overlay.style.display = 'block';

  // Position the overlay initially
  positionOverlaySmartly(event);

  // When video can play, update the overlay
  video.oncanplay = function () {
    // Clear overlay and add video
    overlay.innerHTML = '';
    overlay.appendChild(video);

    // Reposition after video is loaded
    positionOverlaySmartly(event);
  };

  // Handle video load errors
  video.onerror = function () {
    overlay.innerHTML =
      '<div style="color: white; text-align: center;">Error loading video</div>';
  };
}

function positionOverlaySmartly(event) {
  if (settings.displayPosition === 'fixed') {
    positionOverlayFixed();
    return;
  }

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
      if (spaceBelow >= overlayHeight) {
        top = targetRect.bottom + 10;
        // Center horizontally with the target
        left = targetRect.left + targetRect.width / 2 - overlayWidth / 2;
      }
      // PRIORITY 2: Position to the right
      else if (spaceRight >= overlayWidth) {
        left = targetRect.right + 10;
        // Center vertically with the target
        top = targetRect.top + targetRect.height / 2 - overlayHeight / 2;
      }
      // PRIORITY 3: Position to the left
      else if (spaceLeft >= overlayWidth) {
        left = targetRect.left - overlayWidth - 10;
        // Center vertically with the target
        top = targetRect.top + targetRect.height / 2 - overlayHeight / 2;
      }
      // PRIORITY 4: Position above
      else if (spaceAbove >= overlayHeight) {
        top = targetRect.top - overlayHeight - 10;
        // Center horizontally with the target
        left = targetRect.left + targetRect.width / 2 - overlayWidth / 2;
      }
      // PRIORITY 5: If no good position, use a modified version of below
      // that shows as much of the image as possible
      else {
        top = Math.max(10, viewportHeight - overlayHeight - 10);
        // Center horizontally with the target if possible
        left = targetRect.left + targetRect.width / 2 - overlayWidth / 2;
      }
    } else {
      // Fallback to cursor position if no target
      const x = event.clientX;
      const y = event.clientY;
      left = x + 20;
      top = y + 20;
    }

    // Final bounds checking to ensure overlay stays within viewport
    if (left + overlayWidth > viewportWidth) {
      left = Math.max(10, viewportWidth - overlayWidth - 10);
    }
    if (left < 0) {
      left = 10;
    }
    if (top + overlayHeight > viewportHeight) {
      top = Math.max(10, viewportHeight - overlayHeight - 10);
    }
    if (top < 0) {
      top = 10;
    }

    // Apply the calculated position (add scroll offset to convert to absolute position)
    overlay.style.left = `${left + scrollX}px`;
    overlay.style.top = `${top + scrollY}px`;
    overlay.style.transform = 'none'; // Reset any transform
  });
}

function positionOverlayFixed() {
  // Position in the center of the screen
  overlay.style.left = '50%';
  overlay.style.top = '50%';
  overlay.style.transform = 'translate(-50%, -50%)';
}

function hideOverlay() {
  overlay.style.display = 'none';
  overlay.innerHTML = '';
}

// Listen for settings updates
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'settingsUpdated') {
    settings = message.settings;
    // Re-initialize with new settings
    initializeEnlarger();
  }
});
