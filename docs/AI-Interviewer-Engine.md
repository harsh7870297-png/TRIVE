---
title: "AI Interviewer Engine & Multi-Agent Prompt System"
tags:
  - ai-engine
  - gemini
  - multi-agent
  - prompt-engineering
  - obsidian-vault
last_updated: 2026-09-03
---

# 🧠 AI Interviewer Engine & Multi-Agent Prompt System

This document explains the architecture of TRIVE's **AI Interviewer Engine** implemented in `GeminiService.cs`. It details prompt structures, multi-character panel simulation, expression updates, and model fallbacks.

Related: [[Index]] | [[Architecture]] | [[Frontend-Architecture]] | [[Backend-Architecture]]

---

## 👥 The 3-Person Interview Panel

TRIVE orchestrates three distinct AI personae within a single Gemini request:

| Interviewer | Focus & Persona | Available Expressions |
| :--- | :--- | :--- |
| **HR** | Behavioral fit, communication, clarity, teamwork, motivation | `thinking`, `very_pleased`, `happy`, `awkward`, `satisfied`, `disappointed` |
| **TECHNICAL** | Technical accuracy, system design, code quality, edge cases | `thinking`, `impressed`, `skeptical`, `investigating`, `astonished`, `exhausted` |
| **HIRING_MANAGER** | Role ownership, business impact, trade-offs, situational judgment | `considering`, `respect`, `impressed`, `questioning`, `evaluating`, `unimpressed` |

---

## 🎭 Expression Matrix & Emotional Feedback

Each turn response requires Gemini to return expression state updates for **all 3 interviewers simultaneously**, regardless of who spoke:

```json
{
  "speakingInterviewer": "TECHNICAL",
  "dialogue": "How do you handle database connection pool exhaustion under high concurrency?",
  "expressions": {
    "hr": "satisfied",
    "technical": "investigating",
    "hiring_manager": "considering"
  },
  "isConcluded": false
}
```

### Expression Definitions

#### HR Expressions
- `thinking` (🤔): Evaluating communication style.
- `very_pleased` (😁): Exceptional behavioral response.
- `happy` (😄): Positive, engaging answer.
- `awkward` (😅): Nervous or questionable response.
- `satisfied` (😊): Clear, credible answer.
- `disappointed` (😭): Major red flag or lack of accountability.

#### Technical Expressions
- `thinking` (🤔): Analyzing architectural logic.
- `impressed` (😎): Strong technical depth.
- `skeptical` (🤨): Unsupported technical claim.
- `investigating` (🧐): Probing deeper into code choices.
- `astonished` (🤯): Exceptional technical insight.
- `exhausted` (🫩): Repeatedly incorrect or vague answers.

#### Hiring Manager Expressions
- `considering` (🤔): Weighing trade-offs.
- `respect` (🫡): Strong ownership & leadership.
- `impressed` (😎): Great business alignment.
- `questioning` (🤨): Unrealistic strategy.
- `evaluating` (🧐): Assessing trust and reliability.
- `unimpressed` (😴): Generic or rehearsed answers.

---

## ⏳ Timer Rules & Forced Wrap-up Logic

The panel interview operates on a **5-minute (300 seconds)** timer:
- **Elapsed < 270s**: Normal interview flow and back-and-forth questioning.
- **Elapsed >= 270s**: Prompt injects `ALERT: Elapsed time >= 4:30. NO NEW QUESTIONS ALLOWED. Conclude interview thoughts and set isConcluded to true.`
- **Elapsed >= 300s**: Frontend automatically triggers `POST /api/interview/evaluate` and transitions to scorecards.

---

## 📊 Final Evaluation Engine

Upon interview completion, Gemini generates 3 **independent evaluations** without a combined score (preserving character nuance):

```json
{
  "hr": {
    "metrics": [
      { "label": "Communication Clarity", "score": 82 },
      { "label": "Behavioral Structure", "score": 78 },
      { "label": "Speaking Pace & Poise", "score": 85 },
      { "label": "Professionalism", "score": 88 }
    ],
    "feedback": "Actionable feedback on behavioral responses..."
  },
  "technical": {
    "metrics": [
      { "label": "Technical Accuracy", "score": 88 },
      { "label": "Subject Depth", "score": 79 },
      { "label": "Problem Solving", "score": 90 },
      { "label": "Technical Decision-Making", "score": 84 }
    ],
    "feedback": "Actionable technical feedback..."
  },
  "hiringManager": {
    "metrics": [
      { "label": "Role Fit", "score": 84 },
      { "label": "Decision Making", "score": 80 },
      { "label": "Ownership", "score": 86 },
      { "label": "Situational Judgment", "score": 82 }
    ],
    "feedback": "Actionable manager feedback..."
  }
}
```

---

## 🛡️ Model Fallback Chain

If the selected model experiences rate limits or downtime, `GeminiService` automatically attempts API calls through the fallback chain:

1. User Selected Model (e.g., `gemini-2.0-flash`)
2. `gemini-2.0-flash`
3. `gemini-2.0-flash-lite`
4. `gemini-1.5-flash`
5. `gemini-3.1-flash-lite`
6. `gemini-3.5-flash`
7. `gemini-3.5-flash-lite`

If all models fail, a structured fallback object (`GetFallbackEvaluations()`) is safely returned, preventing app crashes.

---

## 🔗 Related Notes

- [[Index]]
- [[Architecture]]
- [[Frontend-Architecture]]
- [[Backend-Architecture]]
