---
area: "Internal tools"
title: "Selegic Internal"
order: 3
summary: "The company's time-tracking and project platform, built end to end."
status: released
role: "Built end to end"
years: "Apr 2025 – Aug 2026"
live: "https://internal.selegic.com"
stack: ["Better Auth", "React Email", "AWS SES", "Prisma", "PostgreSQL", "Docker"]
stats:
  - value: "v1.5.0"
    label: "shipped"
  - value: "3"
    label: "role tiers"
---

## Why it exists

Selegic needed one place for time tracking and project management.

## What I built

I built it end to end. Sign-in uses Better Auth with Google. There are three role tiers. Reports are written as React Email templates and sent through AWS SES. The data layer is Prisma on PostgreSQL, and it runs in Docker.

## The hard parts

### 1. Sign-in and roles

Google sign-in sits on top of Better Auth. The app has three role tiers.

### 2. Reports that go out by email

Reports are generated from React Email templates and delivered through AWS SES.

## What changed

It shipped to v1.5.0. Later it was merged into `selegic-core`, the core platform that Selegic CRM runs on.
