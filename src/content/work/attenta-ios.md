---
area: "iOS"
title: "AttentaFit & Attenta Yoga"
order: 5
summary: "Native iOS fitness and wellness apps. I was the top contributor on AttentaFit and worked on Attenta Yoga."
status: withdrawn
role: "iOS engineer"
years: "Oct 2022 – Dec 2023"
stack: ["Swift", "UIKit", "SwiftUI", "HealthKit", "StoreKit", "Core Data", "Firebase"]
stats:
  - { value: "84", label: "commits, top contributor on AttentaFit" }
---

## Why it exists

AttentaFit was a fitness and diet app; Attenta Yoga was a meditation, sleep and yoga app that existed before I joined. Both shipped to the App Store and were later withdrawn.

## What I built

On **AttentaFit** I was the top contributor: onboarding, workouts, diet plans, trainer booking, chat, a social feed and subscriptions, using HealthKit, StoreKit, Core Data and a custom video player.

On **Attenta Yoga** I was a contributor: a calendar built on EventKit, booking, the media players, share links, and iPad and iOS 16 support.

## The hard parts

### 1. Subscriptions and health data together

Paid plans run through StoreKit while workout data comes from HealthKit, so both had to stay in sync with the account on the server.

### 2. Moving from UIKit to SwiftUI

The apps started in UIKit with MVC and moved toward SwiftUI with MVVM, so old and new screens had to live side by side.

## What changed

This is where I learned to ship to real users on a release schedule, before moving to backend and platform work.
