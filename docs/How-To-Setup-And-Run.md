---
title: "How-To Setup, Run, and Deploy TRIVE"
tags:
  - guide
  - setup
  - howto
  - deployment
  - troubleshooting
  - obsidian-vault
last_updated: 2026-09-03
---

# 🚀 How-To Setup, Run, and Deploy TRIVE

This step-by-step guide walks developers through setting up the environment, launching the backend and frontend, obtaining Gemini API keys, and troubleshooting common issues.

Related: [[Index]] | [[Architecture]] | [[Backend-Architecture]] | [[Frontend-Architecture]]

---

## ⚙️ Prerequisites

Ensure the following tools are installed on your workstation:
- **.NET 10.0 SDK** (or .NET 8/9 compatible runtime). Check with `dotnet --version`.
- **Node.js v18.x or v20.x** & **npm v9+**. Check with `node -v` and `npm -v`.
- A Google Account to obtain a **free Gemini API key** from [Google AI Studio](https://aistudio.google.com).

---

## 🏃 Quick Start (Local Development)

### 1. Launch the ASP.NET Core Backend

Open a terminal in the project root:

```bash
# Navigate to backend folder
cd backend

# Restore packages & build
dotnet restore
dotnet build

# Run the API server
dotnet run
```

The backend server starts by default at `http://localhost:5000` (or configured port in `Properties/launchSettings.json`).
- On startup, EF Core automatically creates `backend/trive.db` (SQLite database).

---

### 2. Launch the React + Vite Frontend

Open a second terminal in the project root:

```bash
# Navigate to frontend folder
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```

Vite launches the application at `http://localhost:5173`. Open this URL in Google Chrome or Microsoft Edge for best Web Speech API support.

---

## 🔑 Obtaining & Verifying Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com).
2. Click **Create API Key**.
3. Copy your API key (starts with `AIzaSy...`).
4. Paste the API key into the **YOUR API KEY (GEMINI)** input field on the TRIVE homepage.
5. Click **VERIFY KEY** to validate connection before starting an interview.

---

## 🏗️ Production Build & Deployment

### Building Frontend
```bash
cd frontend
npm run build
```
Outputs static bundle to `frontend/dist/`.

### Publishing Backend
```bash
cd backend
dotnet publish -c Release -o ./publish
```

---

## ❓ Troubleshooting Guide

### 1. "We couldn't reach the AI interviewer. Please check your API key or connection."
- **Cause**: Invalid API key, Google API quota exhaustion, or backend server is not running.
- **Fix**: Verify backend is running on `localhost:5000` or check your API key status at Google AI Studio.

### 2. Speech Recognition (Mic Input) Not Working
- **Cause**: Web Speech API is only supported in modern Chromium browsers (Chrome, Edge, Brave). Safari/Firefox have limited support.
- **Fix**: Allow microphone permissions in your browser bar. Switch input mode to `KEYBOARD` if mic is unavailable.

### 3. Database Locking Errors in SQLite
- **Cause**: Multiple backend instances accessing `trive.db` simultaneously.
- **Fix**: Stop extra `dotnet run` instances. Delete `trive.db-journal` if present.

---

## 🔗 Related Notes

- [[Index]]
- [[Architecture]]
- [[AI-Interviewer-Engine]]
- [[Backend-Architecture]]
- [[Frontend-Architecture]]
- [[Database-Schema]]
