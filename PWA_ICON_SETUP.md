# PWA Icon Setup Instructions

## Current Status
✅ Icon structure is set up correctly
⚠️ **IMPORTANT**: The current icon files are copies of `stashway-logo.png` which is 375x329 (not square)

## Required Actions

### 1. Create Square Icon Files
You need to create properly sized, square PNG icons:

- `/public/icons/icon-192.png` - Must be exactly 192x192 pixels, square, PNG format
- `/public/icons/icon-512.png` - Must be exactly 512x512 pixels, square, PNG format
- `/public/favicon-16.png` - 16x16 pixels (optional but recommended)
- `/public/favicon-32.png` - 32x32 pixels (optional but recommended)

### 2. Icon Requirements
- **PNG only** (no SVG for install icon)
- **Square** - no transparency edges, must be perfectly square
- **192×192 and 512×512 are mandatory** for PWA install prompts
- **Simple, bold mark** - Apple-style, not detailed logos
- **No transparency** around edges (solid background recommended)

### 3. How to Create Square Icons
1. Take the Stashway logo
2. Create a square canvas (192x192 or 512x512)
3. Center the logo on a solid background (use theme color #10b981 or white)
4. Export as PNG
5. Replace the files in `/public/icons/` and `/public/`

### 4. Clear Cache After Updating Icons
After creating proper square icons:

1. **Chrome → chrome://apps** → Uninstall Stashway
2. **DevTools → Application → Clear Storage** → Clear site data
3. **Hard refresh** (Cmd + Shift + R / Ctrl + Shift + R)
4. **Reload site**
5. **Reinstall PWA**

### 5. Verify Icon Accessibility
Ensure icons are publicly accessible:
- No authentication required
- No redirects
- No caching rules blocking `/icons/*`
- If using Cloudflare: disable cache temporarily for icons during testing

## Current File Structure
```
public/
  icons/
    icon-192.png (needs to be 192x192 square)
    icon-512.png (needs to be 512x512 square)
  favicon-16.png (needs to be 16x16)
  favicon-32.png (needs to be 32x32)
  stashway-logo.png (original, 375x329)
```

## Testing
After updating icons:
1. Check browser console for any 404 errors on icon files
2. Verify manifest.json loads correctly
3. Test install prompt shows correct icon
4. Check installed app icon in Start Menu (Windows) or Applications (Mac)
