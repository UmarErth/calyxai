# Calyx

Calyx is an AI workspace designed for clear thinking, focused work, and useful action.

[Open Calyx](https://calyxai.pages.dev)

## The product

Calyx pairs a quiet, distraction-free interface with intelligence profiles that scale from everyday questions to demanding professional work.

| Plan | Price | Daily messages | Intelligence |
| --- | ---: | ---: | --- |
| Free | $0 | 50 | Calyx Core |
| Starter | $5/month | 500 | Calyx Focus |
| Work | $10/month | 5,000 | Calyx Work |
| Unlimited | $20/month | Unlimited | Calyx Max |

The Work experience extends conversations into permission-based browser tasks. Calyx always keeps people in control of consequential actions.

## Open-source surfaces

This repository contains the official open-source Calyx web interface, Chrome extension, Android client, and Windows/Linux desktop clients.

- `src/` — the Calyx frontend
- `extension/` — the Calyx Work Chrome extension
- `android/` — the Capacitor Android app
- `desktop/` — the security-restricted Electron desktop app
- `.github/workflows/build-apps.yml` — reproducible APK, Windows, and Linux builds

The hosted service, intelligence orchestration, billing systems, operational infrastructure, and private backend are not part of this public distribution.

## Design principles

- Calm by default
- Useful before impressive
- Clear about uncertainty
- Narrow permissions and visible consent
- Accessible motion and persistent light or dark themes
- Privacy-conscious product decisions

## Chrome extension

Calyx Work uses narrow Manifest V3 permissions. It reads the active page only after explicit approval, keeps shared context in session storage, and clears that context when the active page changes.

## Official apps

The Android, Windows, and Linux clients open the production Calyx service in a dedicated app window. They do not expose Node.js, unrestricted files, shell commands, or private device APIs to website content. External links open in the device's default browser.

## Security

Please report security concerns privately. A dedicated security contact will be published with the production support channel. Do not disclose suspected vulnerabilities in a public issue.

## License

The frontend and Chrome extension are available under the GNU Affero General Public License v3.0. See [LICENSE](LICENSE).

© 2026 Calyx. All product names and brand assets are trademarks of their respective owners.
