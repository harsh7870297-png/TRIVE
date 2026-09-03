---
title: "TRIVE Backend Architecture"
tags:
  - backend
  - aspnetcore
  - dotnet
  - architecture
  - trive
  - obsidian-vault
last_updated: 2026-09-04
---

# ⚙️ TRIVE Backend Architecture

This document details the backend REST API server built with **ASP.NET Core 10 Web API**, **Entity Framework Core 10**, and **Google Gemini API** integration.

Related: [[Index]] | [[Architecture]] | [[Database-Schema]] | [[How-To-Setup-And-Run]] | [[Common-Mistakes]]

---

## 🏛️ Controller & Service Breakdown

```
backend/
├── Controllers/
│   ├── AnalyticsController.cs # Handles event tracking (/api/analytics/event) and stats (/api/analytics/stats)
│   ├── InterviewController.cs # Handles key verification, start, turn generation, stop, evaluate
│   ├── SurveyController.cs    # Handles end-of-session survey response submissions
│   └── UsersController.cs     # Handles candidate registration and user lookup
├── Data/
│   ├── AppDbContext.cs        # EF Core DbContext mapping SQLite / PostgreSQL tables
│   └── SeedData.cs            # Initial database seeder
├── Models/                    # Entity models (UserInterview, AnalyticsEvent, SurveyResponse)
├── Services/
│   └── GeminiService.cs       # Multi-agent prompt builder, model failover loop, JSON parser
├── Properties/
│   └── launchSettings.json    # ASP.NET Core port configurations (http://localhost:5245)
├── Program.cs                 # App entry point, CORS policy, EF Core configuration
└── trive.db                   # Auto-generated SQLite database
```

---

## 🌐 API Endpoint Reference

### 1. Key Verification Endpoint
- **Method**: `POST /api/interview/verify-key`
- **Headers**:
  - `X-Gemini-API-Key`: string (Candidate's Google AI Studio API Key)
  - `X-Gemini-Model`: string (e.g. `gemini-2.0-flash`)
- **Response**: `{ "valid": true, "message": "API key verified successfully." }`

### 2. Start Session Endpoint
- **Method**: `POST /api/interview/start`
- **Payload**:
  ```json
  {
    "username": "candidate123",
    "company": "Google",
    "jobRole": "Software Engineer",
    "jobDescription": "Full-stack development...",
    "salary": "600000",
    "difficulty": 3,
    "model": "gemini-2.0-flash"
  }
  ```
- **Response**: Returns `interviewId`, `speakingInterviewer`, initial `dialogue`, and 3-member avatar `expressions`.

### 3. Turn Generation Endpoint
- **Method**: `POST /api/interview/turn`
- **Payload**: Includes `interviewId`, full `history`, `latestAnswer`, and `elapsedSeconds`.
- **Response**: Returns next `speakingInterviewer`, spoken `dialogue`, avatar `expressions`, and `isConcluded` flag.

### 4. Evaluation Endpoint
- **Method**: `POST /api/interview/evaluate`
- **Payload**: Full transcript history and role context.
- **Response**: Returns 3 independent evaluation scorecards (`hr`, `technical`, `hiringManager`) containing metric scores (0-100) and actionable feedback.

### 5. Analytics & Community Stats Endpoint
- **Method**: `GET /api/analytics/stats`
- **Response**: Aggregated counts for `siteVisits`, `startedCount`, `finishedCount`, `totalSurveys`, `wouldUseAgainCount`, `wouldReferCount`, and `avgPrice`.

---

## 🛡️ CORS Policy & Production Configuration (`Program.cs`)

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});
```

- **Development**: `AllowAnyOrigin()` permits local frontend (`localhost:5173`) requests.
- **Production**: Recommended to restrict `WithOrigins(...)` to your exact hosted frontend domain (e.g. `https://your-app.netlify.app`).

---

## 🔗 Related Notes

- [[Index]]
- [[Architecture]]
- [[Database-Schema]]
- [[How-To-Setup-And-Run]]
- [[Common-Mistakes]]
