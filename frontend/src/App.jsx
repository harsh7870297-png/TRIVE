import React, { useState, useEffect } from 'react';
import InterviewDetails from './components/InterviewDetails';
import InterviewRoom from './components/InterviewRoom';
import Survey from './components/Survey';
import Completion from './components/Completion';

export default function App() {
  // State machine: "setup" | "room" | "survey" | "completed"
  const [currentStep, setCurrentStep] = useState('setup');
  const [interviewConfig, setInterviewConfig] = useState(null);

  // Log site visit analytics event on load
  useEffect(() => {
    try {
      fetch('http://localhost:5000/api/analytics/event', {
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
  );
}
