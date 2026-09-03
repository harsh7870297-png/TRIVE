import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';
import { logAnalyticsEvent, saveAnalyticsEventToFirestore } from '../config/firebase';

export default function InterviewDetails({ onStartInterview }) {
  const [defaultUsername] = useState(() => `user${Math.floor(1000 + Math.random() * 9000)}`);
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

  const [stats, setStats] = useState({
    siteVisits: 0,
    startedCount: 0,
    finishedCount: 0,
    avgQuitSeconds: 0,
    totalSurveys: 0,
    wouldUseAgainCount: 0,
    wouldReferCount: 0,
    avgPrice: 0
  });

  // Log site visit and fetch live platform statistics
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

    // Fetch live statistics
    fetch(`${API_BASE_URL}/api/analytics/stats`)
      .then((res) => res.json())
      .then((data) => {
        if (data) setStats(data);
      })
      .catch(() => {});

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

    // Auto-apply defaults if fields are left empty by user
    const finalUsername = username.trim() || defaultUsername;
    const finalCompany = company.trim() || 'google';
    const finalJobRole = jobRole.trim() || 'engineeer';
    const finalSalary = salary.trim() || '600000';
    const finalJobDescription = jobDescription.trim() || 'General software engineering role interview context.';

    if (!apiKey.trim()) {
      setErrorMsg('Please enter your Gemini API key.');
      return;
    }

    setLoading(true);

    try {
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
          username: finalUsername,
          company: finalCompany,
          jobRole: finalJobRole,
          jobDescription: finalJobDescription,
          salary: finalSalary,
          difficulty: difficulty,
          model: selectedModel
        })
      });

      const startData = await startRes.json();
      if (!startRes.ok) {
        setErrorMsg(startData.message || 'Failed to initialize interview session.');
        setLoading(false);
        return;
      }

      onStartInterview({
        interviewId: startData.interviewId,
        username: finalUsername,
        company: finalCompany,
        jobRole: finalJobRole,
        jobDescription: finalJobDescription,
        salary: finalSalary,
        difficulty: difficulty,
        apiKey: apiKey.trim(),
        model: selectedModel,
        inputMode: inputMode,
        speakerEnabled: speakerEnabled,
        initialTurn: startData.initialTurn
      });

    } catch (err) {
      setErrorMsg('Connection error. Please check backend server.');
    } finally {
      setLoading(false);
    }
  };

  const quitMins = Math.floor((stats.avgQuitSeconds || 0) / 60);
  const quitSecs = (stats.avgQuitSeconds || 0) % 60;

  return (
    <div className="h-screen w-full bg-[#ffffff] font-sans p-2 md:p-3 flex flex-col justify-between overflow-hidden select-none">

      {/* Top Header Banner */}
      <div className="bg-[#8b5cf6] text-white font-extrabold text-xl md:text-3xl text-center py-2 tracking-wider uppercase border-3 border-black shrink-0">
        TRIVE
        <div className="text-xs md:text-base font-bold text-[#ffcc00]">INTERVIEW PREPARATION AI</div>
      </div>

      {errorMsg && (
        <div className="bg-[#ffcc00] text-black font-bold p-2 text-center border-3 border-black font-mono text-xs md:text-sm shrink-0 leading-tight">
          {errorMsg}
        </div>
      )}

      {/* 4-Column Layout: Blue Region Sprites (Far Left) | Candidate Info (Green) | Difficulty & JD (Blue) | Green Region Stats (Far Right) */}
      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0 py-1.5">

        {/* 1. Far Left Panel (Blue Region: AI Interviewer Sprites with Entire Faces) */}
        <div className="col-span-3 bg-[#93c5fd] p-3 border-3 border-black flex flex-col justify-between min-h-0 space-y-2">
          <div className="bg-[#000000] text-white font-mono font-bold text-xs px-2.5 py-1 uppercase flex justify-between items-center shrink-0">
            <span>AI INTERVIEWER SPRITES</span>
            <span className="text-[#ffcc00] text-[10px]">PIXEL AVATARS</span>
          </div>
          
          <div className="flex-1 flex flex-col justify-between gap-2 min-h-0">
            {/* HR Sprite */}
            <div className="bg-[#ffffff] border-2 border-black p-1.5 flex flex-col items-center flex-1 min-h-0 justify-center">
              <div className="w-full flex-1 min-h-[85px] bg-white border border-black overflow-hidden relative flex items-center justify-center p-0.5">
                <img
                  src="/assets/avatars/hr/homepage_hr.png"
                  alt="HR Interviewer"
                  className="w-full h-full object-contain pixelated"
                />
              </div>
              <span className="font-mono font-extrabold text-[10px] md:text-xs text-black mt-1 uppercase tracking-wider shrink-0">
                HR INTERVIEWER
              </span>
            </div>

            {/* Technical Sprite */}
            <div className="bg-[#ffffff] border-2 border-black p-1.5 flex flex-col items-center flex-1 min-h-0 justify-center">
              <div className="w-full flex-1 min-h-[85px] bg-white border border-black overflow-hidden relative flex items-center justify-center p-0.5">
                <img
                  src="/assets/avatars/technical/homepage_technical.png"
                  alt="Technical Interviewer"
                  className="w-full h-full object-contain pixelated"
                />
              </div>
              <span className="font-mono font-extrabold text-[10px] md:text-xs text-black mt-1 uppercase tracking-wider shrink-0">
                TECHNICAL INTERVIEWER
              </span>
            </div>

            {/* Hiring Manager Sprite */}
            <div className="bg-[#ffffff] border-2 border-black p-1.5 flex flex-col items-center flex-1 min-h-0 justify-center">
              <div className="w-full flex-1 min-h-[85px] bg-white border border-black overflow-hidden relative flex items-center justify-center p-0.5">
                <img
                  src="/assets/avatars/hiring_manager/homepage_manager.png"
                  alt="Hiring Manager"
                  className="w-full h-full object-contain pixelated"
                />
              </div>
              <span className="font-mono font-extrabold text-[10px] md:text-xs text-black mt-1 uppercase tracking-wider shrink-0">
                HIRING MANAGER
              </span>
            </div>
          </div>
        </div>

        {/* 2. Middle-Left Panel (Green Region: Candidate Info Inputs) */}
        <div className="col-span-3 bg-[#86efac] p-3 border-3 border-black flex flex-col justify-between min-h-0 space-y-2">
          {/* Username */}
          <div>
            <div className="bg-[#000000] text-white font-mono font-bold text-xs px-2.5 py-1 uppercase">
              USERNAME (50 CHARACTERS MAX)
            </div>
            <input
              type="text"
              maxLength={50}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={defaultUsername}
              className="w-full bg-[#ffffff] border-2 border-black p-2 font-mono font-bold text-black focus:outline-none mt-0.5 text-xs md:text-sm placeholder:text-gray-400 placeholder:opacity-50"
            />
          </div>

          {/* Company Name */}
          <div>
            <div className="bg-[#000000] text-white font-mono font-bold text-xs px-2.5 py-1 uppercase">
              COMPANY NAME (50 CHARACTERS MAX)
            </div>
            <input
              type="text"
              maxLength={50}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="google"
              className="w-full bg-[#ffffff] border-2 border-black p-2 font-mono font-bold text-black focus:outline-none mt-0.5 text-xs md:text-sm placeholder:text-gray-400 placeholder:opacity-50"
            />
          </div>

          {/* Job Profile */}
          <div>
            <div className="bg-[#000000] text-white font-mono font-bold text-xs px-2.5 py-1 uppercase">
              JOB PROFILE (MAX 50 CHARACTERS)
            </div>
            <input
              type="text"
              maxLength={50}
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
              placeholder="engineeer"
              className="w-full bg-[#ffffff] border-2 border-black p-2 font-mono font-bold text-black focus:outline-none mt-0.5 text-xs md:text-sm placeholder:text-gray-400 placeholder:opacity-50"
            />
          </div>

          {/* Salary */}
          <div>
            <div className="bg-[#000000] text-white font-mono font-bold text-xs px-2.5 py-1 uppercase">
              SALARY (₹)
            </div>
            <input
              type="text"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              placeholder="600000"
              className="w-full bg-[#ffffff] border-2 border-black p-2 font-mono font-bold text-black focus:outline-none mt-0.5 text-xs md:text-sm placeholder:text-gray-400 placeholder:opacity-50"
            />
          </div>
        </div>

        {/* 3. Middle-Right Panel (Blue Region: Difficulty Level + Job Description) */}
        <div className="col-span-3 bg-[#93c5fd] p-3 border-3 border-black flex flex-col justify-between min-h-0 space-y-2">
          {/* Difficulty Level 1 to 5 */}
          <div className="shrink-0">
            <div className="bg-[#000000] text-white font-mono font-bold text-xs px-2.5 py-1 uppercase flex justify-between">
              <span>DIFFICULTY LEVEL (1 TO 5)</span>
              <span className="text-[#ffcc00] font-mono text-xs">
                {difficulty === 1 ? '1 - EASIEST' : difficulty === 5 ? '5 - HARDEST' : `${difficulty} - MODERATE`}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1 mt-1 font-mono">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setDifficulty(lvl)}
                  className={`py-1.5 font-extrabold text-xs border-2 border-black uppercase cursor-pointer transition-all ${
                    difficulty === lvl ? 'bg-[#ffcc00] text-black' : 'bg-white text-black hover:bg-gray-100'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Job Description */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="bg-[#000000] text-white font-mono font-bold text-xs px-2.5 py-1 uppercase shrink-0">
              JOB DESCRIPTION (OPTIONAL)
            </div>
            <textarea
              maxLength={3000}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste job description context here... (Optional)"
              className="w-full flex-1 bg-[#ffffff] border-2 border-black p-2 font-mono font-bold text-black focus:outline-none mt-0.5 resize-none text-xs md:text-sm min-h-0 placeholder:text-gray-400 placeholder:opacity-50"
            />
          </div>
        </div>

        {/* 4. Far Right Panel (Green Region: Live Community Statistics) */}
        <div className="col-span-3 bg-[#86efac] p-3 border-3 border-black flex flex-col justify-between min-h-0 space-y-2 font-mono">
          <div className="bg-[#000000] text-white font-mono font-bold text-xs px-2.5 py-1 uppercase flex justify-between items-center shrink-0">
            <span>📊 LIVE COMMUNITY METRICS</span>
            <span className="text-[#ffcc00] text-[10px] font-bold">REAL-TIME</span>
          </div>

          <div className="flex-1 flex flex-col justify-between gap-1.5 min-h-0">
            {/* Site Visits */}
            <div className="bg-[#ffcc00] p-1.5 border-2 border-black text-center flex flex-col justify-center flex-1">
              <div className="text-black text-[9px] uppercase font-extrabold">SITE VISITS</div>
              <div className="text-black font-extrabold text-sm md:text-base mt-0.5">{stats.siteVisits || 0}</div>
            </div>

            {/* Interview Started */}
            <div className="bg-[#ffcc00] p-1.5 border-2 border-black text-center flex flex-col justify-center flex-1">
              <div className="text-black text-[9px] uppercase font-extrabold">INTERVIEW STARTED</div>
              <div className="text-black font-extrabold text-sm md:text-base mt-0.5">{stats.startedCount || 0}</div>
            </div>

            {/* Interview Finished */}
            <div className="bg-[#ffcc00] p-1.5 border-2 border-black text-center flex flex-col justify-center flex-1">
              <div className="text-black text-[9px] uppercase font-extrabold">INTERVIEW FINISHED</div>
              <div className="text-black font-extrabold text-sm md:text-base mt-0.5">{stats.finishedCount || 0}</div>
            </div>

            {/* Would Use Again */}
            <div className="bg-[#ffcc00] p-1.5 border-2 border-black text-center flex flex-col justify-center flex-1">
              <div className="text-black text-[9px] uppercase font-extrabold">WOULD USE AGAIN</div>
              <div className="text-black font-extrabold text-sm md:text-base mt-0.5">
                {stats.totalSurveys > 0 ? Math.round((stats.wouldUseAgainCount / stats.totalSurveys) * 100) : 100}%
              </div>
            </div>

            {/* Avg Price Willing to Pay */}
            <div className="bg-[#ffcc00] p-1.5 border-2 border-black text-center flex flex-col justify-center flex-1">
              <div className="text-black text-[9px] uppercase font-extrabold">AVG PRICE WILLING TO PAY</div>
              <div className="text-black font-extrabold text-sm md:text-base mt-0.5">
                ₹{stats.avgPrice || 75}
              </div>
            </div>

            {/* Would Refer to Friend */}
            <div className="bg-[#ffcc00] p-1.5 border-2 border-black text-center flex flex-col justify-center flex-1">
              <div className="text-black text-[9px] uppercase font-extrabold">WOULD REFER TO FRIEND</div>
              <div className="text-black font-extrabold text-sm md:text-base mt-0.5">
                {stats.totalSurveys > 0 ? Math.round((stats.wouldReferCount / stats.totalSurveys) * 100) : 100}%
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Configuration Bar */}
      <div className="shrink-0 grid grid-cols-12 gap-3 items-stretch font-mono">
        
        {/* Gemini Box (6 Columns) */}
        <div className="col-span-6 bg-[#000000] p-2.5 border-3 border-black space-y-2">
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
          <div className="space-y-0.5">
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
                <span className="absolute right-1.5 top-1.5 text-black font-extrabold text-[10px] bg-[#86efac] px-1.5 py-0.5 border border-black">
                  ✓ VERIFIED
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleVerifyKey}
            disabled={keyVerifying}
            className="w-full bg-[#86efac] hover:bg-[#4ade80] text-black font-extrabold text-xs md:text-sm py-1.5 uppercase border-2 border-black cursor-pointer transition-all"
          >
            {keyVerifying ? 'VERIFYING...' : 'VERIFY KEY'}
          </button>
        </div>

        {/* Mode Toggles Box (3 Columns) */}
        <div className="col-span-3 bg-[#000000] p-2.5 border-3 border-black flex flex-col justify-between space-y-2">
          <div className="text-white font-bold text-[10px] uppercase border-b border-gray-700 pb-0.5">
            SESSION PRESETS
          </div>

          {/* Input Mode Toggle */}
          <div>
            <div className="text-[#ffcc00] text-[10px] font-bold uppercase mb-0.5">CANDIDATE INPUT:</div>
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

          {/* Speaker Voice Output Toggle */}
          <div>
            <div className="text-[#ffcc00] text-[10px] font-bold uppercase mb-0.5">INTERVIEWER VOICE:</div>
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
          className="col-span-3 bg-[#8b5cf6] hover:bg-[#7c3aed] text-[#ffcc00] font-extrabold text-xl md:text-2xl border-3 border-black uppercase cursor-pointer transition-all flex items-center justify-center"
        >
          {loading ? 'STARTING...' : 'NEXT'}
        </button>

      </div>

    </div>
  );
}
