---
title: "How-To Setup, Run, and Deploy TRIVE"
tags:
  - guide
  - setup
  - howto
  - deployment
  - troubleshooting
  - obsidian-vault
last_updated: 2026-09-04
---

# 🚀 How-To Setup, Run, and Deploy TRIVE

This step-by-step guide walks developers and users through running TRIVE locally, deploying the ASP.NET Core backend to hosting providers (MonsterASP.NET/Railway/Render), deploying the React frontend to Netlify/Vercel/GitHub Pages, obtaining Gemini API keys, and troubleshooting common issues.

Related: [[Index]] | [[Architecture]] | [[Backend-Architecture]] | [[Frontend-Architecture]] | [[Common-Mistakes]]

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

The backend server starts by default at `http://localhost:5245` (and `http://localhost:5000`).
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

Vite launches the application at `http://localhost:5173`. Open this URL in **Google Chrome**, **Microsoft Edge**, **Brave**, or **Safari** for best Web Speech API support.

---

## 🔑 Obtaining & Verifying Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com).
2. Click **Create API Key**.
3. Copy your API key (starts with `AIzaSy...`).
4. Paste the API key into the **YOUR API KEY (GEMINI)** input field on the TRIVE homepage.
5. Click **VERIFY KEY** to validate connection (displays **`✓ VERIFIED`** badge).

---

## 🌐 Deploying Serverless (Netlify / Vercel / GitHub Pages)

TRIVE features a **Hybrid Direct Gemini Fallback** engine (`directGeminiService.js`). You can deploy the frontend statically **without needing a backend server**:

1. Push your repository to GitHub (`git push origin main`).
2. Connect your repository to **Netlify** or **Vercel**.
3. Set build settings:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
4. Deploy site! TRIVE will automatically use direct client mode to communicate securely with Google Gemini API from the candidate's browser.

---

## 🏗️ Deploying ASP.NET Core Backend (MonsterASP.NET / Render / Railway)

If hosting the backend C# API server:
```bash
cd backend
dotnet publish -c Release -o ./publish
```
Upload the `./publish` directory to your ASP.NET Core host (e.g. MonsterASP.NET). Ensure CORS policy in `Program.cs` includes your frontend domain.

---

## 🔗 Related Notes

- [[Index]]
- [[Architecture]]
- [[Frontend-Architecture]]
- [[Backend-Architecture]]
- [[Common-Mistakes]]
