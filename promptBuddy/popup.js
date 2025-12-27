// Privacy-first design: No prompt data is stored, logged, or transmitted except to the user's chosen AI provider API
// All API keys are stored locally using chrome.storage.sync and never shared

let activeTabId = null;

// Get active tab ID as soon as popup opens
chrome.runtime.sendMessage({ type: "get-active-tab" }, (response) => {
  if (response && response.tabId) {
    activeTabId = response.tabId;
    console.log("Active Tab ID:", activeTabId);
  } else {
    console.warn("No active tab found");
  }
});


document.addEventListener('DOMContentLoaded', () => {
  // ===============================
// THEME HANDLING
// ===============================
function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.remove('dark-mode');

  if (theme === 'dark') {
    root.classList.add('dark-mode');
  } else if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.classList.add('dark-mode');
    }
  }
}

    // ===============================
  // APPLY THEME ON POPUP LOAD
  // ===============================
  chrome.storage.sync.get(['theme'], (result) => {
    applyTheme(result.theme || 'system');
  });

  try {
    const chatMessages = document.getElementById('chatMessages');
    const originalPromptTextarea = document.getElementById('originalPrompt');
    const enhanceBtn = document.getElementById('enhanceBtn');
    const statusMessage = document.getElementById('statusMessage');
    const settingsLink = document.getElementById('settingsLink');
    
    // Check if elements exist
    if (!chatMessages || !originalPromptTextarea || !enhanceBtn || !statusMessage || !settingsLink) {
      console.error('Required DOM elements not found');
      return;
    }
    
    let chatHistory = [];

    // Load UI settings and apply them
    loadUISettings();
    
    // Load settings and check if API key is configured
    chrome.storage.sync.get(['apiKey', 'model', 'tone', 'maxWords'], (result) => {
      if (!result.apiKey || !result.model) {
        addSystemMessage('Please configure your API key and model in Settings to start enhancing prompts.');
        enhanceBtn.disabled = true;
      }
    });

  // Handle settings link click
  settingsLink.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL('options.html') });
      if (tabs.length > 0) {
        await chrome.tabs.update(tabs[0].id, { active: true });
        await chrome.windows.update(tabs[0].windowId, { focused: true });
      } else {
        await chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
      }
    } catch (err) {
      console.error('Error opening settings:', err);
      // Fallback: try to open using chrome.runtime.getURL
      try {
        window.open(chrome.runtime.getURL('options.html'), '_blank');
      } catch (fallbackErr) {
        console.error('Fallback also failed:', fallbackErr);
        showStatus('Error opening settings. Please reload the extension.', 'error');
      }
    }
  });

  // ===============================
// Mode Selector Logic (DEBUG)
// ===============================

let selectedMode = 'general';

const modeBtn = document.querySelector('.mode-btn');
const modeMenu = document.querySelector('.mode-menu');
const modeItems = document.querySelectorAll('.mode-item');

console.log('[PromptBuddy] Initial selectedMode:', selectedMode);

// Force initial icon (IMPORTANT)
modeBtn.textContent = '+';

// Toggle menu
modeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  console.log('[PromptBuddy] + clicked');
  modeMenu.classList.toggle('show');
});

// Select mode
modeItems.forEach(item => {
  item.addEventListener('click', (e) => {
    e.stopPropagation();

    const mode = item.dataset.mode;
    console.log('[PromptBuddy] Mode clicked:', mode);

    selectedMode = mode;

    // Update icon explicitly
    if (selectedMode === 'general') {
      modeBtn.textContent = '+';
    } else if (selectedMode === 'development') {
      modeBtn.textContent = '💻';
    } else if (selectedMode === 'image') {
      modeBtn.textContent = '🎨';
    } else {
      console.warn('[PromptBuddy] Unknown mode:', selectedMode);
    }

    console.log('[PromptBuddy] Mode set to:', selectedMode);
    console.log('[PromptBuddy] Button icon now:', modeBtn.textContent);

    modeMenu.classList.remove('show');
  });
});

