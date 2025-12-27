# How to Load PromptBuddy Extension in Chrome

Follow these steps to load the extension:

## Step 1: Open Chrome Extensions Page
1. Open Google Chrome
2. Type `chrome://extensions/` in the address bar and press Enter
3. Or go to: **Menu (⋮) → Extensions → Manage extensions**

## Step 2: Enable Developer Mode
1. Look for the **"Developer mode"** toggle in the top-right corner
2. Turn it **ON** (toggle should be blue/enabled)

## Step 3: Load the Extension
1. Click the **"Load unpacked"** button (appears after enabling Developer mode)
2. Navigate to your extension folder: `C:\Users\USER\Desktop\promptBuddy`
3. Select the **`promptBuddy`** folder
4. Click **"Select Folder"** (or "Select" button)

## Step 4: Verify Installation
- You should see "PromptBuddy" appear in your extensions list
- The extension icon should appear in your Chrome toolbar (or click the puzzle icon to see all extensions)

## Step 5: Configure Settings
1. Click the PromptBuddy extension icon in Chrome toolbar
2. Click "Settings" link
3. Select your AI model (Gemini, OpenAI, or Claude)
4. Enter your API key
5. Click "Save Settings"

## Troubleshooting
- If you see errors about missing icons, ignore them - Chrome will use a default icon
- If the extension doesn't load, make sure all files are in the `promptBuddy` folder
- After making code changes, click the reload icon (🔄) next to the extension on `chrome://extensions/`

## Note About Icons
The extension will work without custom icons. Chrome will show a default extension icon. If you want custom icons later:
- Create 16x16, 48x48, and 128x128 pixel PNG files
- Name them: `icon16.png`, `icon48.png`, `icon128.png`
- Place them in the extension folder
- Update `manifest.json` to reference them

