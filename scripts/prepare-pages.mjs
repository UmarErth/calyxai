import { rm } from "node:fs/promises";

// Cloudflare Pages limits individual assets to 25 MiB. The signed APK stays in
// GitHub (and remains part of the F-Droid repository) while Pages serves the UI.
await rm("dist/fdroid/repo/ai.calyx.app_5.apk", { force: true });
