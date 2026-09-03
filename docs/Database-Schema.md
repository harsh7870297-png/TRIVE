---
title: "TRIVE Database Schema & Persistence"
tags:
  - database
  - sqlite
  - postgresql
  - efcore
  - trive
  - obsidian-vault
last_updated: 2026-09-04
---

# 🗄️ TRIVE Database Schema & Persistence

This document details the Entity Framework Core database models, tables, relationships, and dual SQLite / PostgreSQL driver configuration.

Related: [[Index]] | [[Architecture]] | [[Backend-Architecture]] | [[Common-Mistakes]]

---

## 📊 Entity Relationship Diagram

```mermaid
erDiagram
    UserInterview {
        string InterviewId PK
        string Username
        string Company
        string JobRole
        string JobDescription
        string Salary
        int Difficulty
        string Model
        int ElapsedSeconds
        string Status
        DateTime CreatedAt
    }

    AnalyticsEvent {
        int Id PK
        string EventType
        string UsernameOrSession
        string Payload
        DateTime CreatedAt
    }

    SurveyResponse {
        int Id PK
        string Username
        bool WouldUseAgain
        bool WillingToPay
        string PriceRange
        bool WouldRefer
        DateTime CreatedAt
    }
```

---

## 🔒 Git & Security Exclusions

SQLite journal and WAL files (`trive.db-shm`, `trive.db-wal`, `trive.db`) are excluded from Git repository tracking via `.gitignore` to prevent database lock issues during concurrent commits.

---

## 🔗 Related Notes

- [[Index]]
- [[Architecture]]
- [[Backend-Architecture]]
- [[How-To-Setup-And-Run]]
- [[Common-Mistakes]]
