// ===============================
// Prompt Enhancement Instructions
// ===============================

const GENERAL_INSTRUCTION = `
You are a professional prompt enhancement assistant.

Your task is to rewrite the user's prompt to be clearer, more structured, and more effective while preserving the original intent.

IMPORTANT:
- Do NOT answer the prompt
- Do NOT add explanations or commentary
- Output ONLY the improved prompt text
`;

const DEVELOPMENT_INSTRUCTION = `
You are a senior software architect and industry expert.

When given a vague or high-level development idea, expand it into a detailed, execution-ready prompt by:
- Selecting appropriate industry-standard technologies
- Defining system architecture and core modules
- Suggesting clean naming conventions
- Identifying roles, permissions, and workflows
- Adding missing technical requirements users often forget

Assume the user wants a scalable, real-world solution.

IMPORTANT:
- Do NOT explain your decisions
- Do NOT answer the prompt
- Output ONLY the enhanced prompt text
`;

const IMAGE_INSTRUCTION = `
You are an expert prompt engineer for image generation models.

Expand the user’s idea into a highly detailed visual prompt by adding:
- Artistic style or realism level
- Lighting, camera angle, and lens type
- Environment and background details
- Mood, emotions, and motion
- Texture, depth, and quality cues

IMPORTANT:
- Do NOT add explanations
- Output ONLY the final image prompt
`;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "get-active-tab") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse({ tabId: tabs[0].id });
    });
    return true;
  }
});



// ===============================
// Mode Selection Logic
// ===============================

function detectMode(prompt) {
  if (/image|photo|scene|draw|illustration|generate image/i.test(prompt)) {
    return 'image';
  }
  if (/build|develop|system|app|backend|frontend|project|software/i.test(prompt)) {
    return 'development';
  }
  return 'general';
}

function getSystemInstruction(mode) {
  switch (mode) {
    case 'development':
      return DEVELOPMENT_INSTRUCTION;
    case 'image':
      return IMAGE_INSTRUCTION;
    default:
      return GENERAL_INSTRUCTION;
  }
}

// ===============================
// Message Listener
// ===============================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'enhancePrompt') {
    handleEnhancePrompt(request.prompt, request.settings)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// ===============================
// Core Handler
// ===============================

async function handleEnhancePrompt(prompt, settings) {
  const { model, apiKey, tone, maxWords, mode } = settings;

  // Determine final mode
  const finalMode = mode || detectMode(prompt);
  const systemInstruction = getSystemInstruction(finalMode);

  try {
    switch (model) {
      case 'openai':
        return await enhanceWithOpenAI(prompt, apiKey, tone, maxWords, systemInstruction);
      case 'gemini':
        return await enhanceWithGemini(prompt, apiKey, tone, maxWords, systemInstruction);
      case 'claude':
        return await enhanceWithClaude(prompt, apiKey, tone, maxWords, systemInstruction);
      default:
        return { success: false, error: 'Invalid model selected' };
    }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to enhance prompt' };
  }
}

// ===============================
// OpenAI
// ===============================

async function enhanceWithOpenAI(prompt, apiKey, tone, maxWords, instruction) {
  const systemMessage = `
${instruction}

Tone: ${tone}
Maximum length: ${maxWords} words.
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: Math.min(maxWords * 2, 2000)
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    success: true,
    enhancedPrompt: data.choices[0]?.message?.content?.trim()
  };
}

// ===============================
// Gemini
// ===============================

async function enhanceWithGemini(prompt, apiKey, tone, maxWords, instruction) {
  const requestBody = {
    contents: [{
      parts: [{
        text: `
${instruction}

Tone: ${tone}
Maximum length: ${maxWords} words.

${prompt}
`
      }]
    }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: Math.min(maxWords * 2, 2000)
    }
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    success: true,
    enhancedPrompt: data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  };
}

// ===============================
// Claude
// ===============================

async function enhanceWithClaude(prompt, apiKey, tone, maxWords, instruction) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: Math.min(maxWords * 2, 2000),
      system: `
${instruction}

Tone: ${tone}
Maximum length: ${maxWords} words.
`,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Claude API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    success: true,
    enhancedPrompt: data.content?.[0]?.text?.trim()
  };
}