//toggle mic and send icon
const textarea = document.getElementById('originalPrompt');

// Function to toggle icons
const toggleIcons = () => {
  const hasText = textarea.value.trim().length > 0;

  if (hasText) {
    // Show Send Icon, Hide Mic Icon
    enhanceBtn.innerHTML = '<i class="ri-send-plane-fill"></i>';
    enhanceBtn.title = "Send message";
  } else {
    // Show Mic Icon, Hide Send Icon
    enhanceBtn.innerHTML = '<i class="ri-mic-fill"></i>';
    enhanceBtn.title = "Voice input";
  }
};

// Listen for typing/input
textarea.addEventListener('input', () => {
  toggleIcons();

  // 🔥 Auto-stop mic when user starts typing or text appears
  if (isListening && textarea.value.trim() !== "") {
    chrome.tabs.sendMessage(activeTabId, { type: "stop-mic" });
    stopMicUI();
  }
});


// Initial check (in case there's saved text on load)
toggleIcons();

let isListening = false;

// Handle button click
enhanceBtn.addEventListener("click", () => {
  if (isListening) {
  chrome.tabs.sendMessage(activeTabId, { type: "stop-mic" });
  stopMicUI();
}

  if (textarea.value.trim()) {
    enhancePrompt();
  } else {
    toggleMicRecording();
  }
});

function toggleMicRecording() {
  if (!activeTabId) {
    showStatus("Open a normal webpage to use the mic.", "error");
    return;
  }

  chrome.tabs.sendMessage(activeTabId, { ping: true }, (res) => {
    if (chrome.runtime.lastError) {
      showStatus("Mic unavailable on this page. Switch to a normal website.", "error");
      stopMicUI();
      return;
    }

    // Safe: content script active
    if (!isListening) {
      chrome.tabs.sendMessage(activeTabId, { type: "start-mic" });
      startMicUI();
    } else {
      chrome.tabs.sendMessage(activeTabId, { type: "stop-mic" });
      stopMicUI();
    }
  });
}




chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "voice-text") {
    textarea.value = msg.text;
    toggleIcons();
    autoResizeTextarea();
  }

  if (msg.type === "voice-error") {
    stopMicUI();
  }
});

function startMicUI() {
  isListening = true;
  enhanceBtn.innerHTML = `<i class="ri-mic-off-fill"></i>`;
  voiceIndicator.style.display = "flex";
}

function stopMicUI() {
  isListening = false;
  enhanceBtn.innerHTML = `<i class="ri-mic-fill"></i>`;
  voiceIndicator.style.display = "none";
}


// Close menu when clicking outside
document.addEventListener('click', () => {
  modeMenu.classList.remove('show');
});


  // Constants for textarea resizing
  const MAX_TEXTAREA_HEIGHT = 200; // Maximum height before scrolling
  const MIN_TEXTAREA_HEIGHT = 24;  // Single line height

  /**
   * Auto-resize textarea as user types
   * Expands vertically until max height, then becomes scrollable
   */
  function autoResizeTextarea() {
    try {
      // Reset height to auto to get accurate scrollHeight
      originalPromptTextarea.style.height = 'auto';
      originalPromptTextarea.style.overflowY = 'hidden';
      
      // Get the natural scroll height
      const scrollHeight = originalPromptTextarea.scrollHeight;
      
      // Calculate new height (between min and max)
      const newHeight = Math.max(MIN_TEXTAREA_HEIGHT, Math.min(scrollHeight, MAX_TEXTAREA_HEIGHT));
      
      // Apply the new height
      originalPromptTextarea.style.height = newHeight + 'px';
      
      // Enable scrolling only if content exceeds max height
      if (scrollHeight > MAX_TEXTAREA_HEIGHT) {
        originalPromptTextarea.style.overflowY = 'auto';
      } else {
        originalPromptTextarea.style.overflowY = 'hidden';
      }
    } catch (error) {
      console.error('Error resizing textarea:', error);
    }
  }

  // Initialize textarea height on load
  autoResizeTextarea();

  // Auto-resize on input (typing)
  originalPromptTextarea.addEventListener('input', autoResizeTextarea);
  
  // Auto-resize on paste (handles paste events)
  originalPromptTextarea.addEventListener('paste', () => {
    // Use setTimeout to let paste complete before resizing
    setTimeout(autoResizeTextarea, 0);
  });

  // Handle keyboard input
  originalPromptTextarea.addEventListener('keydown', (e) => {
    // Enter without Shift = Send message
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (originalPromptTextarea.value.trim()) {
        enhancePrompt();
      }
    }
    // Shift + Enter = New line (default behavior, don't prevent)
    // Ctrl/Cmd + Enter = Send (alternative shortcut)
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (originalPromptTextarea.value.trim()) {
        enhancePrompt();
      }
    }
  });

  // ===============================
