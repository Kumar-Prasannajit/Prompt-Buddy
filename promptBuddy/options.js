// Privacy-first design: All settings including API keys are stored locally using chrome.storage.sync
// No data is transmitted except direct API calls to the user's chosen AI provider

document.addEventListener('DOMContentLoaded', () => {
  // ===============================
  // SAFETY CHECK
  // ===============================
  if (typeof chrome === 'undefined' || !chrome.storage) {
    console.error('Chrome storage API is not available');
    document.body.innerHTML =
      '<div class="container"><h1>Error</h1><p>Chrome storage API is not available.</p></div>';
    return;
  }

  // ===============================
  // ELEMENT REFERENCES
  // ===============================
  const form = document.getElementById('settingsForm');
  const modelSelect = document.getElementById('model');
  const apiKeyInput = document.getElementById('apiKey');
  const toneSelect = document.getElementById('tone');
  const maxWordsInput = document.getElementById('maxWords');
  const themeSelect = document.getElementById('theme');
  const fontSizeSlider = document.getElementById('fontSize');
  const fontSizeValue = document.getElementById('fontSizeValue');
  const clearBtn = document.getElementById('clearBtn');
  const toggleVisibility = document.getElementById('toggleVisibility');
  const statusMessage = document.getElementById('statusMessage');

  const providerCards = document.querySelectorAll('.provider-card');

  // ===============================
  // THEME HANDLING
  // ===============================
  function applyTheme(theme) {
    const root = document.documentElement;
  
    root.classList.remove('dark-mode');
  
    if (theme === 'dark') {
      root.classList.add('dark-mode');
    } 
    else if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark-mode');
      }
    }
  }
  

  let systemThemeMediaQuery;

  function setupSystemThemeListener(theme) {
    if (systemThemeMediaQuery) {
      systemThemeMediaQuery.onchange = null;
    }
  
    if (theme === 'system') {
      systemThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      systemThemeMediaQuery.onchange = (e) => {
        document.documentElement.classList.toggle('dark-mode', e.matches);
      };
    }
  }
  

  // ===============================
  // MODEL → INSTRUCTION TOGGLE
  // ===============================
  function updateProviderInstructions(model) {
    providerCards.forEach(card => card.classList.remove('active'));
    if (!model) return;

    const activeCard = document.querySelector(
      `.provider-card[data-provider="${model}"]`
    );
    if (activeCard) activeCard.classList.add('active');
  }

  modelSelect.addEventListener('change', () => {
    updateProviderInstructions(modelSelect.value);
  });

  // ===============================
  // LOAD SETTINGS
  // ===============================
  function loadSettings() {
    chrome.storage.sync.get(
      ['apiKey', 'model', 'tone', 'maxWords', 'theme', 'fontSize'],
      (result) => {
        if (chrome.runtime.lastError) {
          console.error('Error loading settings:', chrome.runtime.lastError);
          return;
        }

        if (result.model) {
          modelSelect.value = result.model;
          updateProviderInstructions(result.model);
        }

        if (result.apiKey) apiKeyInput.value = result.apiKey;
        if (result.tone) toneSelect.value = result.tone;
        if (result.maxWords) maxWordsInput.value = result.maxWords;

        const theme = result.theme || 'system';
        themeSelect.value = theme;
        applyTheme(theme);
        setupSystemThemeListener(theme);

        if (result.fontSize) {
          fontSizeSlider.value = result.fontSize;
          fontSizeValue.textContent = result.fontSize;
        }
      }
    );
  }

  loadSettings();

  // ===============================
  // FONT SIZE DISPLAY
  // ===============================
  fontSizeSlider.addEventListener('input', (e) => {
    fontSizeValue.textContent = e.target.value;
  });

  // ===============================
  // TOGGLE API KEY VISIBILITY
  // ===============================
  toggleVisibility.addEventListener('click', (e) => {
    e.preventDefault();
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      toggleVisibility.textContent = 'Hide';
    } else {
      apiKeyInput.type = 'password';
      toggleVisibility.textContent = 'Show';
    }
  });

  // ===============================
  // SAVE SETTINGS
  // ===============================
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const settings = {
      model: modelSelect.value,
      apiKey: apiKeyInput.value.trim(),
      tone: toneSelect.value || 'professional',
      maxWords: maxWordsInput.value ? parseInt(maxWordsInput.value) : 500,
      theme: themeSelect.value || 'system',
      fontSize: parseInt(fontSizeSlider.value) || 14
    };

    if (!settings.model || !settings.apiKey) {
      showStatus('Please select a model and enter an API key.', 'error');
      return;
    }

    try {
      await chrome.storage.sync.set(settings);
      applyTheme(settings.theme);
      setupSystemThemeListener(settings.theme);
      showStatus('Settings saved successfully!', 'success');
      setTimeout(hideStatus, 2000);
    } catch (err) {
      showStatus('Error saving settings: ' + err.message, 'error');
    }
  });

  // ===============================
  // CLEAR SETTINGS
  // ===============================
  clearBtn.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to clear all settings?')) return;

    try {
      await chrome.storage.sync.clear();
      modelSelect.value = '';
      apiKeyInput.value = '';
      toneSelect.value = 'professional';
      maxWordsInput.value = '';
      updateProviderInstructions(null);
      showStatus('Settings cleared.', 'success');
      setTimeout(hideStatus, 2000);
    } catch (err) {
      showStatus('Error clearing settings: ' + err.message, 'error');
    }
  });

  // ===============================
  // STATUS HELPERS
  // ===============================
  // ===============================
  // STATUS HELPERS (SAFE)
  // ===============================
  function showStatus(message, type = 'info') {
    if (!statusMessage) {
      console.warn('[PromptBuddy] statusMessage missing:', message);
      return;
    }
    statusMessage.textContent = message;
    statusMessage.className = `status-message status-${type}`;
    statusMessage.style.display = 'block';
  }

  function hideStatus() {
    if (!statusMessage) return;
    statusMessage.style.display = 'none';
  }

});
