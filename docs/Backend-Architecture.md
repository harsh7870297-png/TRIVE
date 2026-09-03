---
title: "Backend Architecture & API Specifications"
tags:
  - backend
  - aspnetcore
  - csharp
  - api-reference
  - obsidian-vault
last_updated: 2026-09-03
---

# ⚙️ Backend Architecture & API Specifications

This document outlines the ASP.NET Core 10 Web API architecture, controller structure, endpoints, request/response models, and header conventions.

Related: [[Index]] | [[Architecture]] | [[AI-Interviewer-Engine]] | [[Database-Schema]]

---

## 🏛️ Backend Architecture Overview

The backend is built with **C# ASP.NET Core 10**, structured into clean separation of concerns:

- `Program.cs`: Application entry point, DI container configuration, CORS setup, DB context registration.
- `Controllers/`: REST HTTP endpoints.
- `Services/`: Business logic & external AI integrations (`GeminiService`).
- `Data/`: Entity Framework Core database context (`AppDbContext`).
- `Models/`: Persistent entity models (`UserInterview`, `AnalyticsEvent`, `Survey`).

---

## 🔐 Custom Header Conventions

All endpoints invoking Google Gemini require custom client HTTP headers:

| Header Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `X-Gemini-API-Key` | String | **Yes** | User's personal Google Gemini API key from Google AI Studio. |
| `X-Gemini-Model` | String | Optional | Selected LLM model (e.g. `gemini-2.0-flash`, `gemini-3.1-flash-lite`). Default: `gemini-3.7-flash`. |

---

## 📡 REST API Reference

### 1. InterviewController (`/api/interview`)

#### `GET /api/interview/models`
Fetches available Gemini models supporting `flash` or `pro`.
- **Headers**: `X-Gemini-API-Key`
- **Response 200 OK**:
  ```json
  {
    "models": [
      { "id": "gemini-2.0-flash", "name": "gemini-2.0-flash", "displayName": "Gemini 2.0 Flash (gemini-2.0-flash)" }
    ]
  }
  ```

#### `POST /api/interview/verify-key`
Pings Gemini API to verify API key validity prior to starting interview session.
- **Headers**: `X-Gemini-API-Key`, `X-Gemini-Model`
- **Response 200 OK**: `{ "valid": true }`
- **Response 400 Bad Request**: `{ "message": "Google API Error (403): Invalid API Key" }`

#### `POST /api/interview/start`
Initializes user session in database and generates Turn 0.
- **Headers**: `X-Gemini-API-Key`
- **Body**:
  ```json
  {
    "username": "candidate_123",
    "company": "Accenture",
    "jobRole": "Software Engineer Intern",
    "jobDescription": "Full stack development with C# and React...",
    "salary": "₹8,00,000 / year",
    "difficulty": 3,
    "model": "gemini-2.0-flash"
  }
  ```
- **Response 200 OK**:
  ```json
  {
    "interviewId": 42,
    "turn": {
      "speakingInterviewer": "HR",
      "dialogue": "Welcome! Tell us about yourself.",
      "expressions": { "hr": "satisfied", "technical": "thinking", "hiring_manager": "evaluating" },
      "isConcluded": false
    }
  }
  ```

#### `POST /api/interview/turn`
Processes candidate response and returns panel response + updated expressions.
- **Headers**: `X-Gemini-API-Key`
- **Body**:
  ```json
  {
    "interviewId": 42,
    "company": "Accenture",
    "jobRole": "Software Engineer Intern",
    "jobDescription": "...",
    "salary": "...",
    "difficulty": 3,
    "model": "gemini-2.0-flash",
    "history": [
      { "speaker": "HR", "text": "Tell us about yourself." }
    ],
    "latestAnswer": "I built several web projects using React and C#...",
    "elapsedSeconds": 60
  }
  ```

#### `POST /api/interview/stop`
Marks interview as abandoned when user leaves early.
- **Body**: `{ "interviewId": 42, "exitTimeSeconds": 120 }`

#### `POST /api/interview/evaluate`
Triggers final 3-person panel assessment upon completion.
- **Body**: `{ "interviewId": 42, "company": "...", "jobRole": "...", "jobDescription": "...", "history": [...], "elapsedSeconds": 300 }`

---

### 2. UsersController (`/api/users`)

#### `POST /api/users/check-username`
Verifies unique username availability before starting interview.
- **Body**: `{ "username": "john_doe" }`
- **Response 200 OK**: `{ "available": true }`

---

### 3. AnalyticsController (`/api/analytics`)

#### `POST /api/analytics/event`
Logs platform usage events (`SITE_VISIT`, `INTERVIEW_STARTED`, `INTERVIEW_COMPLETED`).

#### `GET /api/analytics/stats`
Returns aggregated live community metrics displayed in homepage blue region:
- **Response 200 OK**:
  ```json
  {
    "siteVisits": 154,
    "startedCount": 42,
    "finishedCount": 38,
    "avgQuitSeconds": 145,
    "totalSurveys": 35,
    "wouldUseAgainCount": 33,
    "wouldReferCount": 34,
    "avgPrice": 75
  }
  ```

---

### 4. SurveyController (`/api/survey`)

#### `POST /api/survey`
Saves user feedback survey responses.

---

## 🔗 Related Notes

- [[Index]]
- [[Architecture]]
- [[AI-Interviewer-Engine]]
- [[Database-Schema]]
