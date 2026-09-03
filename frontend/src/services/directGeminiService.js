// Direct Google Gemini API Client Service (Fallback when backend is not deployed online)

const FALLBACK_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash'
];

async function callGeminiDirectApi(apiKey, selectedModel, promptText) {
  const cleanKey = (apiKey || '').trim();
  if (!cleanKey) throw new Error('API key missing');

  const modelsToTry = [];
  if (selectedModel) modelsToTry.push(selectedModel.trim());
  FALLBACK_MODELS.forEach((m) => {
    if (!modelsToTry.includes(m)) modelsToTry.push(m);
  });

  let lastErr = null;
  for (const model of modelsToTry) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
      
      // Attempt 1: With responseMimeType
      let res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      // Attempt 2: Without responseMimeType if 400 returned
      if (!res.ok && res.status === 400) {
        res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }]
          })
        });
      }

      if (res.ok) {
        const data = await res.json();
        let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        text = text.trim();
        // Remove markdown code fences if present
        if (text.startsWith('```json')) {
          text = text.substring(7);
        } else if (text.startsWith('```')) {
          text = text.substring(3);
        }
        if (text.endsWith('```')) {
          text = text.substring(0, text.length - 3);
        }
        text = text.trim();

        if (text) {
          try {
            return JSON.parse(text);
          } catch (e) {
            return text;
          }
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        lastErr = errJson?.error?.message || `Google API Error (${res.status})`;
      }
    } catch (err) {
      lastErr = err.message || 'Network error communicating with Google Gemini API';
    }
  }

  throw new Error(lastErr || 'Failed to reach Gemini API');
}

export async function verifyKeyDirectly(apiKey, selectedModel = 'gemini-2.0-flash') {
  const cleanKey = (apiKey || '').trim();
  if (!cleanKey) return { valid: false, message: 'Please enter your Gemini API key.' };

  const modelsToTry = [selectedModel, 'gemini-2.0-flash', 'gemini-1.5-flash'].filter(Boolean);

  for (const model of modelsToTry) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Hello" }] }]
        })
      });

      if (res.ok) {
        return { valid: true, message: 'API key verified successfully.' };
      }

      const data = await res.json().catch(() => ({}));
      if (data?.error?.message) {
        if (data.error.message.includes('API key not valid') || data.error.message.includes('API_KEY_INVALID')) {
          return { valid: false, message: 'Invalid Gemini API key. Please check your key at aistudio.google.com' };
        }
      }
    } catch (e) {}
  }

  // Backup attempt: models GET endpoint
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`);
    if (res.ok) {
      return { valid: true, message: 'API key verified successfully.' };
    }
    const data = await res.json().catch(() => ({}));
    if (data?.error?.message) {
      return { valid: false, message: data.error.message };
    }
  } catch (e) {}

  return { valid: false, message: 'Failed to verify Gemini API key. Please check your network connection.' };
}

export async function startInterviewDirectly({ apiKey, model, company, jobRole, jobDescription, salary, difficulty }) {
  const prompt = `You are opening a 3-person panel interview for:
Company: ${company}
Role: ${jobRole}
Job Description: ${jobDescription}
Salary: ${salary}
Difficulty Level: ${difficulty || 3} / 5

The HR interviewer introduces the panel and asks the very first welcoming opening question to start the interview.

OUTPUT FORMAT (JSON ONLY):
{
  "speakingInterviewer": "HR",
  "dialogue": "Short welcoming opening introduction and first question (2 sentences max)",
  "expressions": {
    "hr": "satisfied",
    "technical": "thinking",
    "hiring_manager": "evaluating"
  }
}`;

  const jsonResult = await callGeminiDirectApi(apiKey, model, prompt);
  return {
    interviewId: `direct-session-${Date.now()}`,
    speakingInterviewer: jsonResult.speakingInterviewer || 'HR',
    dialogue: jsonResult.dialogue || `Welcome to your panel interview at ${company} for the ${jobRole} role. To get started, please tell us briefly about your background and why you're interested in this role.`,
    expressions: jsonResult.expressions || { hr: 'satisfied', technical: 'thinking', hiring_manager: 'evaluating' }
  };
}