// MODEL SELECTOR LOGIC
// ===============================

let selectedModel = null;

const modelBtn = document.querySelector('.model-btn');
const modelMenu = document.querySelector('.model-menu');
const modelItems = document.querySelectorAll('.model-item');

// Load saved model on startup
chrome.storage.sync.get(['model'], (result) => {
  if (result.model) {
    selectedModel = result.model;
    updateModelButton(result.model);
  }
});

// Toggle model menu
modelBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  modelMenu.classList.toggle('show');
  // close mode menu if open
  document.querySelector('.mode-menu')?.classList.remove('show');
});

// Select model
modelItems.forEach(item => {
  item.addEventListener('click', (e) => {
    e.stopPropagation();

    const model = item.dataset.model;
    selectedModel = model;

    // Save model
    chrome.storage.sync.set({ model });

    // Update button UI
    updateModelButton(model);

    // Close menu
    modelMenu.classList.remove('show');

    console.log('[PromptBuddy] Model selected:', model);
  });
});

// Update model button icon/text
function updateModelButton(model) {
  if (!modelBtn) return;

  if (model === 'Gemini') {
    modelBtn.innerHTML = '🧠';
    modelBtn.title = 'Gemini';
  } else if (model === 'ChatGPT') {
    modelBtn.innerHTML = '💻';
    modelBtn.title = 'ChatGPT';
  } else if (model === 'Claude') {
    modelBtn.innerHTML = '🎨';
    modelBtn.title = 'Claude';
  } else {
    modelBtn.innerHTML = '<i class="ri-arrow-up-s-line"></i>';
    modelBtn.title = 'Select Model';
  }
}

