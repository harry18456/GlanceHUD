# GEMINI.md

This file provides guidance to Gemini when working with code in this repository.

## Release & Versioning

- **Version Bump**: Before finalizing (or archiving) any feature change, ALWAYS ask the user if the version number needs to be bumped. If the user agrees, run `node scripts/bump_version.js <new_version>` or similar command to bump the version in `version.go`, `wails.json`, `frontend/package.json`, and `build/config.yml`.
