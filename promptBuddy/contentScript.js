// Privacy-first design: Content script only inserts text into active input fields
// No data collection, logging, or tracking is performed

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'insertText') {
    try {
      insertTextIntoActiveElement(request.text);
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
  return true;
});

function insertTextIntoActiveElement(text) {
  const activeElement = document.activeElement;
  
  // Check if active element is an input or textarea
  if (activeElement && (
    activeElement.tagName === 'INPUT' ||
    activeElement.tagName === 'TEXTAREA' ||
    activeElement.isContentEditable
  )) {
    if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
      // For input and textarea elements
      const start = activeElement.selectionStart || 0;
      const end = activeElement.selectionEnd || 0;
      const currentValue = activeElement.value || '';
      
      // Insert text at cursor position
      const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);
      activeElement.value = newValue;
      
      // Set cursor position after inserted text
      const newPosition = start + text.length;
      activeElement.setSelectionRange(newPosition, newPosition);
      
      // Trigger input event to notify any listeners
      activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      activeElement.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (activeElement.isContentEditable) {
      // For contentEditable elements
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        
        // Move cursor to end of inserted text
        range.setStartAfter(textNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Trigger input event
        activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        // Fallback: just set text content
        activeElement.textContent = (activeElement.textContent || '') + text;
        activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    
    // Focus the element
    activeElement.focus();
  } else {
    // Fallback: try to find the first visible textarea or contentEditable element
    const textarea = document.querySelector('textarea:not([style*="display: none"])');
    if (textarea) {
      textarea.focus();
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const currentValue = textarea.value || '';
      textarea.value = currentValue.substring(0, start) + text + currentValue.substring(end);
      const newPosition = start + text.length;
      textarea.setSelectionRange(newPosition, newPosition);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      throw new Error('No active input field found. Please click on a text input or textarea first.');
    }
  }
}

// ======================
// 🎤 Speech-to-Text Handler
// ======================
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let isListening = false;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-IN"; // English
}

// 🟢 Connectivity check for popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.ping) {
    sendResponse({ alive: true });
    return true;
  }

  if (msg.type === "start-mic" && !isListening) {
    recognition.start();
    isListening = true;
    sendResponse({ status: "recording-started" });
    return true;
  }

  if (msg.type === "stop-mic" && isListening) {
    recognition.stop();
    isListening = false;
    sendResponse({ status: "recording-stopped" });
    return true;
  }
});


// receive commands from popup.js
chrome.runtime.onMessage.addListener((msg) => {
  if (!recognition) return;

  if (msg.type === "start-mic" && !isListening) {
    recognition.start();
    isListening = true;
  }

  if (msg.type === "stop-mic" && isListening) {
    recognition.stop();
    isListening = false;
  }
});

if (recognition) {
  recognition.onresult = (event) => {
    let transcript = "";
    for (let i = 0; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }

    chrome.runtime.sendMessage({
      type: "voice-text",
      text: transcript
    });
  };

  recognition.onerror = (e) => {
    chrome.runtime.sendMessage({
      type: "voice-error",
      error: e.error
    });
  };
}
