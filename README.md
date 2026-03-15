This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Web Push Setup

This project supports browser/device notifications using the Web Push standard.

### 1) Generate VAPID keys

Run this once:

```bash
npx web-push generate-vapid-keys
```

### 2) Add environment variables

Create `.env.local` and set:

```bash
VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
VAPID_EMAIL=mailto:you@example.com
CRON_SECRET=your_strong_random_secret
```

### 3) Scheduled reminder job endpoint

Deadline reminders are exposed at:

```text
GET /api/jobs/deadline-reminders
```

Protect this route with either:

- `Authorization: Bearer <CRON_SECRET>`
- `x-cron-secret: <CRON_SECRET>`

Use this route with either header:

```text
Authorization: Bearer <CRON_SECRET>
x-cron-secret: <CRON_SECRET>
```

### 4) GitHub Actions scheduler (recommended for Vercel Hobby)

This repository includes a workflow at:

`.github/workflows/deadline-reminders.yml`

It runs every 15 minutes and calls your deployed endpoint.

Add these GitHub repository secrets:

```text
APP_URL=https://your-production-domain
CRON_SECRET=the-same-secret-from-env
```

Notes:

- Keep `CRON_SECRET` in both Vercel environment variables and GitHub secrets.
- Do not include a trailing slash in `APP_URL`.
- You can also run the job manually from the Actions tab using `workflow_dispatch`.
