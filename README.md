# Neura Full-Stack App

A complete responsive Next.js App Router application for Neura, an AI-powered cognitive support platform for dementia patients and caregivers.

The chat/AI assistant screen is intentionally left out as requested.

## Included

- Landing page
- Login and signup
- Cookie-based demo authentication
- Caregiver onboarding
- Patient profile setup
- Dashboard
- Medication tracker
- Cognitive quiz
- API routes backend
- Local JSON data store
- Responsive healthcare-inspired UI
- shadcn-style local components
- Tailwind CSS v4 setup

## Requirements

- Node.js 20+
- npm

## Setup

```bash
npm install
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Backend data

The app stores data in **MongoDB** (MongoDB Atlas in production). Each entity has
its own collection: `users`, `patients`, `medications`, `quizSessions`. The data
access layer lives in `lib/db.ts`, and the serverless-safe connection helper is
in `lib/mongodb.ts`.

The old `data/db.json` file store has been replaced (it cannot work on Vercel,
whose filesystem is read-only).

## Environment

Create a `.env.local` file (see `.env.example`):

```bash
AUTH_SECRET="replace-with-a-long-random-secret"
MONGODB_URI="mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority"
MONGODB_DB="neura"
```

Get `MONGODB_URI` from MongoDB Atlas: create a free cluster, then
**Connect → Drivers** and copy the connection string.

## Deploy to Vercel

1. Push this project to a Git provider (or use `vercel` CLI directly).
2. Import it on vercel.com, or run `vercel` from this folder.
3. Add `AUTH_SECRET`, `MONGODB_URI`, and `MONGODB_DB` in the Vercel project's
   Environment Variables.
4. Allow network access from Vercel in Atlas (Network Access → allow `0.0.0.0/0`
   for a simple setup, or Vercel's IP ranges for a stricter one).

## Test flow

1. Open `/signup`
2. Create caregiver account
3. Complete onboarding
4. Use dashboard, medication tracker, and quiz

