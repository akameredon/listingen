# Promptbase 

Implement exactly the screenshot and nothing else

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://listingen.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/15446771-095e-4d44-b8e1-ca8dee8349d3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```


## Listingen creator marketplace

Listingen is being expanded from a prompt-listing generator into a creator commerce platform: creators generate and organize prompt packages, prepare versioned products, submit them for review, publish to the marketplace, and earn from verified purchases.

### Project documentation

- [50-objective delivery tracker](docs/roadmap/50-objectives.md)
- [Supabase and payment operations](docs/operations/supabase-and-payments.md)

### Development

```bash
bun install
bun run dev
bun run lint
bun test
bun run build
```

### Supabase

The Listingen project is `ggghagsrtgrpteclltrh` in the Sleekblue organization, region `us-east-1`. The local Supabase CLI config points to this project. Review migration diffs and use an explicit remote operation before applying database changes; never run destructive resets against production.

### Server-only configuration

See `.env.example` for required variable names. Keep AI provider keys and payment secrets server-side. Supabase service-role credentials must never be placed in browser-exposed `VITE_*` variables.

### Payment functions

- `marketplace-finance`: authenticated checkout, free claims, payout requests, recipient verification, refunds and administrator actions.
- `paystack-webhook`: signature-verified Paystack events and ledger settlement.

Real-money transactions remain disabled until the Paystack secrets, canonical site URL, admin role and active commission rule are configured.
