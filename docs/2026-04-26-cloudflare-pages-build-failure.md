# BitSift Cloudflare Pages Build Failure — Diagnosis & Fix

**Date:** 2026-04-26
**Author:** Claude (diagnostic session)
**Branch:** main @ `f4d8d9e`

---

## 1. Summary

The repo is configured for **Cloudflare Workers** via `@opennextjs/cloudflare` (the modern adapter that replaces the deprecated `@cloudflare/next-on-pages`), but the `build` script in `package.json` only runs `next build` — it never invokes `opennextjs-cloudflare build`. As a result, Cloudflare's deploy pipeline finds a vanilla Next.js `.next/standalone/` output containing symlinks, fails its asset-link validation, and bails out with `"build output directory contains links to files that can't be accessed"`.

A secondary mismatch is in play: this is a **Workers** project (it has `wrangler.jsonc` with `main` + `assets`), but the deploy is going through **Cloudflare Pages**, which is what the failing log line `"Checking for configuration in a Wrangler configuration file (BETA)"` refers to. Either side of that split needs to be picked deliberately — the current build output matches neither.

---

## 2. Evidence

### `package.json` (lines 5-14) — root cause
```json
"scripts": {
  "build": "npx prisma generate && next build",
  "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
  "deploy":  "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
  "upload":  "opennextjs-cloudflare build && opennextjs-cloudflare upload",
  ...
}
```

`preview`, `deploy`, and `upload` all correctly call `opennextjs-cloudflare build` — but **`build` does not**. Cloudflare's auto-deploy runs `npm run build` (or `npx next build` per the failing log), so the adapter never executes and `.open-next/worker.js` is never produced.

### `wrangler.jsonc` (entire file) — confirms Workers, not Pages
```jsonc
{
  "main": ".open-next/worker.js",
  "name": "sift2",
  "compatibility_date": "2026-04-26",
  "compatibility_flags": ["nodejs_compat"],
  "assets": { "directory": ".open-next/assets", "binding": "ASSETS" },
  "services": [{ "binding": "WORKER_SELF_REFERENCE", "service": "sift" }],
  ...
}
```
The presence of `main` + `assets.directory` is a **Workers** config shape. Cloudflare Pages would not use a `worker.js` entry point.

The file expects `.open-next/worker.js` and `.open-next/assets/` to exist post-build — but with the current `build` script, they never get produced.

### `open-next.config.ts` — adapter is wired up but unused
```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
export default defineCloudflareConfig({});
```
Default config — fine. It's only consulted by `opennextjs-cloudflare build`, which the deploy never invokes.

### `next.config.ts` — clean, no `output: "export"` or `"standalone"`
```ts
const nextConfig: NextConfig = {
  serverExternalPackages: ["@mozilla/readability"],
};
import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
```
The dev-side `initOpenNextCloudflareForDev()` shim is set up correctly — but again, it doesn't replace the build-time adapter call.

### `package.json` deps — adapter installed (`@opennextjs/cloudflare ^1.19.4`, `wrangler ^4.85.0`)
Everything needed is present. The build just doesn't run it.

### `.gitignore` (lines 48-53) — correct
```
# OpenNext
.open-next

# wrangler files
.wrangler
.dev.vars*
!.dev.vars.example
```
The latest commit (`f4d8d9e`) added these — confirming opennextjs-cloudflare WAS being explored. The work just wasn't completed.

### `app/api/sift/route.ts` (line 5) — `runtime = "nodejs"` set correctly
Good. The Node-only `@mozilla/readability` import is also correctly listed in `next.config.ts` as `serverExternalPackages`.

### Build log — `"contains links"`
This is the symptom of `next build`'s default standalone output containing symlinks under `.next/standalone/node_modules/`. Cloudflare's asset uploader can't follow symlinks. The `opennextjs-cloudflare build` step would emit a flat, symlink-free Worker bundle in `.open-next/` that bypasses this.

---

## 3. Proposed fix

### Step 1: Update `package.json` build script
```json
"build": "npx prisma generate && opennextjs-cloudflare build"
```
This makes the auto-deploy actually invoke the adapter. After this change, the build emits `.open-next/worker.js` and `.open-next/assets/`, exactly what `wrangler.jsonc` expects.

### Step 2: Decide Pages vs Workers in the Cloudflare dashboard
The current `wrangler.jsonc` is shaped for **Workers**, not Pages. Two paths:

