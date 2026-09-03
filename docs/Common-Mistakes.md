---
title: "TRIVE Common Mistakes & Troubleshooting Guide"
tags:
  - common-mistakes
  - troubleshooting
  - pitfalls
  - security
  - trive
  - obsidian-vault
last_updated: 2026-09-04
---

# ⚠️ TRIVE Common Mistakes, Pitfalls & Troubleshooting Guide

This document catalogs every common developer, configuration, deployment, and runtime mistake encountered during TRIVE development, along with root-cause explanations and verified resolutions.

Related: [[Index]] | [[Architecture]] | [[Frontend-Architecture]] | [[Backend-Architecture]] | [[How-To-Setup-And-Run]]

---

## 🗂️ Quick Problem & Resolution Matrix

| # | Error / Symptom | Root Cause | Resolution |
| :--- | :--- | :--- | :--- |
| **1** | `ReferenceError: verifyKeyDirectly is not defined` | Missing import statement in component file | Add `import { verifyKeyDirectly } from '../services/directGeminiService'` |
| **2** | `ReferenceError: availableModels is not defined` | Omitted model array state variable in JSX `.map()` | Restore `availableModels` state array in `InterviewDetails.jsx` |
| **3** | Mic freezes, blinking red browser tab | Re-using stopped `SpeechRecognition` instance | Instantiation of fresh `SpeechRecognition` objects on restart |
| **4** | Stats show fake numbers or don't update | Hardcoded non-zero fallbacks (`\|\| 75`, `: 100%`) | Use `statsService.js` with 0-baseline initialization |
| **5** | *"We couldn't reach the AI interviewer"* | Frontend calling unhosted backend API server | Enable direct client fallback via `directGeminiService.js` |
| **6** | `GET /v1beta/models` CORS rejection | Browser CORS restrictions on Google API GET endpoints | Test key via `POST /v1beta/models/{model}:generateContent` |
| **7** | CORS blocked on hosted backend | Backend `Program.cs` missing CORS headers | Configure `AllowAnyOrigin()` or `WithOrigins(...)` in `Program.cs` |
| **8** | Web Speech API not supported | Browser (Firefox/Opera) lacks native Web Speech API | Use Chrome, Edge, Safari, or Brave, or switch to KEYBOARD mode |
| **9** | Mic/Camera access denied on IP URL | Insecure HTTP context (`http://192.168.x.x`) | Access via `http://localhost:5173` or `https://` URL |
| **10**| Firestore database overwrite risk | Unrestricted Firebase security rules (`allow write: if true`) | Set Firestore rules to `allow create: if true; allow update, delete: if false;` |

---

## 🔍 Detailed Breakdown of Common Mistakes

### 1. Missing Import Statements (`ReferenceError`)

#### ❌ The Mistake:
Refactoring handlers (e.g. `handleVerifyKey` or `handleNext`) to call utility functions like `verifyKeyDirectly` or `startInterviewDirectly` without importing them at the top of the file.

#### 💥 Error Message:
```text
Verification error: verifyKeyDirectly is not defined
```

#### ✅ The Resolution:
Always verify imports at the top of your React component:
```javascript
import { verifyKeyDirectly, startInterviewDirectly } from '../services/directGeminiService';
```

---

### 2. Deleting JSX-Referenced State Variables

#### ❌ The Mistake:
Cleaning up component state and accidentally removing state variables (such as `availableModels`) while their JSX render loops (`{availableModels.map(...)}`) remain active.

#### 💥 Error Message:
```text
APPLICATION RENDER ERROR DETECTED: ReferenceError: availableModels is not defined
```

#### ✅ The Resolution:
Maintain the required state definition in `InterviewDetails.jsx`:
```javascript
const [availableModels] = useState([
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Recommended)' },
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite' },
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' }
]);
```

---

### 3. Re-Using Stopped `SpeechRecognition` Instances

#### ❌ The Mistake:
Calling `.start()` on an existing `SpeechRecognition` instance after it has triggered `onend`. In Chromium browsers, calling `.start()` on a stopped instance throws an internal `InvalidStateError`. When wrapped in `try { recognition.start() } catch (e) {}`, the exception is swallowed silently—the browser tab shows a blinking red recording dot, but speech is never converted to text.

#### 💥 Symptom:
Microphone tab indicator blinks red, but spoken words do not appear in the answer input box.

