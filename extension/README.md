# Calyx Work browser extension

The extension uses Manifest V3 and deliberately requests only `activeTab`, `storage`, and `scripting`. Page context is captured only after the user presses **Share page context**, kept in session storage, and cleared when the active page changes.

## Load for development

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose **Load unpacked** and select this `extension` directory.

Before publishing, replace the local app URL in `popup.js` with your deployed Calyx URL. The initial open-source release reads approved page context; action execution is intentionally left behind a future review-and-confirm protocol.
