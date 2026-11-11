---
area: "SaaS platform"
title: "Selegic CRM"
order: 1
summary: "A multi-tenant CRM platform. I designed it, built v1 on my own and now lead the team that builds it."
status: pilot
role: "Designed it, lead the team"
years: "Aug 2024 – Present"
live: "https://crm.selegic.workers.dev"
stack: ["TypeScript", "Node.js", "Hono", "PostgreSQL", "Cloudflare Workers", "TanStack Start", "Prisma", "Docker", "GitHub Actions"]
stats:
  - value: "5 months"
    label: "to v1.0.0, solo"
  - value: "~3×"
    label: "faster workspace setup"
  - value: "236"
    label: "changes shipped since Jul 2026"
  - value: "323/483"
    label: "commits in the codebase"
---

## Why it exists

Selegic needed its own CRM platform. It is multi-tenant, so many customers run on one codebase, each in a separate workspace. I started it in August 2024 with an empty repo. The first server and web app had only my commits.

## What I built

The current version is `selegic-core`, a TypeScript monorepo on Cloudflare Workers and Neon PostgreSQL. I rebuilt the first version into it using TanStack Start, Hono and Prisma.

Access is built around workspace roles, an admin tier, permission inheritance, field-level write guards and invite links.

Formulas and validation rules are JavaScript. They run in a sandbox on every write, and recalculation is batched. The flow automation engine has a typed contract and a draft-as-version editor, and flows run durably.

The AI kernel gives agents tools that are metered and permission-checked.

I started the extension platform in March 2026. It has a public `@selegic/extension-sdk`, a `scrm` CLI, versioned publishing, server code isolated per version, and outbound HTTP that needs consent.

I also set up the cloud infrastructure: Google Cloud, AWS (S3 and routing) and Cloudflare (CDN and security), with Docker and GitHub Actions.

## The hard parts

### 1. Pre-warmed workspaces

A new customer workspace has to be ready quickly. I keep a pool of pre-warmed tenant schemas, so a workspace can be handed out without waiting for setup. Workspace setup is now about 3× faster.

### 2. Formulas on every write

Formulas run on every write, so they have to be safe to run and cheap to keep up to date. Rules run in a sandbox, and recalculation is batched.

### 3. Releases nobody has to hold their breath for

Deploys are stage-aware. Every pull request gets its own preview environment, releases are driven by tags, and the end-to-end tests gate each release. Secrets are kept in the Cloudflare Secrets Store.

## What changed

I took it to 1.0.0 in January 2025, five months after I started. It is now in pilot with industry users, and it runs on the `selegic-core` monorepo.

Since July 2026, 236 changes have shipped with this release process. I wrote 323 of the 483 commits in the current codebase.
