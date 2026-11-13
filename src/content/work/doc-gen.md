---
area: "Service"
title: "Doc Gen"
order: 4
summary: "Turns Salesforce records into DOCX and PDF documents from templates, from a web editor, a public API or a button inside Salesforce. I built it."
status: released
role: "Built it"
years: "Jan 2026 – Present"
live: "https://doc-gen.selegic.workers.dev"
stack: ["TypeScript", "TanStack Start", "Python", "FastAPI", "LibreOffice", "Cloudflare Containers", "Salesforce Apex", "LWC"]
stats:
  - value: "12–13 s → ~1–2 s"
    label: "per PDF, with my team"
  - value: "10"
    label: "beta releases, Jun – Oct 2026"
  - value: "3"
    label: "ways in: editor, API, Salesforce"
---

## Why it exists

Quotes, invoices and agreements at Selegic start as Salesforce records and have to leave as documents. Doc Gen takes a template and a record and returns a DOCX or a PDF.

## What I built

I opened the first pull request in January 2026 and wrote nearly all of it since.

- **A template editor** for DOCX, HTML and Markdown templates, with a live preview filled from a real record.
- **A public REST API** with API keys and an OpenAPI spec. It builds the SOQL query from the template's variables, relationships and subqueries included, so one call fetches the record and renders it.
- **A Salesforce quick action** (Apex and LWC) that generates a document from a quote and attaches it to the record.
- **CPQ terms and clauses** printed into the document from a single `{{terms}}` tag.

## The hard parts

### 1. Rendering on the server

Rendering started in the browser, which broke on complex templates and could not make PDFs. I moved it to a Python (FastAPI) service in a Cloudflare Container: it turns Handlebars templates into Jinja2, renders DOCX with docxtpl and converts to PDF with LibreOffice. I also moved its tooling from pip to uv, with a lockfile and cached Docker layers.

### 2. Making PDFs fast

Every PDF used to cost 12–13 seconds: each request started a fresh container, and LibreOffice booted on every call. With my team we route every request to one warm container, keep LibreOffice running inside it, and wake the container while the template and record are still loading. A warm PDF now takes about 1–2 seconds.

### 3. Word documents that fight back

Word often splits a `{{placeholder}}` across several runs of text. One such invoice froze the editor in an endless loop; the same file now renders in about 130 ms.

## What changed

Doc Gen is released and running at doc-gen.selegic.workers.dev. It went from v1.0.0-beta.0 in June 2026 to beta.9 in October 2026.