// Close model menu on outside click
document.addEventListener('click', () => {
  modelMenu.classList.remove('show');
});

  async function enhancePrompt() {
    const originalPrompt = originalPromptTextarea.value.trim();
    
    if (!originalPrompt) {
      showStatus('Please enter a prompt to enhance', 'error');
      return;
    }

    // Load settings
    const settings = await chrome.storage.sync.get(['apiKey', 'model', 'tone', 'maxWords']);
    
    if (!settings.apiKey || !settings.model) {
      showStatus('Please configure your API key and model in Settings', 'error');
      return;
    }

    // Add user message to chat with animation
    addUserMessage(originalPrompt);
    
    // Reset input textarea to single line
    originalPromptTextarea.value = '';
    // Reset height manually first
    originalPromptTextarea.style.height = MIN_TEXTAREA_HEIGHT + 'px';
    originalPromptTextarea.style.overflowY = 'hidden';
    // Then trigger resize to ensure it's correct
    setTimeout(() => {
      autoResizeTextarea();
    }, 10);
    originalPromptTextarea.blur();
    
    // Show typing indicator immediately
    const loadingMessageId = addLoadingMessage();
    
    // Disable send button
    enhanceBtn.disabled = true;
    hideStatus();

    try {
      // Send message to background service worker to handle API call
      const response = await chrome.runtime.sendMessage({
        action: 'enhancePrompt',
        prompt: originalPrompt,
        settings: {
          apiKey: settings.apiKey,
          model: settings.model,
          tone: settings.tone || 'professional',
          maxWords: settings.maxWords || 500
        }
      });

      // Remove typing indicator
      removeLoadingMessage(loadingMessageId);

      if (response.success) {
        // Add assistant message with fade-in animation
        addAssistantMessage(response.enhancedPrompt, originalPrompt);
        showStatus('Prompt enhanced successfully!', 'success');
        setTimeout(() => hideStatus(), 2000);
      } else {
        addErrorMessage(response.error || 'Failed to enhance prompt');
        showStatus(response.error || 'Failed to enhance prompt', 'error');
      }
    } catch (err) {
      removeLoadingMessage(loadingMessageId);
      addErrorMessage('Error: ' + err.message);
      showStatus('Error: ' + err.message, 'error');
    } finally {
      enhanceBtn.disabled = false;
      originalPromptTextarea.focus();
    }
  }

  /**
   * Add user message bubble (right-aligned)
   */
  function addUserMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user-message message-enter';
    messageDiv.innerHTML = `
      <div class="message-content">${escapeHtml(text)}</div>
      <div class="message-time">${getCurrentTime()}</div>
    `;
    chatMessages.appendChild(messageDiv);
    
    // Trigger animation
    requestAnimationFrame(() => {
      messageDiv.classList.add('message-visible');
    });
    
    scrollToBottom();
    chatHistory.push({ type: 'user', text, timestamp: Date.now() });
  }

  /**
   * Add assistant message bubble (left-aligned)
   */
  function addAssistantMessage(enhancedPrompt, originalPrompt) {
    const messageId = 'msg-' + Date.now();
    const messageDiv = document.createElement('div');
    messageDiv.id = messageId;
    messageDiv.className = 'message assistant-message message-enter';
    messageDiv.innerHTML = `
      <div class="message-content fade-in">
        ${escapeHtml(enhancedPrompt)}
      </div>
      <div class="message-actions">
        <button class="action-btn copy-btn" data-text="${escapeAttribute(enhancedPrompt)}" title="Copy to clipboard">
          📋 Copy
        </button>
        <button class="action-btn insert-btn" data-text="${escapeAttribute(enhancedPrompt)}" title="Insert into active page">
          ➤ Insert
        </button>
      </div>
      <div class="message-time">${getCurrentTime()}</div>
    `;
    
    // Initially hidden for fade-in effect
    messageDiv.style.opacity = '0';
    chatMessages.appendChild(messageDiv);
    
    // Trigger animations
    requestAnimationFrame(() => {
      messageDiv.classList.add('message-visible');
      messageDiv.style.opacity = '1';
    });
    
    scrollToBottom();

    // Add event listeners for action buttons
    const copyBtn = messageDiv.querySelector('.copy-btn');
    const insertBtn = messageDiv.querySelector('.insert-btn');
    
    copyBtn.addEventListener('click', async () => {
      const text = copyBtn.getAttribute('data-text');
      try {
        await navigator.clipboard.writeText(text);
        showStatus('Copied to clipboard!', 'success');
        setTimeout(() => hideStatus(), 2000);
      } catch (err) {
        showStatus('Failed to copy. Please select and copy manually.', 'error');
      }
    });

    insertBtn.addEventListener('click', async () => {
      const text = insertBtn.getAttribute('data-text');
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await chrome.tabs.sendMessage(tab.id, {
          action: 'insertText',
          text: text
        });
        showStatus('Text inserted!', 'success');
        setTimeout(() => hideStatus(), 2000);
      } catch (err) {
        showStatus('Failed to insert. Make sure the page is loaded.', 'error');
      }
    });
    
    chatHistory.push({ type: 'assistant', text: enhancedPrompt, timestamp: Date.now() });
  }

  /**
   * Add typing indicator (oscillating dots animation)
   */
  function addLoadingMessage() {
    const messageId = 'typing-' + Date.now();
    const messageDiv = document.createElement('div');
    messageDiv.id = messageId;
    messageDiv.className = 'message assistant-message typing-indicator message-enter';
    messageDiv.innerHTML = `
      <div class="message-content">
        <div class="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;
    chatMessages.appendChild(messageDiv);
    
    requestAnimationFrame(() => {
      messageDiv.classList.add('message-visible');
    });
    
    scrollToBottom();
    return messageId;
  }

  /**
   * Remove typing indicator
   */
  function removeLoadingMessage(messageId) {
    const typingMsg = document.getElementById(messageId);
    if (typingMsg) {
      typingMsg.classList.remove('message-visible');
      typingMsg.classList.add('message-exit');
      setTimeout(() => {
        typingMsg.remove();
      }, 200);
    }
  }

  /**
   * Add error message
   */
  function addErrorMessage(errorText) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message error-message message-enter';
    messageDiv.innerHTML = `
      <div class="message-content">⚠️ ${escapeHtml(errorText)}</div>
      <div class="message-time">${getCurrentTime()}</div>
    `;
    chatMessages.appendChild(messageDiv);
    
    requestAnimationFrame(() => {
      messageDiv.classList.add('message-visible');
    });
    
    scrollToBottom();
  }

  /**
   * Add system message
   */
  function addSystemMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message system-message message-enter';
    messageDiv.innerHTML = `
      <div class="message-content">ℹ️ ${escapeHtml(text)}</div>
    `;
    chatMessages.appendChild(messageDiv);
    
    requestAnimationFrame(() => {
      messageDiv.classList.add('message-visible');
    });
    
    scrollToBottom();
  }

  /**
   * Smooth scroll to bottom of chat
   */
  function scrollToBottom() {
    requestAnimationFrame(() => {
      chatMessages.scrollTo({
        top: chatMessages.scrollHeight,
        behavior: 'smooth'
      });
    });
  }

  function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function escapeAttribute(text) {
    return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

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
  

  async function loadUISettings() {
    const settings = await chrome.storage.sync.get(['theme', 'fontSize']);
    
    // Apply theme
    const theme = settings.theme || 'system';
    applyTheme(theme);
    
    // Apply font size
    const fontSize = settings.fontSize || 14;
    document.documentElement.style.setProperty('--base-font-size', fontSize + 'px');
  }

  // Set up system theme listener for auto dark/light mode
  let systemThemeMediaQuery = null;
  let systemThemeListener = null;
  
  function setupSystemThemeListener(theme) {
    // Remove existing listener if any
    if (systemThemeMediaQuery && systemThemeListener) {
      systemThemeMediaQuery.removeEventListener('change', systemThemeListener);
      systemThemeMediaQuery = null;
      systemThemeListener = null;
    }
    
    // Only set up listener if theme is 'system'
    if (theme === 'system') {
      systemThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      systemThemeListener = (e) => {
        const root = document.documentElement;
        root.classList.toggle('dark-mode', e.matches);
        root.classList.remove('light-mode');
      };
      systemThemeMediaQuery.addEventListener('change', systemThemeListener);
      // Apply initial state
      systemThemeListener(systemThemeMediaQuery);
    }
  }

  // Initialize system theme listener
  chrome.storage.sync.get(['theme'], (result) => {
    const theme = result.theme || 'system';
    setupSystemThemeListener(theme);
  });

  // Listen for theme changes
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync') {
      if (changes.theme) {
        const newTheme = changes.theme.newValue || 'system';
        applyTheme(newTheme);
        setupSystemThemeListener(newTheme);
      }
      if (changes.fontSize) {
        const fontSize = changes.fontSize.newValue || 14;
        document.documentElement.style.setProperty('--base-font-size', fontSize + 'px');
      }
    }
  });
  } catch (error) {
    console.error('Error initializing extension:', error);
    // Show error message to user
    if (document.body) {
      document.body.innerHTML = `
        <div style="padding: 20px; font-family: system-ui;">
          <h2>Error Loading Extension</h2>
          <p>There was an error loading PromptBuddy. Please check the console for details.</p>
          <p style="color: red; font-size: 12px;">${error.message}</p>
        </div>
      `;
    }
  }
});
