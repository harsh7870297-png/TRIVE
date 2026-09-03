---
title: "TRIVE Project Documentation - Index"
tags:
  - index
  - architecture
  - trive
  - obsidian-vault
last_updated: 2026-09-04
---

# 🚀 TRIVE - AI Interview Preparation Platform Documentation

Welcome to the official documentation vault for **TRIVE** (Interview Preparation AI). This documentation is formatted for **Obsidian** using cross-linked wiki links (`[[WikiLink]]`), structured metadata, visual architecture diagrams, and comprehensive guides detailing **What**, **Why**, and **How** every part of the system works.

---

## 🗂️ Table of Contents & Navigation

```mermaid
graph TD
    A[Index / Root] --> B([[Architecture]])
    A --> C([[AI-Interviewer-Engine]])
    A --> D([[Frontend-Architecture]])
    A --> E([[Backend-Architecture]])
    A --> F([[Database-Schema]])
    A --> G([[Behavioral-Analytics]])
    A --> H([[How-To-Setup-And-Run]])
    A --> I([[Common-Mistakes]])
```

### Core Documentation Modules

| Document | Description | Key Focus Areas |
| :--- | :--- | :--- |
| [[Architecture]] | High-level system architecture & design decisions | Hybrid Failover, Tech stack, system flow, component interaction |
| [[AI-Interviewer-Engine]] | Multi-Agent Panel Interviewer System | Gemini 2.0/3.x integration, prompts, 3-person panel, expressions |
| [[Frontend-Architecture]] | React + Vite + Tailwind Frontend | State machine, Direct Gemini Fallback, Audio STT/TTS, Neo-Brutalist UI |
| [[Backend-Architecture]] | ASP.NET Core 10 Web API | Controllers, CORS policy, EF Core SQLite/PostgreSQL, REST endpoints |
| [[Database-Schema]] | EF Core Data Models & Persistence | SQLite & PostgreSQL dual support, schema definitions |
| [[Behavioral-Analytics]] | Real-Time Candidate Analysis & Stats | Posture/gaze tracking, filler words, 0-baseline live community metrics |
| [[How-To-Setup-And-Run]] | Developer & User Guide | Running backend/frontend, Netlify/MonsterASP.NET deployment, API keys |
| [[Common-Mistakes]] | Troubleshooting & Pitfalls Guide | CORS issues, Web Speech API freezes, missing imports, Firebase rules |

---

## 💡 What is TRIVE?

TRIVE is an interactive, multi-agent AI interview preparation platform designed to simulate realistic **3-person panel interviews** consisting of:
1. **HR Interviewer**: Focuses on behavioral fit, communication clarity, and soft skills.
2. **Technical Interviewer**: Evaluates technical depth, problem-solving, and architectural trade-offs.
3. **Hiring Manager**: Assesses practical role suitability, decision-making, and ownership.

The platform includes real-time behavioral tracking (gaze, posture, filler word count, thinking time), audio voice interaction (Speech-to-Text & Text-to-Speech), expression-reactive pixel art avatars, a hybrid serverless direct-Gemini fallback engine, and zero-baseline live community metrics.

---

## 🛠️ Stack Overview

- **Frontend**: React 19, Vite, Tailwind CSS v4 (Neo-Brutalist retro aesthetic), Web Speech API.
- **Backend**: C# ASP.NET Core 10 Web API, Entity Framework Core 10.
- **Database**: SQLite (default zero-config) & PostgreSQL (production dual-driver support).
- **AI Core**: Google Gemini API (`gemini-2.0-flash`, `gemini-1.5-flash`, etc.) with direct client fallback (`directGeminiService.js`).
- **Analytics & Tracking**: Local SQLite analytics + Browser `localStorage` + Firebase GA4 & Firestore dual logging (`statsService.js`).

---

## 🔗 Related Notes

- [[Architecture]]
- [[AI-Interviewer-Engine]]
- [[Frontend-Architecture]]
- [[Backend-Architecture]]
- [[Database-Schema]]
- [[Behavioral-Analytics]]
- [[How-To-Setup-And-Run]]
- [[Common-Mistakes]]
