---
title: "TRIVE System Architecture"
tags:
  - architecture
  - design-decisions
  - trive
  - obsidian-vault
last_updated: 2026-09-04
---

# 🏗️ TRIVE System Architecture

This document provides a comprehensive overview of the **TRIVE** system architecture, component breakdown, hybrid failover model, data flow, and underlying engineering design principles.

Related: [[Index]] | [[AI-Interviewer-Engine]] | [[Frontend-Architecture]] | [[Backend-Architecture]] | [[Database-Schema]] | [[Common-Mistakes]]

---

## 📐 System Overview Diagram

```mermaid
flowchart TD
    subgraph Client ["Frontend (React 19 + Vite)"]
        UI[Neo-Brutalist UI Components]
        SM[State Machine: Setup → Room → Survey → Results]
        STT[Speech Recognition Lifecycle - Fresh Instance Manager]
        TTS[SpeechSynthesis API - Audio Output]
        CAM[Webcam Tracking - Posture & Gaze Analytics]
        DGS[Direct Gemini Service Fallback]
        LSS[Live Stats Tracker - 0 Baseline Engine]
    end

    subgraph Server ["Backend (ASP.NET Core 10 Web API)"]
        IC[InterviewController]
        UC[UsersController]
        AC[AnalyticsController]
        SC[SurveyController]
        GS[GeminiService]
        DB[(AppDbContext - SQLite / Npgsql)]
    end

    subgraph External ["External Services"]
        GEM[Google Gemini REST API]
        FB[Firebase GA4 & Firestore]
    end

    UI <-->|1. Try Backend REST HTTP| IC
    UI <-->|Analytics REST| AC
    UI -->|2. Fallback to Direct Gemini| DGS
    DGS <-->|Direct Client REST| GEM
    UI -->|Save Events| LSS
    UI -->|Log Events & Surveys| FB

    IC -->|Prompt Construction & Turn Gen| GS
    GS <-->|HTTPS REST JsonResponseMode| GEM
    IC -->|Persist Sessions & Events| DB
```

---

## 🎯 Design Philosophy & Key Architectural Decisions

### 1. Multi-Agent Panel Simulation vs. Single Chatbot
**Why?** Traditional mock interview tools simulate a single generic AI interlocutor. Real industry interviews (especially senior, technical, or FAANG/MNC roles) involve a **panel of interviewers** with competing priorities:
- **HR**: Looks for culture fit, teamwork, and communication.
- **Technical**: Looks for algorithmic depth, edge cases, and architectural trade-offs.
- **Hiring Manager**: Looks for ownership, pragmatic decision-making, and execution velocity.

TRIVE's engine prompts Gemini to orchestrate a 3-way conversation, dynamically picking who speaks next based on candidate answers and updating avatar facial expressions for all 3 members simultaneously.

### 2. Hybrid Failover Architecture (Backend + Direct Client Mode)
**Why?** Deploying full-stack applications often involves unhosted backends when frontends are deployed to static platforms like Vercel, Netlify, or GitHub Pages.
- **Primary Path**: TRIVE attempts to route requests through the C# ASP.NET Core backend API (`API_BASE_URL`).
- **Automatic Fallback**: If the backend is offline or unhosted, the frontend transparently switches to `directGeminiService.js`, issuing secure POST requests directly from the browser to Google Gemini API (`generativelanguage.googleapis.com`).
- **Result**: Zero-downtime serverless hosting capability anywhere online.

### 3. Client-Provided Gemini API Key Model
**Why?** LLM inference costs scale with usage. TRIVE passes the user's Gemini API key on a per-request basis.
- **Security**: Neither backend nor frontend stores user API keys to disk. Keys exist only in transient React memory.
- **Cost**: Users leverage their free tier or personal Google AI Studio quotas.

### 4. Zero-Baseline Live Community Metrics Engine
**Why?** Hardcoded platform statistics (e.g. 128 interviews, 75 price) confuse users and obscure real usage.
- TRIVE utilizes `statsService.js` to track live `SITE_VISIT`, `INTERVIEW_STARTED`, `INTERVIEW_FINISHED`, and `SURVEY_SUBMITTED` events in `localStorage` and sync with backend/Firebase.
- Metrics start at a clean **0 baseline** and calculate live percentages and prices dynamically.

### 5. Robust Speech Recognition Lifecycle Management
**Why?** Calling `.start()` on a stopped `SpeechRecognition` object in Chromium browsers causes an internal `InvalidStateError`, leading to frozen voice input with a blinking red recording dot.
- TRIVE's lifecycle manager instantiates a **fresh `SpeechRecognition` instance** upon every start/resume and issues explicit `getUserMedia({ audio: true })` checks to unlock hardware audio streams safely.

---

## 🔄 Lifecycle of an Interview Session

```mermaid
sequenceDiagram
    autonumber
    actor Candidate as User (Browser)
    participant Front as React App (Direct/Backend)
    participant Back as ASP.NET Core API / Direct Gemini
    participant Gem as Google Gemini API
    participant DB as Database / LocalStorage

    Candidate->>Front: Enter credentials & API Key
    Front->>Back: Verify Key (Backend / Direct generateContent)
    Back->>Gem: POST /v1beta/models/{model}:generateContent
    Gem-->>Back: 200 OK
    Back-->>Front: Key Verified (Display ✓ VERIFIED Badge)

    Candidate->>Front: Click START INTERVIEW
    Front->>DB: Record INTERVIEW_STARTED Event (Stats + 1)
    Front->>Back: Generate Opening Turn
    Back->>Gem: Prompt 3-Panel Opening Question
    Gem-->>Back: JSON (SpeakingInterviewer, Dialogue, Expressions)
    Back-->>Front: Render Turn 0 + Interview Room

    loop Interview Turns (5-minute timer)
        Candidate->>Front: Speak (Web Speech STT) / Type Answer
        Front->>Back: Generate Next Turn
        Back->>Gem: Evaluate Answer & Pick Next Speaker
        Gem-->>Back: JSON Turn DTO & Expressions
        Back-->>Front: Update Dialogue & Pixel Sprites
    end

    Candidate->>Front: Finish / Timer Expiry
    Front->>DB: Record INTERVIEW_FINISHED Event
    Front->>Back: Generate Evaluations
    Back->>Gem: Evaluate HR, Technical & Manager Scores
    Gem-->>Back: JSON Final Scorecard DTO
    Back-->>Front: Render Scorecards & Survey
```

---

## 🔗 Related Notes

- [[Index]]
- [[AI-Interviewer-Engine]]
- [[Frontend-Architecture]]
- [[Backend-Architecture]]
- [[Database-Schema]]
- [[Behavioral-Analytics]]
- [[How-To-Setup-And-Run]]
- [[Common-Mistakes]]
