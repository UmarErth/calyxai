# Calyx Work for Chrome

Calyx Work brings the Calyx experience to the active browser tab while keeping permission and control visible.

## Permission model

The extension uses Manifest V3 and deliberately requests only `activeTab`, `storage`, and `scripting`.

- Page context is captured only after the user selects **Share page context**.
- Context is stored for the current browser session, not as permanent browsing history.
- Shared context is cleared when the active page changes.
- The extension does not request access to every website by default.
- Browser actions are designed around visible review and confirmation.

The extension source is provided under the repository license. Calyx’s hosted services and private backend are not included in this distribution.
