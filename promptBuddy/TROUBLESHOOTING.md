# Troubleshooting 404 Errors

If you see "Failed to load resource: the server responded with a status of 404", follow these steps:

## Step 1: Check Which File is Missing
1. Right-click on the extension popup
2. Select "Inspect" or "Inspect Popup"
3. Go to the "Console" tab
4. Look for the exact URL that's returning 404
5. Check if that file exists in your extension folder

## Step 2: Verify All Files Are Present
Make sure you have all these files in your `promptBuddy` folder:
- ✅ manifest.json
- ✅ popup.html
- ✅ popup.js
- ✅ options.html
- ✅ options.js
- ✅ background.js
- ✅ contentScript.js
- ✅ styles.css

## Step 3: Reload the Extension
1. Go to `chrome://extensions/`
2. Find "PromptBuddy"
3. Click the **reload icon** (🔄) to reload the extension
4. This clears any cached errors

## Step 4: Check File Permissions
- Make sure all files are readable
- Check that file names match exactly (case-sensitive on some systems)

## Common Issues:
- **Icon files**: The manifest doesn't require icons, so 404s for icon files can be ignored
- **Cached errors**: Reload the extension to clear cache
- **File path issues**: All files should be in the root extension folder

## If Still Not Working:
Open the browser console (F12) and share the exact error message showing which file is missing.

