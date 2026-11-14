# Listingen — 50-objective delivery tracker

Statuses are evidence-based: **Complete** means the implementation exists and has passed the relevant checks; **Partial** means a working foundation exists but acceptance criteria remain; **Blocked** means an external credential, authorization or legacy-data source is required.

## Phase 1 — Infrastructure and foundation

1. [x] Connect the repository and application configuration to the new Sleekblue Supabase project.
2. [~] Configure environment variables. Supabase public values are configured in Vercel; AI and Paystack secrets and a canonical production origin remain outstanding.
3. [~] Audit the existing schema and preserve the legacy `listings` model. The old Lovable-managed records have not been migrated because that backend is not available in this Supabase workspace.
4. [x] Establish versioned SQL migrations aligned with the remote migration history.
5. [~] Establish buyer, creator, reviewer and administrator authorization using Supabase Auth `app_metadata`; first administrator provisioning remains outstanding.
6. [x] Implement email registration, sign-in and password recovery.
7. [x] Enable RLS and explicit API grants; security advisors report no findings.
8. [~] Create the central app configuration table and admin-controlled access; full settings UI remains.
9. [ ] Configure and verify automated backup and recovery procedures.
10. [~] Add CI lint, test and production-build gates; latest pipeline run is still being verified.

## Phase 2 — Creator Studio

11. [x] Creator registration and onboarding.
12. [x] Public creator profiles and storefront pages.
13. [x] Creator dashboard with prompt, product and earnings views.
14. [x] Unified saved prompt library.
15. [~] Save and copy drafts; in-place editing, duplication and folder organization remain.
16. [x] Immutable product version history and resubmission.
17. [~] Standard generator categories and Apps & Games generator exist; additional specialist generator experiences remain.
18. [x] Preserve the ordinary prompt generator.
19. [~] Apps & Games produces structured marketplace-ready prompt packages; it does not build and host the apps or games themselves.
20. [x] Convert saved generated prompt packages into marketplace product drafts.

## Phase 3 — Prompt Intelligence and verification

21. [x] Add automated quality scoring.
22. [x] Check required fields, prompt length, placeholders and step-by-step instructions.
23. [~] Add exact and similarity-based duplicate triage against up to 100 visible catalog records; broader plagiarism detection remains.
24. [~] Add policy-risk keyword screening and human moderation; this is triage, not legal determination.
25. [ ] Add automated validation of referenced tools, URLs and service availability.
26. [x] Check required inputs, placeholders and usage instructions.
27. [~] Add evidence-backed documented/tested/reproduced states; isolated execution and repeatable sandbox runs remain.
28. [x] Explicitly distinguish documented, tested and reproduced states.
29. [x] Add reviewer/admin approval, rejection and change-request workflow.
30. [x] Store quality, completeness, originality, compliance and reproducibility reports per submission.

## Phase 4 — Marketplace and buyer experience

31. [x] Public marketplace discovery page.
32. [x] Category taxonomy and category filtering.
33. [x] Product detail pages with preview and verification disclosures.
34. [~] Creator-set product pricing; discounts and promotional pricing remain.
35. [~] Search and category filtering; advanced filters and sorting remain.
36. [x] Draft, review, approval and publication states.
37. [~] Paystack checkout initialization is implemented in a server-side Edge Function; live checkout is blocked until Paystack secrets and an active commission rule are configured.
38. [x] Secure prompt delivery only after a verified paid order or free claim.
39. [x] Verified-purchase review submission and administrator moderation.
40. [~] Purchase history, support tickets and full-refund workflow are implemented; live payment/refund verification awaits Paystack configuration. Partial refunds remain manual.

## Phase 5 — Revenue, administration and growth

41. [x] Configurable commission rules with per-transaction snapshots; no percentage is hardcoded.
42. [x] Creator ledger and separate platform revenue ledger with idempotent webhook processing.
43. [~] Earnings history, available-balance calculation and atomic payout requests exist; live settlement awaits verified Paystack recipients and credentials.
44. [~] Paystack recipient verification and transfer initiation are implemented; provider credentials and webhook setup remain outstanding.
45. [x] Admin Command Centre for review, commissions, payout operations, support, moderation and analytics; admin role provisioning remains.
46. [~] Review moderation, support/dispute intake and full refunds exist; partial refunds and a complete dispute evidence workflow remain.
47. [x] Generate copy-ready social captions and share links for published products.
48. [~] Referral codes, UTM capture and purchase attribution exist; comprehensive SEO, affiliate commissions and campaign automation remain.
49. [x] Basic paid-sales, platform-revenue and campaign-attribution analytics.
50. [~] Creator referral and sharing tools exist; automated acquisition, retention and growth experiments remain.

## Release gates

- No production launch until CI passes on the release commit.
- No payment is marked paid from a browser redirect; only a verified Paystack webhook can settle an order.
- No creator/platform split is assumed; checkout requires an active admin-configured commission rule.
- No service-role key is exposed to the browser.
- No legacy data is overwritten; migrate and reconcile the old Lovable-managed records before decommissioning that backend.
- Rotate credentials previously committed in the public repository's historical `.env` file. Deleting the file from the current branch does not remove it from Git history.