#### ✅ The Resolution:
Use a **Fresh Instance Lifecycle Manager**:
```javascript
const startSpeechRecognition = async () => {
  // Clean up existing instance
  stopSpeechRecognition();

  // Instantiate a FRESH SpeechRecognition object
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.continuous = true;
  recognition.interimResults = true;
  
  recognition.onend = () => {
    if (shouldListenRef.current && !isMicMuted) {
      setTimeout(() => startSpeechRecognition(), 250);
    }
  };

  recognitionRef.current = recognition;
  recognition.start();
};
```

---

### 4. Hardcoding Non-Zero Baseline Metrics

#### ❌ The Mistake:
Using hardcoded default fallback values in JSX rendering (e.g. `stats.avgPrice || 75` or `{stats.totalSurveys > 0 ? ... : 100}%`). This causes new deployments to display fake statistics (e.g. ₹75, 100% referral) when 0 users have interacted.

#### 💥 Symptom:
Metrics do not start at 0, or fail to reflect real community interactions.

#### ✅ The Resolution:
Use `statsService.js` with zero-baseline defaults:
```javascript
{/* Would Use Again */}
{stats.totalSurveys > 0 ? Math.round((stats.wouldUseAgainCount / stats.totalSurveys) * 100) : 0}%

{/* Avg Price Willing to Pay */}
₹{stats.avgPrice || 0}

{/* Would Refer */}
{stats.totalSurveys > 0 ? Math.round((stats.wouldReferCount / stats.totalSurveys) * 100) : 0}%
```

---

### 5. Frontend Deployments Without Direct Client Fallback

#### ❌ The Mistake:
Deploying a React frontend to static hosts (Netlify, Vercel, GitHub Pages) while `API_BASE_URL` points to an unhosted or local C# backend server (`http://localhost:5245`).

#### 💥 Error Message:
```text
We couldn't reach the AI interviewer. Please check your API key or connection.
```

#### ✅ The Resolution:
Implement a **Hybrid Failover Strategy**:
Try backend API first $\rightarrow$ Fallback to `directGeminiService.js` to issue direct HTTPS requests from the browser to Google Gemini API.

---

### 6. Browser CORS Restrictions on `GET /v1beta/models`

#### ❌ The Mistake:
Verifying Gemini API keys from browser JavaScript by making `GET` requests to `https://generativelanguage.googleapis.com/v1beta/models?key=...`. Google restricts cross-origin GET requests to the `/models` endpoint from web browser origins.

#### 💥 Symptom:
Browser console throws `TypeError: Failed to fetch` or HTTP 400/403 CORS rejection during key verification.

#### ✅ The Resolution:
Verify keys by sending a lightweight POST request to `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key=...`:
```javascript
const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
const res = await fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ contents: [{ parts: [{ text: "Hello" }] }] })
});
```

---

### 7. Unrestricted Firestore Security Rules

#### ❌ The Mistake:
Leaving Firebase Firestore rules in open development mode (`allow read, write: if true;`). This allows any malicious actor to delete or overwrite survey responses.

#### 💥 Risk:
Data deletion or corruption in production Firestore database.

#### ✅ The Resolution:
Configure restrictive rules in the [Firebase Console](https://console.firebase.google.com):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /surveys/{document} {
      allow create: if true;
      allow read, update, delete: if false;
    }
    match /analytics_events/{document} {
      allow create: if true;
      allow read, update, delete: if false;
    }
  }
}
```

---

### 8. Insecure HTTP Origins Blocking Media Hardware

#### ❌ The Mistake:
Accessing the application over a local network IP address over unencrypted HTTP (e.g. `http://192.168.1.100:5173`). Modern web browsers disable `navigator.mediaDevices.getUserMedia` (webcam and microphone) on non-secure origins.

#### 💥 Symptom:
Camera and microphone buttons remain disabled or throw `NotAllowedError`.

#### ✅ The Resolution:
Always access TRIVE via secure contexts:
- Local Development: `http://localhost:5173` or `http://127.0.0.1:5173` (treated as secure by browsers).
- Remote / Production: `https://your-app.netlify.app` (HTTPS SSL certificate required).

---

## 🔗 Related Notes

- [[Index]]
- [[Architecture]]
- [[Frontend-Architecture]]
- [[Backend-Architecture]]
- [[How-To-Setup-And-Run]]
