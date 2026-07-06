# Plan: Production-grade GitHub Pages publish (Unity233 Shader Studio)

_Generated via the `superpowers` workflow (spec → plan → verify). Scope is intentionally narrow:
the app is already fully built; this pass makes it **production-grade and CI-publishable**._

## Goal
Publish the Unity 2022 URP Shader Web tool as a static site on GitHub Pages, via a GitHub Actions
workflow, from the `main` branch. Repo + skills are committed; local memory logs stay private.

## Current state (verified evidence)
- 16 assets serve HTTP 200 via local `python -m http.server` (index.html + 11 JS + CSS + 4 vendor).
- Node codegen harness on `nodeeditor.js`: 0 failures across 5 graphs (HLSL `UniversalFragmentPBR` /
  `UniversalPipeline` / `_Time.y` / `SAMPLE_TEXTURE2D`; GLSL `urpBRDF` / `u_time` / `smoothstep` / `hash`).
- All `*.js` pass `node --check`.
- All `index.html` asset refs are **relative** → safe under the Pages subpath
  (`https://<user>.github.io/<repo>/`).
- No third-party CDN: Three.js r128 + CodeMirror 5 are vendored in `assets/vendor/` (offline-capable).

## Approach
Use the modern **Actions-deploy-Pages** pattern (artifact upload + `actions/deploy-pages`),
deploying the repo **root** (`.`) as the site. Single workflow, no extra build step (static site).

## Tasks
1. `.github/workflows/deploy.yml` — checkout → configure-pages → upload-pages-artifact (path `.`)
   → deploy-pages. Permissions: `contents:read`, `pages:write`, `id-token:write`.
2. `.gitignore` — keep `.workbuddy/skills/**` and `.workbuddy/memory/MEMORY.md` tracked;
   ignore dated daily memory logs (`20NN-NN-NN.md`) and any `MEMORY.local.md`.
3. `git init` → commit source + vendored libs + project skills → `gh repo create` (public) → push `main`.
4. Enable GitHub Pages with `build_type: workflow` (source = GitHub Actions).
5. Verify CI: watch the run go green and the site return HTTP 200 at the Pages URL.

## Verification (evidence, not claims)
- `gh run watch` shows the deploy job succeeded.
- `curl -I https://neko233-com.github.io/unity233-shader-web/` returns 200.
- No token/secret committed (scan before push).

## Out of scope (YAGNI)
- Custom domain / HTTPS cert (use default `*.github.io`).
- `docs/` folder as Pages root (deploying repo root is simpler and sufficient).
- README (not requested).
