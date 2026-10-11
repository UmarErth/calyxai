# Calyx F-Droid repository

The public repository is served from:

`https://calyxai.pages.dev/fdroid/repo`

Repository indexes and APKs are signed locally. Private signing keys and the
real `config.yml` are intentionally excluded from Git. Losing these keys would
prevent existing installations from trusting future updates.

The committed `public/fdroid/repo` directory contains only public, signed
repository output. Regenerate it with `fdroid update` after placing a signed
APK in that directory.
