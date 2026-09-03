import React, { useState, useEffect } from 'react';
import InterviewDetails from './components/InterviewDetails';
import InterviewRoom from './components/InterviewRoom';
import Survey from './components/Survey';
import Completion from './components/Completion';
import { API_BASE_URL } from './config/api';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#ffcc00] p-6 flex flex-col items-center justify-center font-mono border-4 border-black text-black">
          <div className="bg-red-600 text-white font-extrabold text-xl p-3 border-2 border-black mb-4 uppercase">
            ⚠️ Application Render Error Detected
          </div>
          <div className="bg-white p-4 border-2 border-black max-w-2xl text-xs overflow-auto mb-4 font-bold text-red-700">
            {this.state.error?.toString()}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-black text-white px-6 py-2 border-2 border-black font-extrabold uppercase hover:bg-gray-800 cursor-pointer"
          >
            🔄 Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  // State machine: "setup" | "room" | "survey" | "completed"
  const [currentStep, setCurrentStep] = useState('setup');
  const [interviewConfig, setInterviewConfig] = useState(null);

  // Log site visit analytics event on load
  useEffect(() => {
    try {
      fetch(`${API_BASE_URL}/api/analytics/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'SITE_VISIT',
          usernameOrSession: 'session_' + Math.random().toString(36).substring(2, 9)
        })
      });
    } catch (err) {}
  }, []);

  const handleStartInterview = (config) => {
    setInterviewConfig(config);
    setCurrentStep('room');
  };

  const handleNavigateToSurvey = () => {
    setCurrentStep('survey');
  };

  const handleFinishSurvey = () => {
    setCurrentStep('completed');
  };

  const handleRestart = () => {
    setInterviewConfig(null);
    setCurrentStep('setup');
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#efefef]">
        {currentStep === 'setup' && (
          <InterviewDetails onStartInterview={handleStartInterview} />
        )}

        {currentStep === 'room' && interviewConfig && (
          <InterviewRoom
            config={interviewConfig}
            onNavigateToSurvey={handleNavigateToSurvey}
            onBackToSetup={() => setCurrentStep('setup')}
          />
        )}

        {currentStep === 'survey' && (
          <Survey
            username={interviewConfig?.username}
            onFinish={handleFinishSurvey}
          />
        )}

        {currentStep === 'completed' && (
          <Completion onRestart={handleRestart} />
        )}
      </div>
    </ErrorBoundary>
  );
}
