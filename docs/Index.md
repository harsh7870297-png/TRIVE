---
title: "TRIVE Project Documentation - Index"
tags:
  - index
  - architecture
  - trive
  - obsidian-vault
last_updated: 2026-09-03
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
```

### Core Documentation Modules

| Document | Description | Key Focus Areas |
| :--- | :--- | :--- |
| [[Architecture]] | High-level system architecture & design decisions | Tech stack, system flow, component interaction |
| [[AI-Interviewer-Engine]] | Multi-Agent Panel Interviewer System | Gemini 2.0/3.x integration, prompts, 3-person panel, expressions |
| [[Frontend-Architecture]] | React + Vite + Tailwind Frontend | State machine, Neo-Brutalist UI palette, Pixel Sprites, Audio TTS/STT |
| [[Backend-Architecture]] | ASP.NET Core 10 Web API | Controllers, CORS, Dependency Injection, REST endpoints |
| [[Database-Schema]] | EF Core Data Models & Persistence | SQLite & PostgreSQL dual support, schema definitions |
| [[Behavioral-Analytics]] | Real-Time Candidate Analysis | Webcam posture/gaze tracking, filler words, Firebase/Firestore |
| [[How-To-Setup-And-Run]] | Developer & User Guide | Running backend/frontend, API keys, troubleshooting |

---

## 💡 What is TRIVE?

TRIVE is an interactive, multi-agent AI interview preparation platform designed to simulate realistic **3-person panel interviews** consisting of:
1. **HR Interviewer**: Focuses on behavioral fit, communication clarity, and soft skills.
2. **Technical Interviewer**: Evaluates technical depth, problem-solving, and architectural trade-offs.
3. **Hiring Manager**: Assesses practical role suitability, decision-making, and ownership.

The platform includes real-time behavioral tracking (gaze, posture, filler word count, thinking time), audio voice interaction (Speech-to-Text & Text-to-Speech), expression-reactive pixel art avatars, and real-time community statistics.

---

## 🛠️ Stack Overview

- **Frontend**: React 19, Vite, Tailwind CSS v4 (Neo-Brutalist retro aesthetic), Web Speech API.
- **Backend**: C# ASP.NET Core 10 Web API, Entity Framework Core 10.
- **Database**: SQLite (default zero-config) & PostgreSQL (production dual-driver support).
- **AI Core**: Google Gemini API (`gemini-2.0-flash`, `gemini-3.1-flash-lite`, etc.) with structured JSON response mode.
- **Analytics & Tracking**: Local SQLite analytics events + Firebase GA4 & Firestore dual logging.

---

## 🔗 Related Notes

- [[Architecture]]
- [[AI-Interviewer-Engine]]
- [[Frontend-Architecture]]
- [[Backend-Architecture]]
- [[Database-Schema]]
- [[Behavioral-Analytics]]
- [[How-To-Setup-And-Run]]
