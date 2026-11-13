---
area: "iOS"
title: "AttentaFit & Attenta Yoga"
order: 5
summary: "Native iOS fitness and wellness apps. I built most of AttentaFit's features and the booking, players and sharing in Attenta Yoga."
status: withdrawn
role: "iOS engineer"
years: "Oct 2022 – Feb 2024"
stack: ["Swift", "SwiftUI", "UIKit", "HealthKit", "StoreKit", "Core Data", "EventKit", "Firebase"]
stats:
  - value: "1.0.5–1.0.7"
    label: "App Store builds shipped"
  - value: "2"
    label: "apps on the App Store"
---

## Why it exists

AttentaFit was a fitness and diet app; Attenta Yoga was a meditation, sleep and yoga app that existed before I joined. Both shipped to the App Store and were later withdrawn.

## What I built

On **AttentaFit**, a SwiftUI app: the onboarding questionnaire, workouts and courses with a custom video player and media controls, diet plans and meal logging, trainer and dietitian booking, chat, social profiles and posts, the Discover page, dynamic links and in-app subscriptions, with HealthKit and Core Data underneath.

On **Attenta Yoga**: session booking with payments and a session store, a calendar on EventKit, audio and video players with a mini player and lock-screen controls, the yoga pose player, a sound mixer and custom alarms, share links, subscriptions, and iPad and iOS 16 support. I shipped its App Store builds 1.0.5, 1.0.6 and 1.0.7.

## The hard parts

### 1. Players that keep playing

Yoga, cooking, sleep and meditation content all needed to keep playing in a mini player while you move around the app, and to answer the lock screen's controls.

### 2. Subscriptions and health data together

Paid plans run through StoreKit while workout data comes from HealthKit, so both had to stay in sync with the account on the server.

### 3. Moving from UIKit to SwiftUI

The apps started in UIKit with MVC and moved toward SwiftUI with MVVM, so old and new screens had to live side by side.

## What changed

This is where I learned to ship to real users on a release schedule, before moving to backend and platform work.
