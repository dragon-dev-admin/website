# Deploy nagas-dao-landing to Cloudflare Pages

This site is a static Next.js export (`out/`) deployed with Wrangler.

**Live URL (after first successful deploy):** https://nagas-dao-landing.pages.dev

## One-time setup (required)

Wrangler is not authenticated in non-interactive environments. Do **one** of the following in **your** terminal:

### Option A — Browser login (easiest)

```bash
cd "/Users/harshan/Downloads/chrome-extension-main/Extension-main 8/website/nagas-dao-landing"
npx wrangler login
npx wrangler whoami   # should show your Cloudflare account
```

### Option B — API token (CI / scripts)

1. Create a [Cloudflare API token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/) with **Account → Cloudflare Pages → Edit** (and account read if prompted).
2. Export it in the same shell session:

```bash
export CLOUDFLARE_API_TOKEN="your-token-here"
npx wrangler whoami
```

## Deploy

From this directory:

```bash
npm run deploy
```

Or build and deploy separately (allows dirty git tree):

```bash
npm run build
npx wrangler pages deploy out --project-name=nagas-dao-landing --commit-dirty=true
```

First deploy creates the Pages project `nagas-dao-landing`. Wrangler prints the deployment URL; production is typically **https://nagas-dao-landing.pages.dev**.

## Custom domain (optional)

In [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **nagas-dao-landing** → **Custom domains** → add your domain.