**Path A (recommended): switch the Cloudflare project to Workers Builds.**
- In the Cloudflare dashboard, the project type should be **Workers** (auto-deploys via Workers Builds), not **Pages**.
- If the existing project is a Pages project, create a new Workers project pointed at the same GitHub repo, then delete the Pages project.
- The `npm run deploy` script (`opennextjs-cloudflare deploy`) is the correct local equivalent — it uploads to Workers, not Pages.

**Path B (alternative): keep Pages, switch adapter to `@cloudflare/next-on-pages`.**
- This is the older path. `@opennextjs/cloudflare` is now the recommended option per Cloudflare's own docs (as of late 2025), so Path A is preferred. Don't take this route unless there's a specific reason to stay on Pages.

### Step 3: Verify `compatibility_date` for production
`"compatibility_date": "2026-04-26"` is today — fine. Workers won't reject it.

### Step 4: Push and let auto-deploy run
After the `build` script change is committed and pushed, the Workers Builds pipeline (Path A) will run `npm run build`, which now produces a deploy-ready Worker bundle.

---

## 4. Risks / what could go wrong

- **Pages → Workers migration is one-way for the same domain.** If the Cloudflare project currently serves a Pages-issued URL (`*.pages.dev`), switching to Workers will issue a new URL (`*.workers.dev`). Custom domains can be re-pointed, but the default URL changes. Plan a brief downtime window, or set up the Workers project on a side-by-side basis first.
- **`@neondatabase/serverless` + Prisma 7 + `nodejs_compat`.** The Prisma 7 Neon adapter (`@prisma/adapter-neon`) is HTTP-based and Worker-friendly, but it requires the `nodejs_compat` flag (already set in `wrangler.jsonc`). Verify `DATABASE_URL` is set as a Workers secret (`wrangler secret put DATABASE_URL`) — env vars from `.env.local` do **not** propagate to Workers automatically.
- **NextAuth v5 cookies + Workers.** `next-auth` should work with the OpenNext adapter, but `AUTH_SECRET`, `AUTH_URL`, and any provider keys (Google, GitHub, etc.) must be added as Workers secrets too. A failed login flow post-deploy is almost always a missing secret.
- **`linkedom` vs `jsdom`.** Per commit `75a3f53`, jsdom was already replaced with linkedom for Worker compatibility. Good — keep it that way. If a regression to jsdom slips in, the Worker will fail at runtime with cryptic errors.
- **`@mozilla/readability` is in `serverExternalPackages`.** This keeps Next from bundling it incorrectly. Don't remove that line.
- **First adapter build is slow.** `opennextjs-cloudflare build` can take 1-3 minutes the first time (it traces and bundles dependencies). Don't assume it hung.

---

## 5. Verification — local dry-run before pushing

The OpenNext adapter ships with a local preview that exactly mirrors what Cloudflare runs:

```bash
cd E:/SHARED/PROJECTS/sift

# Full local dry-run (build + serve via miniflare):
npm run preview
```

Expected:
- Adapter prints `OpenNext build complete`.
- `.open-next/worker.js` and `.open-next/assets/` are produced.
- Miniflare boots on `http://localhost:8788` (or similar) and serves the app.
- `/`, `/sift`, `/login`, `/api/sift` all respond.

If `npm run preview` succeeds, the Cloudflare Workers Builds deploy will succeed too — they run the same build pipeline.

For an actual deploy from your laptop (skipping git → CI):
```bash
npm run deploy
```
This runs `opennextjs-cloudflare build && opennextjs-cloudflare deploy` and pushes straight to Workers.

To inspect the produced bundle without deploying:
```bash
npx opennextjs-cloudflare build
ls .open-next/
# Should show: worker.js, assets/, server-functions/, etc.
```

---

## Open questions for Justin

1. Is the Cloudflare project currently **Pages** or **Workers**? The failing log says Pages (BETA Wrangler config check). Recommend switching to Workers.
2. Are `DATABASE_URL`, `AUTH_SECRET`, and any OAuth provider keys set as Workers secrets? If migrating from Pages, those have to be re-entered on the Workers side.
3. Worth keeping `wrangler.jsonc` `name: "sift2"`? That looks like it might be a leftover test name — the GitHub repo is `sift`. Decide before deploy.
