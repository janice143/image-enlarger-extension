// Initialize default settings when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  const defaultSettings = {
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

  chrome.storage.sync.set({ imageEnlargerSettings: defaultSettings });
});

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getSettings') {
    chrome.storage.sync.get('imageEnlargerSettings', (data) => {
      sendResponse(data.imageEnlargerSettings || {});
    });
    return true; // Required for async sendResponse
  } else if (message.action === 'saveSettings') {
    chrome.storage.sync.set({ imageEnlargerSettings: message.settings }, () => {
      sendResponse({ success: true });
    });
    return true; // Required for async sendResponse
  }
});
