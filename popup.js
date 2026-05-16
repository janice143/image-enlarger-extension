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

    // Set number input values
    document.getElementById('displayWidth').value = settings.displayWidth;
    document.getElementById('hoverDelay').value = settings.hoverDelay;

    // Set included domains (comma or newline separated)
    const domains = (settings.includedDomains || ['*']).join(',');
  });
}

function saveSettings() {
  const raw = document.getElementById('includedDomains').value;
  // Support both comma and newline as separators
  const domains = raw.split(/[,\n]/).map(d => d.trim()).filter(d => d.length > 0);

  const settings = {
    displayWidth: Number(document.getElementById('displayWidth').value) || 800,
    hoverDelay: parseInt(document.getElementById('hoverDelay').value, 10) || 100,
    // Only default to ['*'] if domains list is empty (i.e. user never set it)
    includedDomains: domains.length > 0 ? domains : ['*']
  };

  chrome.runtime.sendMessage(
    { action: 'saveSettings', settings },
    (response) => {
      if (response.success) {
        loadSettings();

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

        setTimeout(() => window.close(), 300);
      }
    }
  );
}

function resetSettings() {
  const defaultSettings = {
    displayWidth: 600,
    hoverDelay: 100,
    includedDomains: ['*']
  };

  chrome.runtime.sendMessage(
    { action: 'saveSettings', settings: defaultSettings },
    (response) => {
      if (response.success) {
        loadSettings();

        // Show reset message
        const resetButton = document.getElementById('resetButton');
        const originalText = resetButton.textContent;
        resetButton.textContent = 'Done';
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

        setTimeout(() => window.close(), 300);
      }
    }
  );
}
