import React, { useState, useEffect, useRef } from 'react';
import SpriteDisplay from './SpriteDisplay';
import { API_BASE_URL } from '../config/api';
import { generateTurnDirectly, generateEvaluationsDirectly } from '../services/directGeminiService';
import { recordStatEvent } from '../services/statsService';
import { saveInterviewSessionToFirestore } from '../config/firebase';

export default function InterviewRoom({ config, onNavigateToSurvey, onBackToSetup }) {
  // Timer state: 300 seconds (5 minutes)
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Camera Feed Visibility Toggle
  const [showCameraFeed, setShowCameraFeed] = useState(true);

  // Mode: "interviewing" | "evaluating" | "results"
  const [mode, setMode] = useState('interviewing');

  // Dynamic Expressions State for 3 Panel Members
  const [expressions, setExpressions] = useState({
    hr: 'satisfied',
    technical: 'thinking',
    hiring_manager: 'evaluating'
  });

  // Input & Speaker Presets from config
  const inputMode = config.inputMode || 'keyboard';
  const speakerEnabled = config.speakerEnabled === true;
  const [isListening, setIsListening] = useState(false);

  // Active dialogue and speaking interviewer: "HR" | "TECHNICAL" | "HIRING_MANAGER"
  const [speakingInterviewer, setSpeakingInterviewer] = useState(config.initialTurn?.speakingInterviewer || 'HR');
  const [dialogueState, setDialogueState] = useState({
    HR: config.initialTurn?.speakingInterviewer === 'HR' ? config.initialTurn.dialogue : 'Welcome to your panel interview.',
    TECHNICAL: config.initialTurn?.speakingInterviewer === 'TECHNICAL' ? config.initialTurn.dialogue : '(Listening...)',
    HIRING_MANAGER: (config.initialTurn?.speakingInterviewer === 'HIRING_MANAGER' || config.initialTurn?.speakingInterviewer === 'CRITIC') ? config.initialTurn.dialogue : '(Observing...)'
  });

  // Open box key
  const [openBoxKey, setOpenBoxKey] = useState(config.initialTurn?.speakingInterviewer || 'HR');

  // Conversation history
  const [conversationHistory, setConversationHistory] = useState([
    { Speaker: config.initialTurn?.speakingInterviewer || 'HR', Text: config.initialTurn?.dialogue || 'Welcome to your panel interview.' }
  ]);

  // Answer input & Submission state
  const [answerInput, setAnswerInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [evaluations, setEvaluations] = useState(null);

  // Behavioral & Vision Analysis Stats (Posture, Eye Wandering, Thinking Time, Filler Words)
  const [fillerWordCount, setFillerWordCount] = useState(0);
  const [fillerWordsList, setFillerWordsList] = useState([]);
  const [totalThinkingSeconds, setTotalThinkingSeconds] = useState(0);
  const [candidateTurnCount, setCandidateTurnCount] = useState(0);
  const [turnStartTime, setTurnStartTime] = useState(Date.now());

  // Specific Gaze & Posture Status: 'Centered' | 'Far Left' | 'Far Right' | 'Far Up' | 'Slouching'
  const [gazeStatus, setGazeStatus] = useState('Centered');
  const [gazeDeviations, setGazeDeviations] = useState(0);
  const [postureViolations, setPostureViolations] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

  // Calibrated Symmetry Ratios (Yaw & Pitch)
  const neutralBaselineRef = useRef(null);
  const isCalibratingRef = useRef(true);
  const calibrationSamplesRef = useRef([]);

  // Floating Draggable Video Feed Position
  const [videoPos, setVideoPos] = useState({ x: 30, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Persistent Media Stream Ref
  const mediaStreamRef = useRef(null);

  // Refs for Web APIs, Video element, Input focus, and Mic management
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const lastViolationTimeRef = useRef(0);
  const accumulatedTranscriptRef = useRef('');
  const hasFinishedRef = useRef(false);

  // Auto-focus input on mount and state changes
  useEffect(() => {
    if (mode === 'interviewing' && !isSubmitting) {
      inputRef.current?.focus();
    }
  }, [mode, isSubmitting, speakingInterviewer, inputMode]);

  // Speech Synthesis (TTS)
  useEffect(() => {
    if (speakerEnabled && mode === 'interviewing') {
      const currentDialogue = dialogueState[speakingInterviewer];
      if (currentDialogue && !currentDialogue.startsWith('(')) {
        speakInterviewerDialogue(speakingInterviewer, currentDialogue);
      }
    }
    setTurnStartTime(Date.now());
  }, [speakingInterviewer, dialogueState, speakerEnabled, mode]);

  // Persistent Refs for Mic accumulation and violation throttling
  const savedBaseTextRef = useRef('');
  const answerInputRef = useRef(answerInput);

  useEffect(() => {
    answerInputRef.current = answerInput;
  }, [answerInput]);

  const handleClearAnswer = () => {
    setAnswerInput('');
    savedBaseTextRef.current = '';
    if (accumulatedTranscriptRef.current !== undefined) {
      accumulatedTranscriptRef.current = '';
    }
  };

  // Speech Recognition Lifecycle Management
  const stopSpeechRecognition = () => {
    shouldListenRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const startSpeechRecognition = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Web Speech API not supported in this browser.");
      if (inputMode === 'mic') {
        setErrorMsg("Web Speech API is not supported in this browser (e.g. Firefox). Please use Chrome, Edge, or Safari, or switch input mode to KEYBOARD.");
      }
      return;
    }

    // Clean up existing instance
    stopSpeechRecognition();

    if (inputMode !== 'mic' || isMicMuted) {
      return;
    }

    shouldListenRef.current = true;

    // Explicit mic stream request to trigger browser permission popup if needed
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Release audio stream track so WebSpeech API can access mic
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (e) {
      console.warn('Microphone stream permission denied or error:', e);
      setErrorMsg('Microphone access denied. Click the lock/mic icon in your browser address bar and set Microphone to "Allow".');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMsg('');
      };

      recognition.onresult = (event) => {
        let sessionTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          sessionTranscript += event.results[i][0].transcript;
        }

        const base = savedBaseTextRef.current ? savedBaseTextRef.current.trim() : '';
        const current = sessionTranscript.trim();
        const fullText = base ? `${base} ${current}` : current;

        setAnswerInput(fullText);
        if (fullText) checkForFillerWords(fullText);
      };

      recognition.onerror = (err) => {
        const errType = err?.error || err;
        console.warn('Speech recognition error:', errType);
        if (errType === 'not-allowed' || errType === 'service-not-allowed') {
          setErrorMsg('Microphone access denied. Click the lock icon in your browser address bar and set Microphone to "Allow".');
          stopSpeechRecognition();
        } else if (errType === 'audio-capture') {
          setErrorMsg('No microphone detected by browser. Please check hardware connection and OS privacy settings.');
          stopSpeechRecognition();
        } else if (errType === 'network') {
          setErrorMsg('Speech recognition network error. Web Speech API requires an active internet connection.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        savedBaseTextRef.current = answerInputRef.current;

        // Auto-restart continuous listening with a fresh instance
        if (shouldListenRef.current && !isMicMuted) {
          setTimeout(() => {
            if (shouldListenRef.current && !isMicMuted) {
              startSpeechRecognition();
            }
          }, 250);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn('Failed to start SpeechRecognition:', e);
    }
  };

  // Toggle Mic Mute / Unmute
  const toggleMicMute = () => {
    if (isMicMuted) {
      setIsMicMuted(false);
      savedBaseTextRef.current = answerInputRef.current;
      startSpeechRecognition();
    } else {
      setIsMicMuted(true);
      stopSpeechRecognition();
    }
  };

  // Speech Recognition Setup Effect
  useEffect(() => {
    if (inputMode === 'mic') {
      savedBaseTextRef.current = answerInputRef.current;
      startSpeechRecognition();
    } else {
      stopSpeechRecognition();
    }

    return () => {
      stopSpeechRecognition();
    };
  }, [inputMode, isMicMuted]);

  // Request & Re-bind Camera Stream
  const requestCameraAccess = async () => {
    setCameraError('');
    try {
      if (!mediaStreamRef.current || !mediaStreamRef.current.active) {
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      }
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStreamRef.current;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err) {
      setCameraActive(false);
      setCameraError('Camera access denied or unavailable.');
    }
  };

  // Re-bind video stream when showCameraFeed turns back ON
  useEffect(() => {
    if (showCameraFeed && mode === 'interviewing') {
      requestCameraAccess();
    }
  }, [showCameraFeed, mode]);

  // Trigger Instant Recalibration
  const handleCalibrateNeutral = () => {
    calibrationSamplesRef.current = [];
    isCalibratingRef.current = true;
    neutralBaselineRef.current = null;
    setGazeStatus('Calibrating...');
  };

  // HIGH-PRECISION CALIBRATED FACIAL SYMMETRY ROTATION MATRIX
  useEffect(() => {
    let animationFrame = null;

    if (mode === 'interviewing') {
      const analyzeFrame = () => {
        const canvas = canvasRef.current;
        const video = videoRef.current;

        if (canvas && video && video.readyState === 4) {
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, 160, 120);
          const frame = ctx.getImageData(0, 0, 160, 120);
          const pixels = frame.data;

          let minX = 160, maxX = 0, minY = 120, maxY = 0;
          let skinPixels = [];

          for (let i = 0; i < pixels.length; i += 16) {
            const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
            if (r > 45 && g > 30 && b > 15 && r > g && r > b) {
              const pixelIndex = i / 4;
              const x = pixelIndex % 160;
              const y = Math.floor(pixelIndex / 160);

              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;

              skinPixels.push({ x, y });
            }
          }

          const skinCount = skinPixels.length;

          if (skinCount > 20) {
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;

            let leftHalfCount = 0, topHalfCount = 0;
            let sumY = 0;

            skinPixels.forEach((p) => {
              if (p.x < centerX) leftHalfCount++;
              if (p.y < centerY) topHalfCount++;
              sumY += p.y;
            });

            const currentYawRatio = leftHalfCount / skinCount;
            const currentPitchRatio = topHalfCount / skinCount;
            const currentAvgY = sumY / skinCount;

            if (isCalibratingRef.current) {
              calibrationSamplesRef.current.push({
                yaw: currentYawRatio,
                pitch: currentPitchRatio,
                avgY: currentAvgY
              });

              if (calibrationSamplesRef.current.length >= 10) {
                const samples = calibrationSamplesRef.current;
                const baseYaw = samples.reduce((a, b) => a + b.yaw, 0) / samples.length;
                const basePitch = samples.reduce((a, b) => a + b.pitch, 0) / samples.length;
                const baseAvgY = samples.reduce((a, b) => a + b.avgY, 0) / samples.length;

                neutralBaselineRef.current = { yawRatio: baseYaw, pitchRatio: basePitch, avgY: baseAvgY };
                isCalibratingRef.current = false;
                setGazeStatus('Centered');
              }
            } 
            else if (neutralBaselineRef.current) {
              const base = neutralBaselineRef.current;
              const yawDev = currentYawRatio - base.yawRatio;
              const pitchDev = currentPitchRatio - base.pitchRatio;
              const yDev = currentAvgY - base.avgY;
              const now = Date.now();
              const canIncrement = now - lastViolationTimeRef.current > 1200;

              // Significantly lower sensitivity (wider thresholds)
              if (yawDev > 0.16) {
                setGazeStatus('Far Right');
                if (canIncrement) {
                  setGazeDeviations((prev) => prev + 1);
                  lastViolationTimeRef.current = now;
                }
              } else if (yawDev < -0.16) {
                setGazeStatus('Far Left');
                if (canIncrement) {
                  setGazeDeviations((prev) => prev + 1);
                  lastViolationTimeRef.current = now;
                }
              } else if (pitchDev > 0.16) {
                setGazeStatus('Far Up');
                if (canIncrement) {
                  setGazeDeviations((prev) => prev + 1);
                  lastViolationTimeRef.current = now;
                }
              } else if (pitchDev < -0.16 || yDev > 32 || currentAvgY > 105) {
                setGazeStatus('Slouching');
                if (canIncrement) {
                  setPostureViolations((prev) => prev + 1);
                  lastViolationTimeRef.current = now;
                }
              } else {
                setGazeStatus('Centered');
              }
            }

          } else {
            setGazeStatus('Slouching');
            setPostureViolations((prev) => prev + 1);
          }
        }
        animationFrame = requestAnimationFrame(analyzeFrame);
      };

      analyzeFrame();
    }

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [mode]);

  // Floating Video Drag Handlers
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - videoPos.x,
      y: e.clientY - videoPos.y
    });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setVideoPos({
        x: Math.max(5, Math.min(window.innerWidth - 240, e.clientX - dragOffset.x)),
        y: Math.max(5, Math.min(window.innerHeight - 200, e.clientY - dragOffset.y))
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Speak Dialogue Function
  const speakInterviewerDialogue = (interviewer, text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    if (interviewer === 'HR') {
      utterance.pitch = 1.1;
      utterance.rate = 1.0;
    } else if (interviewer === 'TECHNICAL') {
      utterance.pitch = 0.85;
      utterance.rate = 1.05;
    } else {
      utterance.pitch = 0.95;
      utterance.rate = 0.95;
    }

    window.speechSynthesis.speak(utterance);
  };

  // Check and List Specific Filler Words
  const checkForFillerWords = (text) => {
    const fillers = ['um', 'uh', 'like', 'you know', 'basically', 'actually'];
    const words = text.toLowerCase().split(/\s+/);
    let count = 0;
    const foundList = new Set(fillerWordsList);

    words.forEach((w) => {
      const cleanW = w.replace(/[^a-z]/g, '');
      if (fillers.includes(cleanW)) {
        count++;
        foundList.add(cleanW);
      }
    });

    setFillerWordCount((prev) => Math.max(prev, count));
    setFillerWordsList(Array.from(foundList));
  };

  // Auto-close previous speaker box and open new speaker box
  useEffect(() => {
    if (speakingInterviewer) {
      const normalizedKey = speakingInterviewer === 'CRITIC' ? 'HIRING_MANAGER' : speakingInterviewer;
      setOpenBoxKey(normalizedKey);
    }
  }, [speakingInterviewer]);

  // Timer interval
  useEffect(() => {
    let interval = null;
    if (isTimerRunning && mode === 'interviewing') {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => {
          if (prev >= 300) {
            clearInterval(interval);
            return 300;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, mode]);

  useEffect(() => {
    if (elapsedSeconds >= 300 && mode === 'interviewing') {
      handleFinishInterview();
    }
  }, [elapsedSeconds, mode]);

  const toggleBox = (interviewerKey) => {
    setOpenBoxKey((prev) => (prev === interviewerKey ? null : interviewerKey));
  };

  const handleSendAnswer = async () => {
    if (!answerInput.trim() || isSubmitting) return;

    if (inputMode === 'mic') {
      stopSpeechRecognition();
    }

    const turnLatency = Math.round((Date.now() - turnStartTime) / 1000);
    setTotalThinkingSeconds((prev) => prev + turnLatency);
    setCandidateTurnCount((prev) => prev + 1);

    const currentAnswer = answerInput.trim();
    setAnswerInput('');
    setIsSubmitting(true);
    setErrorMsg('');

    const updatedHistory = [...conversationHistory, { Speaker: 'CANDIDATE', Text: currentAnswer }];
    setConversationHistory(updatedHistory);

    let data = null;
    try {
      const res = await fetch(`${API_BASE_URL}/api/interview/turn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gemini-API-Key': config.apiKey,
          'X-Gemini-Model': config.model
        },
        body: JSON.stringify({
          interviewId: config.interviewId,
          company: config.company,
          jobRole: config.jobRole,
          jobDescription: config.jobDescription,
          salary: config.salary,
          difficulty: config.difficulty || 3,
          model: config.model,
          history: updatedHistory,
          latestAnswer: currentAnswer,
          elapsedSeconds: elapsedSeconds
        })
      });

      if (res.ok) {
        data = await res.json();
      }
    } catch (err) {}

    if (!data) {
      try {
        data = await generateTurnDirectly({
          apiKey: config.apiKey,
          model: config.model,
          company: config.company,
          jobRole: config.jobRole,
          jobDescription: config.jobDescription,
          salary: config.salary,
          difficulty: config.difficulty || 3,
          history: updatedHistory,
          latestAnswer: currentAnswer,
          elapsedSeconds: elapsedSeconds
        });
      } catch (directErr) {
        setErrorMsg(directErr.message || 'Error communicating with AI interviewer.');
      }
    }

    if (data) {
      const nextSpeaker = data.speakingInterviewer === 'CRITIC' ? 'HIRING_MANAGER' : data.speakingInterviewer;
      setSpeakingInterviewer(nextSpeaker);
      setDialogueState((prev) => ({
        ...prev,
        [nextSpeaker]: data.dialogue
      }));

      if (data.expressions) {
        setExpressions(data.expressions);
      }

      const newHistory = [...updatedHistory, { Speaker: nextSpeaker, Text: data.dialogue }];
      setConversationHistory(newHistory);

      if (data.isConcluded || elapsedSeconds >= 300) {
        handleFinishInterview(newHistory);
      }
    }

    setIsSubmitting(false);
    if (inputMode === 'mic' && !isMicMuted) {
      setTimeout(() => { startSpeechRecognition(); }, 300);
    }
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleEarlyQuit = async () => {
    try {
      if (config.interviewId) {
        await fetch(`${API_BASE_URL}/api/interview/stop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            interviewId: config.interviewId,
            exitTimeSeconds: Math.max(elapsedSeconds, 1)
          })
        });
      }
    } catch (e) {}
    onBackToSetup();
  };

  const handleStopInterview = () => {
    setIsTimerRunning(false);

    try {
      fetch(`${API_BASE_URL}/api/interview/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewId: config.interviewId,
          exitTimeSeconds: elapsedSeconds
        })
      }).catch(() => {});
    } catch (err) {}

    handleFinishInterview(conversationHistory);
  };

  const handleFinishInterview = async (historyToUse = conversationHistory) => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;

    setIsTimerRunning(false);
    setMode('evaluating');
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    try {
      await recordStatEvent('INTERVIEW_FINISHED', { username: config.username, company: config.company });
    } catch (e) {}

    let evals = null;
    try {
      const res = await fetch(`${API_BASE_URL}/api/interview/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gemini-API-Key': config.apiKey,
          'X-Gemini-Model': config.model
        },
        body: JSON.stringify({
          interviewId: config.interviewId,
          company: config.company,
          jobRole: config.jobRole,
          jobDescription: config.jobDescription,
          model: config.model,
          history: historyToUse,
          elapsedSeconds: elapsedSeconds
        })
      });

      if (res.ok) {
        evals = await res.json();
      }
    } catch (err) {}

    if (!evals) {
      try {
        evals = await generateEvaluationsDirectly({
          apiKey: config.apiKey,
          model: config.model,
          company: config.company,
          jobRole: config.jobRole,
          jobDescription: config.jobDescription,
          history: historyToUse
        });
      } catch (e) {}
    }

    if (!evals || !evals.hr) {
      evals = {
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

    setEvaluations(evals);

    // Save complete session record (Setup details, full transcript, behavioral metrics & interviewer scorecards) to Firebase Firestore safely
    try {
      saveInterviewSessionToFirestore({
        interviewId: config.interviewId || `session-${Date.now()}`,
        username: config.username || 'anonymous',
        company: config.company || '',
        jobRole: config.jobRole || '',
        jobDescription: config.jobDescription || '',
        salary: config.salary || '',
        difficulty: config.difficulty || 3,
        model: config.model || 'gemini-2.0-flash',
        elapsedSeconds: elapsedSeconds || 0,
        transcript: historyToUse || [],
        behavioralStats: {
          gazeDeviationsCount: gazeDeviations || 0,
          postureViolationsCount: postureViolations || 0,
          fillerWordCount: fillerWordCount || 0,
          fillerWordsList: Array.isArray(fillerWordsList) ? fillerWordsList : [],
          avgThinkingTime: candidateTurnCount > 0 ? (totalThinkingSeconds / candidateTurnCount).toFixed(1) : '0.0'
        },
        evaluations: evals
      });
    } catch (saveErr) {
      console.warn("Firestore session save warning:", saveErr);
    }

    setMode('results');
  };

  const formatTime = (secs) => {
    const remaining = Math.max(0, 300 - secs);
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isSoftStopActive = elapsedSeconds >= 270;
  const avgThinkingTime = candidateTurnCount > 0 ? (totalThinkingSeconds / candidateTurnCount).toFixed(1) : '0.0';

  const getGazeAlertMessage = () => {
    switch (gazeStatus) {
      case 'Calibrating...':
        return '🎯 CALIBRATING NORMAL SEATING POSTURE...';
      case 'Far Left':
        return '⚠️ LOOKING LEFT: PLEASE MAINTAIN EYE CONTACT';
      case 'Far Right':
        return '⚠️ LOOKING RIGHT: PLEASE MAINTAIN EYE CONTACT';
      case 'Far Up':
        return '⚠️ LOOKING UP: PLEASE MAINTAIN EYE CONTACT';
      case 'Slouching':
        return '⚠️ SLOUCHING / LOOKING DOWN: PLEASE SIT UPRIGHT';
      default:
        return '✓ POSTURE & EYE CONTACT: EXCELLENT';
    }
  };

  const renderInterviewerColumn = (key, label, accentColor) => {
    const isSpeaking = speakingInterviewer === key;
    const isOpen = mode === 'results' || openBoxKey === key;
    const evalData = evaluations ? (key === 'HIRING_MANAGER' ? (evaluations.hiringManager || evaluations.critic) : evaluations[key.toLowerCase()]) : null;

    const exprKey = key === 'HIRING_MANAGER' ? 'hiring_manager' : key.toLowerCase();
    const currentExpression = expressions[exprKey] || 'default';

    return (
      <div className="flex flex-col flex-1 relative h-full overflow-hidden">
        {/* Full Portrait Sprite with Expression */}
        <div className="flex-1 w-full h-full relative overflow-hidden">
          <SpriteDisplay type={key.toLowerCase()} expression={currentExpression} />

          {/* Speaking Indicator Badge */}
          {isSpeaking && mode === 'interviewing' && (
            <div className="absolute top-12 left-2 bg-[#ffcc00] text-black font-mono font-extrabold text-[10px] md:text-xs px-2 py-0.5 border border-black z-20 animate-pulse">
              ● SPEAKING
            </div>
          )}

          {/* Toggle Arrow Button */}
          {mode === 'interviewing' && (
            <button
              type="button"
              onClick={() => toggleBox(key)}
              title={isOpen ? "Close Dialogue" : "Open Dialogue"}
              className="absolute bottom-2 right-2 bg-black text-[#ffcc00] border-white text-xs px-2.5 py-1 border z-30 cursor-pointer font-mono flex items-center gap-1 shadow-md"
            >
              <span className="font-bold">{isOpen ? '▼' : '▲'}</span>
              <span className="text-[10px] uppercase text-white">{isOpen ? 'CLOSE' : 'DIALOGUE'}</span>
            </button>
          )}
        </div>

        {/* Collapsible Dialogue Text Box */}
        {isOpen && (
          <div className="bg-black text-white p-3 border-t-2 border-black font-mono z-20 transition-all duration-200">
            {mode === 'results' && evalData ? (
              <div className="space-y-2">
                <div className="font-extrabold text-xs md:text-sm uppercase border-b border-gray-700 pb-1" style={{ color: accentColor }}>
                  {label} ASSESSMENT
                </div>

                {/* Real-time Delivery Stats in HR Assessment */}
                {key === 'HR' && (
                  <div className="bg-white/10 p-1.5 border border-purple-500 text-[10px] space-y-0.5 text-gray-200">
                    <div className="text-[#c084fc] font-bold">DELIVERY & POSTURE METRICS:</div>
                    <div>• Posture Stability: {postureViolations > 10 ? '❌ Slouching / Looking Down Detected' : '✓ Upright & Posture Stable'}</div>
                    <div>• Eye Contact Gaze: {gazeDeviations > 15 ? '⚠️ High Wandering / Unstable' : '✓ Centered & Focused'}</div>
                    <div>• Filler Words Detected: {fillerWordCount} {fillerWordsList.length > 0 ? `("${fillerWordsList.join('", "')}")` : ''}</div>
                    <div>• Avg Thinking Time: {avgThinkingTime}s per turn</div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-1 text-[10px] md:text-[11px]">
                  {(evalData.metrics || []).map((m, idx) => (
                    <div key={idx} className="bg-white/10 p-1 border border-gray-700 flex justify-between">
                      <span>{m.label}:</span>
                      <span className="font-bold" style={{ color: accentColor }}>{m.score}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] md:text-[11px] text-gray-300 leading-tight border-t border-gray-700 pt-1">
                  {evalData.feedback}
                </p>
              </div>
            ) : (
              <div>
                <div className="text-[10px] font-bold uppercase mb-1 flex items-center justify-between" style={{ color: accentColor }}>
                  <span>{label} INTERVIEWER</span>
                </div>
                <p className="text-xs md:text-sm leading-snug text-gray-100 max-h-24 overflow-y-auto">
                  "{dialogueState[key]}"
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen bg-[#000000] font-sans p-2 flex flex-col justify-between space-y-2 select-none relative">
      
      {/* Canvas for Vision Tracking */}
      <canvas ref={canvasRef} width="160" height="120" className="hidden" />

      {/* TOP-LEVEL FLOATING CANDIDATE CAMERA FEED WITH CALIBRATE BUTTON */}
      {showCameraFeed && mode === 'interviewing' && (
        <div
          style={{ left: `${videoPos.x}px`, top: `${videoPos.y}px` }}
          className="fixed z-[9999] w-64 bg-black border-4 border-[#ffcc00] shadow-2xl rounded-sm overflow-hidden select-none cursor-move"
        >
          {/* Header Bar */}
          <div
            onMouseDown={handleMouseDown}
            className="bg-[#ffcc00] text-black font-mono font-extrabold text-[11px] px-2 py-1 uppercase flex items-center justify-between cursor-grab active:cursor-grabbing border-b-2 border-black"
          >
            <span>📷 CANDIDATE FEED</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCalibrateNeutral}
                title="Recalibrate your neutral seating posture"
                className="text-[9px] bg-black text-[#ffcc00] hover:bg-gray-900 px-1.5 py-0.5 border border-black uppercase cursor-pointer"
              >
                🎯 CALIBRATE
              </button>
              <button
                type="button"
                onClick={() => setShowCameraFeed(false)}
                className="text-[10px] bg-black text-white hover:bg-gray-800 px-1.5 py-0.5 uppercase cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Video Preview */}
          <div className="relative w-full h-44 bg-gray-900 flex items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-full object-cover scale-x-[-1] ${cameraActive ? 'block' : 'hidden'}`}
            />

            {!cameraActive && (
              <div className="p-3 text-center font-mono space-y-2">
                <div className="text-[#ffcc00] font-bold text-xs">📷 CAMERA FEED</div>
                <button
                  type="button"
                  onClick={requestCameraAccess}
                  className="bg-[#ffcc00] hover:bg-[#e6b800] text-black font-extrabold text-[11px] px-3 py-1 border border-black uppercase cursor-pointer"
                >
                  START CAMERA
                </button>
                {cameraError && <div className="text-red-400 text-[10px]">{cameraError}</div>}
              </div>
            )}

            {/* Specific In-Video Live Alert Banner */}
            <div className={`absolute bottom-0 inset-x-0 p-1.5 font-mono text-[9px] font-extrabold uppercase text-center border-t-2 border-black z-10 leading-tight ${
              gazeStatus === 'Slouching'
                ? 'bg-red-600 text-white animate-pulse'
                : gazeStatus !== 'Centered'
                ? 'bg-amber-500 text-black'
                : 'bg-black/90 text-[#86efac]'
            }`}>
              {getGazeAlertMessage()}
            </div>
          </div>
        </div>
      )}

      {/* Session Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#ffffff] border-4 border-black p-6 w-full max-w-lg space-y-4 font-mono">
            <div className="bg-[#8b5cf6] text-[#ffcc00] font-extrabold text-lg p-2 border-2 border-black uppercase text-center">
              INTERVIEW DETAILS & SESSION INFO
            </div>

            <div className="space-y-2 text-xs md:text-sm text-black">
              <div className="p-2 bg-[#93c5fd] border border-black">
                <span className="font-bold">CANDIDATE:</span> {config.username}
              </div>
              <div className="p-2 bg-[#86efac] border border-black">
                <span className="font-bold">COMPANY & ROLE:</span> {config.company} ({config.jobRole})
              </div>
              {config.salary && (
                <div className="p-2 bg-[#ffcc00] border border-black">
                  <span className="font-bold">SALARY CONTEXT:</span> {config.salary}
                </div>
              )}
              <div className="p-2 bg-gray-100 border border-black max-h-36 overflow-y-auto">
                <span className="font-bold">JOB DESCRIPTION:</span>
                <p className="mt-1 text-gray-800 text-xs leading-relaxed">{config.jobDescription}</p>
              </div>
              <div className="p-2 bg-black text-white border border-black flex justify-between">
                <span>TIME REMAINING: {formatTime(elapsedSeconds)}</span>
                <span>ELAPSED: {elapsedSeconds}s / 300s</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowDetailsModal(false)}
              className="w-full bg-[#ffcc00] hover:bg-[#e6b800] text-black font-extrabold py-2 uppercase border-2 border-black cursor-pointer"
            >
              CLOSE DETAILS
            </button>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="bg-[#ffcc00] text-black font-bold p-2 text-center border-2 border-black font-mono text-xs z-30">
          {errorMsg}
        </div>
      )}

      {/* Unified Seamless Panel Row */}
      <div className="flex-1 grid grid-cols-3 gap-0 border-2 border-black bg-black overflow-hidden relative">
        {renderInterviewerColumn('HR', 'HR', '#c084fc')}
        {renderInterviewerColumn('TECHNICAL', 'TECHNICAL', '#93c5fd')}
        {renderInterviewerColumn('HIRING_MANAGER', 'HIRING MANAGER', '#86efac')}
      </div>

      {/* USER ANSWER INPUT SECTION & RIGHT CONTROL BOX WITH SHOW/HIDE CAMERA & TIMER */}
      <div className="bg-[#000000] p-2.5 border-2 border-white/20 flex flex-col md:flex-row items-stretch gap-2.5">
        
        {/* Taller Answer Input Textarea */}
        <textarea
          ref={inputRef}
          rows={3}
          value={answerInput}
          onChange={(e) => {
            setAnswerInput(e.target.value);
            checkForFillerWords(e.target.value);
          }}
          disabled={mode !== 'interviewing' || isSubmitting}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendAnswer();
            }
          }}
          placeholder={
            mode !== 'interviewing'
              ? 'Interview complete. View evaluations above.'
              : inputMode === 'mic'
              ? isMicMuted
                ? '🔇 MIC MUTED. CLICK "MIC MUTED (OFF)" BUTTON TO UNMUTE AND SPEAK, OR TYPE HERE...'
                : '🎙 LISTENING... SPEAK YOUR ANSWER OR TYPE HERE, THEN PRESS ENTER OR SUBMIT...'
              : '⌨ TYPE YOUR ANSWER HERE AND PRESS ENTER TO SUBMIT...'
          }
          className="flex-1 w-full bg-[#000000] text-[#ffcc00] border-2 border-[#ffcc00] p-3 font-mono font-bold focus:outline-none placeholder-gray-500 text-xs md:text-sm resize-none"
        />

        {/* CLEAR ANSWER BUTTON */}
        {Boolean(answerInput.trim()) && (
          <button
            type="button"
            onClick={handleClearAnswer}
            disabled={mode !== 'interviewing' || isSubmitting}
            className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs md:text-sm px-3 py-3 uppercase border-2 border-black cursor-pointer transition-all flex items-center justify-center gap-1 shrink-0"
            title="Clear entire answer input text"
          >
            ✕ CLEAR
          </button>
        )}

        {/* MIC MUTE / UNMUTE TOGGLE BUTTON (When in Mic Mode) */}
        {inputMode === 'mic' && (
          <button
            type="button"
            onClick={toggleMicMute}
            className={`px-4 py-3 font-extrabold text-xs md:text-sm uppercase border-2 border-black cursor-pointer transition-all flex items-center justify-center gap-1.5 min-w-[150px] ${
              isMicMuted
                ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                : 'bg-[#86efac] hover:bg-[#4ade80] text-black'
            }`}
            title={isMicMuted ? 'Microphone muted. Click to UNMUTE' : 'Microphone active. Click to MUTE (prevents ambient noise)'}
          >
            {isMicMuted ? '🔇 MIC MUTED (OFF)' : '🎙 MIC ON (LISTENING)'}
          </button>
        )}

        {/* SUBMIT ANSWER BUTTON */}
        <button
          type="button"
          onClick={handleSendAnswer}
          disabled={mode !== 'interviewing' || isSubmitting || !answerInput.trim()}
          className="bg-[#ffcc00] hover:bg-[#e6b800] text-black font-extrabold text-xs md:text-sm px-6 py-3 uppercase border-2 border-black cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center min-w-[140px]"
        >
          {isSubmitting ? 'SUBMITTING...' : 'SUBMIT ANSWER'}
        </button>

        {/* RIGHT CONTROL PANEL */}
        <div className="flex flex-col justify-between gap-1.5 min-w-[180px] font-mono">
          <button
            type="button"
            onClick={() => setShowCameraFeed(!showCameraFeed)}
            className={`w-full py-2 font-extrabold text-xs uppercase border-2 border-black cursor-pointer transition-all ${
              showCameraFeed ? 'bg-[#93c5fd] hover:bg-[#60a5fa] text-black' : 'bg-gray-700 text-gray-200'
            }`}
          >
            {showCameraFeed ? '📷 HIDE CAMERA' : '📷 SHOW CAMERA'}
          </button>

          <button
            type="button"
            onClick={() => setShowDetailsModal(true)}
            title="Click to view interview details"
            className={`w-full py-2.5 font-extrabold text-sm uppercase border-2 border-black cursor-pointer transition-all text-center ${
              isSoftStopActive ? 'bg-red-600 text-white animate-bounce' : 'bg-[#ffcc00] hover:bg-[#e6b800] text-black'
            }`}
          >
            ⏱ {formatTime(elapsedSeconds)}
          </button>
        </div>

      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={handleEarlyQuit}
          className="bg-[#93c5fd] hover:bg-[#60a5fa] text-black font-extrabold text-xs md:text-sm py-2 border-2 border-black uppercase cursor-pointer transition-all text-center"
        >
          PREVIOUS WINDOW
        </button>

        <button
          type="button"
          onClick={handleStopInterview}
          disabled={mode !== 'interviewing'}
          className="bg-[#ffcc00] hover:bg-[#e6b800] text-black font-extrabold text-xs md:text-sm py-2 border-2 border-black uppercase cursor-pointer transition-all text-center disabled:opacity-50"
        >
          INTERVIEW STOP
        </button>

        <button
          type="button"
          onClick={() => onNavigateToSurvey(evaluations)}
          disabled={mode !== 'results'}
          className={`font-extrabold text-xs md:text-sm py-2 border-2 border-black uppercase transition-all text-center ${
            mode === 'results' ? 'bg-[#8b5cf6] hover:bg-[#7c3aed] text-white animate-bounce cursor-pointer' : 'bg-[#1e1e1e] text-gray-500 cursor-not-allowed opacity-50'
          }`}
        >
          NEXT
        </button>
      </div>

    </div>
  );
}
