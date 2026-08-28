# LicencePath

LicencePath is a portable Next.js prototype for a simpler Learner's Licence to permanent Driving Licence journey. It was built for the Build What Moves India brief with Codex as a meaningful part of requirements analysis, implementation, testing and accessibility review.

This is an independent, unofficial prototype. It is not affiliated with MoRTH, NIC, Sarathi, mParivahan, any State Transport Department, any RTO or the Government of India.

## What works

- Complete citizen journey from intent to delivered mock licence
- Eligibility before effort using a deterministic Delhi pilot fixture
- Synthetic record retrieval using the displayed test OTP `482916`
- Generated evidence fixtures with validation feedback
- Ambiguous payment reconciliation without a duplicate attempt
- Idempotent submission with one mock application reference
- Simulated appointment, test, approval, dispatch and delivery timeline
- Autosave and resume using local storage
- English and Hindi, larger text, high contrast and reduced-motion support
- Consented assisted mode and a synthetic grievance from any step
- Honest About page explaining working, mocked and future boundaries

## Run locally

```powershell
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Verify

```powershell
pnpm test
pnpm build
```

## Demo path

1. Confirm synthetic data and continue with the prefilled eligible date.
2. Consent to retrieve Asha Verma's synthetic record.
3. Enter the displayed test OTP: `482916`.
4. Confirm the record and attach all three generated evidence fixtures.
5. Simulate payment. When it becomes Pending, reconcile it instead of paying again.
6. Submit once, choose a simulated test slot and advance mock events to delivery.

To demonstrate the eligibility recovery path, change the LL issue date to `2026-07-30`. The prototype blocks payment on day 29 and explains the earliest valid date.

## Prototype architecture

The current build is intentionally self-contained and uses deterministic domain functions plus browser storage. It does not contact any external or government system.

A production version would use a mobile-first PWA, an API or BFF, a case and workflow service, PostgreSQL, protected object storage and a durable queue. Government, identity, payment, appointment, dispatch and notification systems would sit behind versioned provider adapters. Payment and submission would remain separate, idempotent state machines with reconciliation and an append-only event trail.

## Safety

- Do not enter real Aadhaar, PAN, licence, OTP, payment or address information.
- No government logo or official endorsement is claimed.
- All identifiers, fees, records, slots and status events are synthetic.
- Production use requires authorised integrations, state policy validation, threat modelling, privacy and legal review, accessibility testing and department-owned operations.