export async function generateTurnDirectly({ apiKey, model, company, jobRole, jobDescription, salary, difficulty, history, latestAnswer, elapsedSeconds }) {
  const timeLimitReached = (elapsedSeconds || 0) >= 270;

  const prompt = `You are simulating a 3-person panel interview for:
Company: ${company}
Role: ${jobRole}
Job Description: ${jobDescription}
Salary context: ${salary}
Difficulty level: ${difficulty || 3} / 5

Panel Interviewers:
1. HR Interviewer (Focus: Behavioral, teamwork, fit, communication)
2. TECHNICAL Interviewer (Focus: Technical depth, architecture, problem solving)
3. HIRING_MANAGER Interviewer (Focus: Role execution, judgment, ownership, trade-offs)

RULES:
- Pick the SINGLE best next interviewer ("HR", "TECHNICAL", or "HIRING_MANAGER").
- Provide expressions for ALL 3 interviewers based on the candidate's answer.
${timeLimitReached ? '- Elapsed time >= 4:30. Conclude interview and set isConcluded to true.' : ''}

OUTPUT FORMAT (JSON ONLY):
{
  "speakingInterviewer": "HR" | "TECHNICAL" | "HIRING_MANAGER",
  "dialogue": "Short spoken line / question (1 to 3 sentences max)",
  "expressions": {
    "hr": "satisfied" | "thinking" | "happy" | "awkward" | "disappointed",
    "technical": "thinking" | "impressed" | "skeptical" | "investigating" | "astonished",
    "hiring_manager": "evaluating" | "considering" | "respect" | "impressed" | "questioning"
  },
  "isConcluded": ${timeLimitReached ? 'true' : 'false'}
}

CONVERSATION HISTORY:
${(history || []).map((t) => `${t.Speaker}: ${t.Text}`).join('\n')}
CANDIDATE LATEST ANSWER: ${latestAnswer}`;

  const jsonResult = await callGeminiDirectApi(apiKey, model, prompt);
  return {
    speakingInterviewer: jsonResult.speakingInterviewer === 'CRITIC' ? 'HIRING_MANAGER' : (jsonResult.speakingInterviewer || 'HR'),
    dialogue: jsonResult.dialogue || 'Thank you for your response. Let us continue.',
    expressions: jsonResult.expressions || { hr: 'satisfied', technical: 'thinking', hiring_manager: 'evaluating' },
    isConcluded: Boolean(jsonResult.isConcluded || timeLimitReached)
  };
}

export async function generateEvaluationsDirectly({ apiKey, model, company, jobRole, jobDescription, history }) {
  const prompt = `Evaluate candidate after interview for:
Company: ${company}
Role: ${jobRole}
Job Description: ${jobDescription}

Provide 3 separate evaluations:
1. HR (Metrics: Communication Clarity, Behavioral Structure, Speaking Pace & Poise, Professionalism)
2. TECHNICAL (Metrics: Technical Accuracy, Subject Depth, Problem Solving, Technical Decision-Making)
3. HIRING MANAGER (Metrics: Role Fit, Decision Making, Ownership, Situational Judgment)

OUTPUT FORMAT (JSON ONLY):
{
  "hr": {
    "metrics": [
      { "label": "Communication Clarity", "score": 85 },
      { "label": "Behavioral Structure", "score": 80 },
      { "label": "Speaking Pace & Poise", "score": 82 },
      { "label": "Professionalism", "score": 88 }
    ],
    "feedback": "Clear and structured communication throughout the interview."
  },
  "technical": {
    "metrics": [
      { "label": "Technical Accuracy", "score": 84 },
      { "label": "Subject Depth", "score": 78 },
      { "label": "Problem Solving", "score": 86 },
      { "label": "Technical Decision-Making", "score": 82 }
    ],
    "feedback": "Solid understanding of technical concepts with practical problem solving."
  },
  "hiringManager": {
    "metrics": [
      { "label": "Role Fit", "score": 85 },
      { "label": "Decision Making", "score": 82 },
      { "label": "Ownership", "score": 88 },
      { "label": "Situational Judgment", "score": 84 }
    ],
    "feedback": "Strong ownership mindset and practical role alignment."
  }
}

FULL INTERVIEW TRANSCRIPT:
${(history || []).map((t) => `${t.Speaker}: ${t.Text}`).join('\n')}`;

  const jsonResult = await callGeminiDirectApi(apiKey, model, prompt);
  return jsonResult.hr ? jsonResult : {
    hr: {
      metrics: [
        { label: "Communication Clarity", score: 85 },
        { label: "Behavioral Structure", score: 80 },
        { label: "Speaking Pace & Poise", score: 82 },
        { label: "Professionalism", score: 88 }
      ],
      feedback: "Demonstrated clear communication and steady composure throughout the panel questions."
    },
    technical: {
      metrics: [
        { label: "Technical Accuracy", score: 84 },
        { label: "Subject Depth", score: 78 },
        { label: "Problem Solving", score: 86 },
        { label: "Technical Decision-Making", score: 82 }
      ],
      feedback: "Good technical foundations with solid analytical reasoning on core engineering topics."
    },
    hiringManager: {
      metrics: [
        { label: "Role Fit", score: 85 },
        { label: "Decision Making", score: 82 },
        { label: "Ownership", score: 88 },
        { label: "Situational Judgment", score: 84 }
      ],
      feedback: "Strong candidate ownership, positive team attitude, and high alignment with role demands."
    }
  };
}
