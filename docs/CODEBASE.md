# LicencePath codebase design

This codebase is a self-contained Next.js prototype. It proves the citizen journey with deterministic synthetic data; it does not contain a production government integration.

## Runtime flow

```text
app/page.tsx
  -> components/citizen-journey.tsx
       -> lib/sarathi-domain.ts
       -> browser localStorage
       -> generated fixtures in public/
```

1. `app/page.tsx` is the route entry point and renders the interactive journey.
2. `components/citizen-journey.tsx` owns browser interaction, validation messages, accessibility preferences, autosave and the eight visible stages.
3. `lib/sarathi-domain.ts` owns the versioned demo rule pack and deterministic case behaviour: service requests, evidence deduplication, fees, appointment decisions, payment recovery and idempotent submission.
4. `localStorage` is a device-local adapter for resumable demo state. It is not shared, durable or suitable for multiple production users.
5. `public/` contains synthetic receipt fixtures. No real upload or payment data leaves the browser.

## Modules and interfaces

| Module | Interface callers learn | Implementation hidden behind it | Design assessment |
| --- | --- | --- | --- |
| Route module | Render the home or About route | Next.js App Router composition and metadata | Small and appropriately shallow |
| Citizen journey module | Render `<CitizenJourney />` | Eight stages, bilingual copy, form state, autosave, validation and recovery UI | Deep to the route, but internally too broad |
| Sarathi domain module | Configure requests; derive evidence, fees and appointments; transition payment and submission | Versioned rule lookup, deduplication, idempotency and case invariants | The main deep module |
| About module | Render one language | Product boundary, scale direction and safety copy | Small interface with useful locality |

The domain seam is `lib/sarathi-domain.ts`. The UI and tests cross the same seam, so the interface is also the test surface. Deleting this module would spread rule selection, fee calculation, evidence deduplication and transition logic throughout the UI and tests; it passes the deletion test and earns its place.

The journey module has a very small external interface, but its implementation currently mixes view copy, stage orchestration and some branch-specific validation. The next deepening opportunity is an application-case engine with one command interface and one derived-view interface. That would increase locality: adding a sixth service would change the catalogue and engine, not conditionals across several stage renderers.

## Seams and adapters

The prototype has one real local seam: browser persistence. `localStorage` is the current adapter. A production build would introduce a durable case-store adapter and keep device storage only for explicitly local preferences.

Identity, Sarathi, payment, appointment, notification and dispatch are labelled mock dependencies in the interface, but the repository intentionally does not yet define production ports for them. There is only one deterministic implementation today. Following the rule “one adapter means a hypothetical seam; two adapters means a real one,” production ports should be introduced only when an authorised remote adapter exists alongside the in-memory test adapter.

## Case model

```text
ApplicationCase LP-DEMO-20260828-0001
  |- ServiceRequest LP-SR-01 (LL to DL)
  |- ServiceRequest LP-SR-02 (address change)
  |- shared identity consent
  |- combined evidence set
  |- payment state
  |- submission state and idempotency key
  `- timeline, appointment and grievance references
```

One case gives the citizen one place to resume and track work. Independent requests prevent the selected services from collapsing into one ambiguous status. Payment and submission remain separate state transitions so an uncertain payment callback cannot create a duplicate charge or application.

## Production scale direction

The browser prototype is not the scaling architecture. For large-scale use, the same domain concepts should move behind a server-side case and workflow module:

```text
Next.js web app
  -> API / backend-for-frontend
       -> case and workflow module
            -> PostgreSQL case adapter
            -> protected object-storage adapter
            -> durable queue adapter
            -> versioned State/RTO rule module
            -> authorised provider ports and adapters
```

Database-side, versioned transitions should own concurrency. Durable queued work should handle retries and reconciliation. Tests should use in-memory adapters at the same seams and assert observable case outcomes, not internal implementation state.

## Where to start

- Product behaviour: `components/citizen-journey.tsx`
- Domain rules and transitions: `lib/sarathi-domain.ts`
- Domain verification: `tests/sarathi-domain.test.ts`
- Visual system and responsive states: `app/globals.css`
- Product and production boundary: `docs/PORTAL.md`
