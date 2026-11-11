---
title: "Doc Gen"
order: 4
summary: "A service that turns templates into DOCX and PDF documents. I worked on its infrastructure, deployment and CPQ terms rendering."
status: released
role: "Infrastructure & deployment"
years: "Selegic"
live: "https://doc-gen.selegic.workers.dev"
stack: ["Cloudflare Workers", "DOCX", "PDF"]
stats: []
---

## Why it exists

Documents at Selegic come out of templates, in DOCX and PDF. Doc Gen is the service that renders them.

## What I built

My part was the infrastructure and deployment of Doc Gen, and rendering CPQ terms into its templates. I did not build the whole service.

## The hard parts

### 1. Infrastructure and deploys

I worked on the infrastructure Doc Gen runs on and how it is deployed.

### 2. CPQ terms rendering

Rendering CPQ terms was the other part I worked on.

## What changed

Doc Gen is released and running at doc-gen.selegic.workers.dev.
