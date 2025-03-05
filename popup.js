// Load settings when popup opens
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();

  // Add event listeners for buttons
  document.getElementById('saveButton').addEventListener('click', saveSettings);
  document
    .getElementById('resetButton')
    .addEventListener('click', resetSettings);
});

function loadSettings() {
  chrome.runtime.sendMessage({ action: 'getSettings' }, (settings) => {
    if (!settings) return;

    // Set checkbox values
    document.getElementById('enlargeOnHover').checked = settings.enlargeOnHover;
    document.getElementById('enlargeImages').checked = settings.enlargeImages;
    document.getElementById('showImagesFromLinks').checked =
      settings.showImagesFromLinks;
    document.getElementById('showVideosFromLinks').checked =
      settings.showVideosFromLinks;

    // Set number input values
    document.getElementById('zoomFactor').value = settings.zoomFactor;
    document.getElementById('hoverDelay').value = settings.hoverDelay;
    document.getElementById('minImageSize').value = settings.minImageSize;
    document.getElementById('maxEnlargedSize').value = settings.maxEnlargedSize;

    // Set select value
    document.getElementById('displayPosition').value = settings.displayPosition;

    // Set excluded domains
    document.getElementById('excludedDomains').value =
      settings.excludedDomains.join('\n');
  });
}

function saveSettings() {
  const settings = {
    enlargeOnHover: document.getElementById('enlargeOnHover').checked,
    enlargeImages: document.getElementById('enlargeImages').checked,
    showImagesFromLinks: document.getElementById('showImagesFromLinks').checked,
    showVideosFromLinks: document.getElementById('showVideosFromLinks').checked,
    zoomFactor: parseFloat(document.getElementById('zoomFactor').value),
    hoverDelay: parseInt(document.getElementById('hoverDelay').value),
    minImageSize: parseInt(document.getElementById('minImageSize').value),
    maxEnlargedSize: parseInt(document.getElementById('maxEnlargedSize').value),
    displayPosition: document.getElementById('displayPosition').value,
    excludedDomains: document
      .getElementById('excludedDomains')
      .value.split('\n')
      .map((domain) => domain.trim())
      .filter((domain) => domain.length > 0)
  };

  chrome.runtime.sendMessage(
    { action: 'saveSettings', settings },
    (response) => {
      if (response.success) {
        // Show success message
        const saveButton = document.getElementById('saveButton');
        const originalText = saveButton.textContent;
        saveButton.textContent = 'Saved!';
        setTimeout(() => {
          saveButton.textContent = originalText;
        }, 1500);

        // Notify content scripts about the settings change
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'settingsUpdated',
              settings
            });
          }
        });
      }
    }
  );
}

function resetSettings() {
  const defaultSettings = {
    enlargeOnHover: true,
    enlargeImages: true,
    showImagesFromLinks: true,
    showVideosFromLinks: true,
    zoomFactor: 2,
    hoverDelay: 300,
    displayPosition: 'cursor',
    minImageSize: 50,
    maxEnlargedSize: 800,
    excludedDomains: []
  };

  chrome.runtime.sendMessage(
    { action: 'saveSettings', settings: defaultSettings },
    (response) => {
      if (response.success) {
        loadSettings();

        // Show reset message
        const resetButton = document.getElementById('resetButton');
        const originalText = resetButton.textContent;
        resetButton.textContent = 'Reset Complete!';
        setTimeout(() => {
          resetButton.textContent = originalText;
        }, 1500);

        // Notify content scripts about the settings change
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'settingsUpdated',
              settings: defaultSettings
            });
          }
        });
      }
    }
  );
}
