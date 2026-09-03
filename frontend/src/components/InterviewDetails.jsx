import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';
import { logAnalyticsEvent, saveAnalyticsEventToFirestore } from '../config/firebase';

export default function InterviewDetails({ onStartInterview }) {
  const [username, setUsername] = useState('');
  const [company, setCompany] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [salary, setSalary] = useState('');
  const [difficulty, setDifficulty] = useState(3); // Default level 3 (Standard)
  const [apiKey, setApiKey] = useState('');
  
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');

  // Pre-configured interview settings (Speaker OFF by default)
  const [inputMode, setInputMode] = useState('keyboard'); // 'keyboard' | 'mic'
  const [speakerEnabled, setSpeakerEnabled] = useState(false); // Default OFF as requested

  // Log site visit on mount
  useEffect(() => {
    try {
      fetch(`${API_BASE_URL}/api/analytics/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'SITE_VISIT',
          usernameOrSession: 'anonymous'
        })
      });
    } catch (e) {}

    // Firebase Firestore + Google Analytics 4
    logAnalyticsEvent('page_view', { page_title: 'InterviewDetails' });
    saveAnalyticsEventToFirestore('SITE_VISIT', 'anonymous');
  }, []);

  const [availableModels] = useState([
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Recommended)' },
    { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite' },
    { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' }
  ]);

  const [isKeyVerified, setIsKeyVerified] = useState(false);
  const [keyVerifying, setKeyVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerifyKey = async () => {
    if (!apiKey.trim()) {
      setErrorMsg('Please enter your Gemini API key.');
      return;
    }
    setErrorMsg('');
    setKeyVerifying(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/interview/verify-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gemini-API-Key': apiKey.trim(),
          'X-Gemini-Model': selectedModel
        }
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setIsKeyVerified(true);
        setErrorMsg('');
      } else {
        setIsKeyVerified(false);
        setErrorMsg(data.message || "We couldn't reach the AI interviewer. Please check your API key or connection.");
      }
    } catch (err) {
      setIsKeyVerified(false);
      setErrorMsg("We couldn't reach the AI interviewer. Please check your API key or connection.");
    } finally {
      setKeyVerifying(false);
    }
  };

  const handleNext = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim()) {
      setErrorMsg('Please enter a username.');
      return;
    }
    if (!company.trim()) {
      setErrorMsg('Please enter a company name.');
      return;
    }
    if (!jobRole.trim()) {
      setErrorMsg('Please enter a job profile / role.');
      return;
    }
    if (!jobDescription.trim()) {
      setErrorMsg('Please enter a job description.');
      return;
    }
    if (!apiKey.trim()) {
      setErrorMsg('Please enter your Gemini API key.');
      return;
    }

    setLoading(true);

    try {
      const userRes = await fetch(`${API_BASE_URL}/api/users/check-username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() })
      });
      const userData = await userRes.json();
      if (!userRes.ok) {
        setErrorMsg(userData.message || 'Username already exists. Please choose another username.');
        setLoading(false);
        return;
      }

      if (!isKeyVerified) {
        const keyRes = await fetch(`${API_BASE_URL}/api/interview/verify-key`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Gemini-API-Key': apiKey.trim(),
            'X-Gemini-Model': selectedModel
          }
        });
        const keyData = await keyRes.json();
        if (!keyRes.ok || !keyData.valid) {
          setErrorMsg(keyData.message || "We couldn't reach the AI interviewer. Please check your API key or connection.");
          setLoading(false);
          return;
        }
      }

      const startRes = await fetch(`${API_BASE_URL}/api/interview/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gemini-API-Key': apiKey.trim(),
          'X-Gemini-Model': selectedModel
        },
        body: JSON.stringify({
          username: username.trim(),
          company: company.trim(),
          jobRole: jobRole.trim(),
          jobDescription: jobDescription.trim(),
          salary: salary.trim(),
          difficulty: difficulty,
          model: selectedModel
        })
      });

      const startData = await startRes.json();
      if (!startRes.ok) {
        setErrorMsg(startData.message || 'Failed to initialize interview.');
        setLoading(false);
        return;
      }

      onStartInterview({
        username: username.trim(),
        company: company.trim(),
        jobRole: jobRole.trim(),
        jobDescription: jobDescription.trim(),
        salary: salary.trim(),
        difficulty: difficulty,
        inputMode: inputMode,
        speakerEnabled: speakerEnabled,
        apiKey: apiKey.trim(),
        model: selectedModel,
        interviewId: startData.interviewId,
        initialTurn: startData.turn
      });

    } catch (err) {
      setErrorMsg('Connection error. Please check backend server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#ffffff] font-sans p-4 md:p-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-5xl space-y-5">

        {/* Top Header Banner */}
        <div className="bg-[#8b5cf6] text-white font-extrabold text-xl md:text-3xl text-center py-3.5 tracking-wider uppercase border-2 border-black">
          TRIVE
          <div className="text-base md:text-xl font-bold mt-0.5 text-[#ffcc00]">INTERVIEW PREPARATION AI</div>
        </div>

        {errorMsg && (
          <div className="bg-[#ffcc00] text-black font-bold p-3 text-center border-2 border-black font-mono text-xs md:text-sm leading-relaxed overflow-hidden">
            {errorMsg}
          </div>
        )}

        {/* Main Grid: Left Panel & Right Panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Left Panel (Light Blue) */}
          <div className="bg-[#93c5fd] p-4 border-2 border-black space-y-3.5">
            
            {/* Username */}
            <div>
              <div className="bg-[#000000] text-white font-mono font-bold text-xs md:text-sm px-3 py-1 uppercase">
                USERNAME (50 CHARACTERS MAX)
              </div>
              <input
                type="text"
                maxLength={50}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter unique username"
                className="w-full bg-[#ffffff] border-2 border-black p-2 font-mono font-bold text-black focus:outline-none mt-1 text-sm"
              />
            </div>

            {/* Company Name */}
            <div>
              <div className="bg-[#000000] text-white font-mono font-bold text-xs md:text-sm px-3 py-1 uppercase">
                COMPANY NAME (50 CHARACTERS MAX)
              </div>
              <input
                type="text"
                maxLength={50}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Accenture"
                className="w-full bg-[#ffffff] border-2 border-black p-2 font-mono font-bold text-black focus:outline-none mt-1 text-sm"
              />
            </div>

            {/* Job Profile */}
            <div>
              <div className="bg-[#000000] text-white font-mono font-bold text-xs md:text-sm px-3 py-1 uppercase">
                JOB PROFILE (MAX 50 CHARACTERS)
              </div>
              <input
                type="text"
                maxLength={50}
                value={jobRole}
                onChange={(e) => setJobRole(e.target.value)}
                placeholder="e.g. Software Engineer Intern"
                className="w-full bg-[#ffffff] border-2 border-black p-2 font-mono font-bold text-black focus:outline-none mt-1 text-sm"
              />
            </div>

            {/* Salary */}
            <div>
              <div className="bg-[#000000] text-white font-mono font-bold text-xs md:text-sm px-3 py-1 uppercase">
                SALARY (₹)
              </div>
              <input
                type="text"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="e.g. ₹8,00,000 / year"
                className="w-full bg-[#ffffff] border-2 border-black p-2 font-mono font-bold text-black focus:outline-none mt-1 text-sm"
              />
            </div>

          </div>

          {/* Right Panel (Light Green): Difficulty Level + Job Description */}
          <div className="bg-[#86efac] p-4 border-2 border-black flex flex-col space-y-3.5">
            
            {/* Difficulty Level 1 to 5 */}
            <div>
              <div className="bg-[#000000] text-white font-mono font-bold text-xs md:text-sm px-3 py-1 uppercase flex justify-between">
                <span>DIFFICULTY LEVEL (1 TO 5)</span>
                <span className="text-[#ffcc00] font-mono text-xs">
                  {difficulty === 1 ? '1 - EASIEST' : difficulty === 5 ? '5 - HARDEST' : `${difficulty} - MODERATE`}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2 mt-1 font-mono">
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setDifficulty(lvl)}
                    className={`py-1.5 font-extrabold text-xs md:text-sm border-2 border-black uppercase cursor-pointer transition-all ${
                      difficulty === lvl ? 'bg-[#ffcc00] text-black' : 'bg-white text-black hover:bg-gray-100'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Job Description */}
            <div className="flex-1 flex flex-col">
              <div className="bg-[#000000] text-white font-mono font-bold text-xs md:text-sm px-3 py-1 uppercase">
                JOB DESCRIPTION (3000 CHARACTERS MAX)
              </div>
              <textarea
                maxLength={3000}
                rows={6}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste job description context here..."
                className="w-full flex-1 bg-[#ffffff] border-2 border-black p-2.5 font-mono font-bold text-black focus:outline-none mt-1 resize-none text-xs md:text-sm"
              />
            </div>

          </div>

        </div>

        {/* Bottom Configuration Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
          
          {/* Gemini Box with 3.1 Flash as Default (6 Columns) */}
          <div className="md:col-span-6 bg-[#000000] p-3 border-2 border-black space-y-2 font-mono">
            
            {/* Model Dropdown */}
            <div>
              <select
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  setIsKeyVerified(false);
                }}
                className="w-full bg-[#ffcc00] border-2 border-black p-2 font-mono font-extrabold text-black focus:outline-none uppercase cursor-pointer text-xs md:text-sm"
              >
                {availableModels.map((m) => (
                  <option key={m.id} value={m.id} className="bg-white text-black font-mono">
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* API Key Input */}
            <div className="space-y-1">
              <div className="text-[#ffcc00] font-mono text-[10px] font-bold uppercase">
                (RECOMMENDED: NEW KEY AT AISTUDIO.GOOGLE.COM)
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setIsKeyVerified(false);
                  }}
                  placeholder="YOUR API KEY (GEMINI)"
                  className="w-full bg-[#ffcc00] border-2 border-black p-2 font-mono font-extrabold text-black placeholder-black/70 focus:outline-none text-xs md:text-sm"
                />
                {isKeyVerified && (
                  <span className="absolute right-2 top-2 text-black font-extrabold text-xs bg-[#86efac] px-1.5 py-0.5 border border-black">
                    ✓ VERIFIED
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleVerifyKey}
              disabled={keyVerifying}
              className="w-full bg-[#86efac] hover:bg-[#4ade80] text-black font-extrabold text-sm py-1.5 uppercase border-2 border-black cursor-pointer transition-all"
            >
              {keyVerifying ? 'VERIFYING...' : 'VERIFY KEY'}
            </button>
          </div>

          {/* Mode Toggles Box (Speaker OFF by Default) (3 Columns) */}
          <div className="md:col-span-3 bg-[#000000] p-3 border-2 border-black flex flex-col justify-between space-y-2 font-mono">
            <div className="text-white font-bold text-[10px] uppercase border-b border-gray-700 pb-1">
              SESSION PRESETS
            </div>

            {/* Input Mode Toggle */}
            <div>
              <div className="text-[#ffcc00] text-[10px] font-bold uppercase mb-1">CANDIDATE INPUT:</div>
              <button
                type="button"
                onClick={() => setInputMode((prev) => (prev === 'keyboard' ? 'mic' : 'keyboard'))}
                className={`w-full py-2 font-extrabold text-xs border-2 border-black uppercase cursor-pointer transition-all ${
                  inputMode === 'mic' ? 'bg-red-500 text-white animate-pulse' : 'bg-[#93c5fd] hover:bg-[#60a5fa] text-black'
                }`}
              >
                {inputMode === 'mic' ? '🎙 MIC MODE' : '⌨ KEYBOARD'}
              </button>
            </div>

            {/* Speaker Voice Output Toggle (Default OFF) */}
            <div>
              <div className="text-[#ffcc00] text-[10px] font-bold uppercase mb-1">INTERVIEWER VOICE:</div>
              <button
                type="button"
                onClick={() => setSpeakerEnabled((prev) => !prev)}
                className={`w-full py-2 font-extrabold text-xs border-2 border-black uppercase cursor-pointer transition-all ${
                  speakerEnabled ? 'bg-[#86efac] hover:bg-[#4ade80] text-black' : 'bg-gray-700 text-gray-300'
                }`}
              >
                {speakerEnabled ? '🔊 VOICE ON' : '🔇 VOICE OFF (DEFAULT)'}
              </button>
            </div>
          </div>

          {/* NEXT Button (3 Columns) */}
          <button
            type="button"
            onClick={handleNext}
            disabled={loading}
            className="md:col-span-3 bg-[#8b5cf6] hover:bg-[#7c3aed] text-[#ffcc00] font-extrabold text-xl md:text-2xl py-4 md:py-0 border-2 border-black uppercase cursor-pointer transition-all flex items-center justify-center"
          >
            {loading ? 'STARTING...' : 'NEXT'}
          </button>

        </div>

      </div>
    </div>
  );
}
