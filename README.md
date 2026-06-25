# TB Drug Dosage Calculator

A fast, static rebuild of the WordPress "TB Drug Dosage Calculator" (Calculated
Fields Form plugin), migrated to **Astro + React + TypeScript**. It calculates
**Pyrazinamide** and **Ethambutol** dosing from Lean Body Weight (James equation),
with Cockcroft–Gault CrCl and renal-replacement adjustments.

> **Disclaimer:** Not intended to be official medical advice. Please consult your
> physician before starting any new medications.

## Stack

- **Astro** (static output) — site/content
- **React** island (TypeScript, strict) — the interactive calculator
- **Tailwind CSS** — styling
- **Vitest** — parity tests

## Project layout

| Path | Purpose |
| --- | --- |
| `src/lib/dosing.ts` | Pure, UI-free dosing math — a **verbatim port** of the CFF equations |
| `src/lib/dosing.test.ts` | Parity vectors pinning known input → output pairs |
| `src/components/TBCalculator.tsx` | React island wiring inputs to `dosing.ts` |
| `src/pages/index.astro` | The page, styled to match the original, with preserved clinical text |

## Commands

```bash
npm install      # install dependencies
npm run dev      # local dev server (http://localhost:4321)
npm test         # run the Vitest parity suite
npm run build    # production build -> ./dist
npm run preview  # preview the production build
```

## Deploy (Cloudflare Pages)

- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Framework preset:** Astro (or "None")

## Parity notes (clinical accuracy)

The math in `src/lib/dosing.ts` is a faithful translation of the CFF form
(`form id=9`, "Cloned: TB&CrCl Drug Calculator") found in
`wpri_cp_calculated_fields_form_settings.sql`, cross-checked against the
JavaScript embedded in the saved page HTML. Helper semantics (`prec`, `pow`,
`floor`) follow the official CFF documentation.

`src/lib/dosing.test.ts` pins six hand-computed vectors (the live-page worked
example plus the renal-replacement, high-BMI "LBW fixed", and max-dose "range
omitted" branches). **Do not change the equations to "improve" rounding or
dosing** — parity with the original tool is the requirement.

### Source artefacts (kept for audit, not shipped)

`wpri_cp_calculated_fields_form_settings.sql`, the saved page HTML, and the
reference screenshot are retained in the repo root as the source of truth.
