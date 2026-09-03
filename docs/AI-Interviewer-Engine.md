---
title: "TRIVE AI Interviewer Engine"
tags:
  - ai-engine
  - gemini
  - prompts
  - multi-agent
  - trive
  - obsidian-vault
last_updated: 2026-09-04
---

# 🧠 Multi-Agent AI Interviewer Engine

This document details the multi-agent AI panel system, prompt engineering guidelines, difficulty levels (1 to 5), structured JSON outputs, and avatar expression state mappings.

Related: [[Index]] | [[Architecture]] | [[Frontend-Architecture]] | [[Backend-Architecture]] | [[Common-Mistakes]]

---

## 👥 3-Interviewer Panel Dynamics

TRIVE simulates a 3-person panel interview. In every turn, Gemini selects **one interviewer to speak** while updating **facial expressions for all 3 members simultaneously**:

### 1. HR Interviewer
- **Focus**: Behavioral fit, soft skills, communication clarity, poise, teamwork.
- **Available Expressions**:
  - `satisfied` (😊): Clear, credible answer meeting behavioral expectations.
  - `thinking` (🤔): Evaluating candidate soft skills.
  - `very_pleased` (😁): Exceptionally strong behavioral answer.
  - `happy` (😄): Positive, engaging answer.
  - `awkward` (😅): Uncomfortable, nervous, or mildly questionable answer.
  - `disappointed` (😭): Concerning answer or poor accountability.

### 2. TECHNICAL Interviewer
- **Focus**: Algorithmic accuracy, technical depth, problem-solving, trade-offs.
- **Available Expressions**:
  - `thinking` (🤔): Evaluating technical reasoning.
  - `impressed` (😎): Strong technical depth / elegant solution.
  - `skeptical` (🤨): Unsupported technical claim or flawed reasoning.
  - `investigating` (🧐): Probing deeper into technical details.
  - `astonished` (🤯): Sophisticated technical insight.
  - `exhausted` (🫩): Repeatedly incorrect or hand-waving answers.

### 3. HIRING_MANAGER Interviewer
- **Focus**: Practical role fit, decision-making, ownership, trade-off judgment.
- **Available Expressions**:
  - `evaluating` (🧐): Assessing trust and practical responsibility.
  - `considering` (🤔): Evaluating proposed approach.
  - `respect` (🫡): Strong ownership and professional accountability.
  - `impressed` (😎): Excellent practical judgment.
  - `questioning` (🤨): Questionable decision or unrealistic approach.
  - `unimpressed` (😴): Generic, rehearsed, or irrelevant answers.

---

## 🎯 Difficulty Level Guidelines (1 to 5)

TRIVE enforces strict prompt guidelines based on selected difficulty level:

1. **Difficulty 1 (Entry / Very Easy)**: Basic high-level warm-ups. Extremely supportive and forgiving. No grilling on edge cases.
2. **Difficulty 2 (Associate / Easy)**: Practical entry-level questions and common framework usage. Standard welcoming tone.
3. **Difficulty 3 (Mid-Level / Moderate)**: Realistic mid-level scenarios, trade-off questions, real-world bug/feature discussions.
4. **Difficulty 4 (Senior / Hard)**: System design, concurrency, architecture, failure recovery. Probing and challenging.
5. **Difficulty 5 (Principal / Extreme)**: Advanced architecture, consensus/failover under extreme load. Zero tolerance for vague buzzwords.

---

## 🔗 Related Notes

- [[Index]]
- [[Architecture]]
- [[Frontend-Architecture]]
- [[Backend-Architecture]]
- [[How-To-Setup-And-Run]]
- [[Common-Mistakes]]
