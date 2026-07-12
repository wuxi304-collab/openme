## What

Provide a Device Guard fallback for the desktop launcher and a polished installer script for creating the desktop shortcut on Windows.

## Why

Some Windows configurations block unsigned app launches (Device Guard / SmartScreen). The launcher and installer scripts were updated to provide clearer instructions and a fallback invocation that uses the shipped Electron binary when available.

## Files

- `启动OpenMe.cmd` — Windows desktop launcher. Adds robust ASCII-only path handling and a fallback to start from the shipped distribution when env or dev server is not available.
- `scripts/install-desktop-shortcut.ps1` — PowerShell installer for the desktop shortcut. Clarified docstring and improved detection logic for existing shortcuts.

## Tests & Verification

- Run `npx tsc --noEmit` and full test suite to ensure no regressions.
- Manual smoke test recommended on Windows to verify SmartScreen/Device Guard behavior.

## Notes

This PR only improves the launcher/installer UX and does not change app internals.
