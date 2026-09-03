import React, { useState } from 'react';
import { API_BASE_URL } from '../config/api';
import { logAnalyticsEvent, saveSurveyToFirestore } from '../config/firebase';

export default function Survey({ username, onFinish }) {
  const [wouldUseAgain, setWouldUseAgain] = useState(true);
  const [willingToPay, setWillingToPay] = useState(false);
  const [priceRange, setPriceRange] = useState('₹50–100');
  const [wouldRefer, setWouldRefer] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrorMsg('');

    const surveyPayload = {
      username: username || 'anonymous',
      wouldUseAgain,
      willingToPay,
      priceRange: willingToPay ? priceRange : null,
      wouldRefer
    };

    // Save directly to Firebase Firestore & GA4
    await saveSurveyToFirestore(surveyPayload);
    logAnalyticsEvent('survey_submitted', surveyPayload);

    try {
      await fetch(`${API_BASE_URL}/api/survey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(surveyPayload)
      });
    } catch (err) {}

    setSubmitting(false);
    onFinish();
  };

  return (
    <div className="min-h-screen bg-[#ffffff] font-sans p-4 md:p-10 flex flex-col justify-between items-center select-none">
      <div className="w-full max-w-6xl space-y-8 my-auto">

        {/* Top Header Banner: Yellow Background, Black Text */}
        <div className="bg-[#ffcc00] text-black font-extrabold text-3xl md:text-5xl text-center py-6 uppercase tracking-wider border-3 border-black">
          SURVEY
        </div>

        {errorMsg && (
          <div className="bg-[#ffcc00] text-black font-bold p-4 text-center border-3 border-black font-mono text-base md:text-lg">
            {errorMsg}
          </div>
        )}

        {/* Question Rows - Light Blue, Light Green, Purple Accent */}
        <div className="space-y-8">

          {/* Question 1 */}
          <div className="flex flex-col md:flex-row items-stretch gap-6">
            <div className="flex-1 bg-[#93c5fd] text-black font-mono font-bold text-xl md:text-2xl p-6 flex items-center border-3 border-black">
              WOULD YOU USE THIS AGAIN?
            </div>
            <button
              type="button"
              onClick={() => setWouldUseAgain(!wouldUseAgain)}
              className="w-full md:w-64 bg-[#ffcc00] hover:bg-[#e6b800] text-black font-extrabold text-2xl py-6 border-3 border-black uppercase cursor-pointer transition-all text-center"
            >
              {wouldUseAgain ? 'YES' : 'NO'}
            </button>
          </div>

          {/* Question 2 */}
          <div className="flex flex-col md:flex-row items-stretch gap-6">
            <div className="flex-1 bg-[#86efac] text-black font-mono font-bold text-xl md:text-2xl p-6 flex items-center border-3 border-black">
              WOULD YOU PAY FOR THIS?
            </div>
            <button
              type="button"
              onClick={() => setWillingToPay(!willingToPay)}
              className="w-full md:w-64 bg-[#ffcc00] hover:bg-[#e6b800] text-black font-extrabold text-2xl py-6 border-3 border-black uppercase cursor-pointer transition-all text-center"
            >
              {willingToPay ? 'YES' : 'NO'}
            </button>
          </div>

          {/* Conditional Question 3 */}
          {willingToPay && (
            <div className="bg-[#000000] p-6 border-3 border-black space-y-4 font-mono">
              <div className="text-[#ffcc00] font-bold text-base md:text-lg uppercase">
                HOW MUCH WOULD YOU BE WILLING TO PAY?
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['₹0–50', '₹50–100', '₹100–150', '₹150+'].map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setPriceRange(range)}
                    className={`py-4 font-extrabold text-base md:text-lg border-3 border-black uppercase cursor-pointer transition-all ${
                      priceRange === range ? 'bg-[#ffcc00] text-black' : 'bg-[#1e1e1e] text-white hover:bg-gray-800'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Question 3 */}
          <div className="flex flex-col md:flex-row items-stretch gap-6">
            <div className="flex-1 bg-[#8b5cf6] text-white font-mono font-bold text-xl md:text-2xl p-6 flex items-center border-3 border-black">
              WOULD YOU REFER THIS TO A FRIEND?
            </div>
            <button
              type="button"
              onClick={() => setWouldRefer(!wouldRefer)}
              className="w-full md:w-64 bg-[#ffcc00] hover:bg-[#e6b800] text-black font-extrabold text-2xl py-6 border-3 border-black uppercase cursor-pointer transition-all text-center"
            >
              {wouldRefer ? 'YES' : 'NO'}
            </button>
          </div>

        </div>

      </div>

      {/* FINISH BUTTON */}
      <div className="w-full max-w-6xl flex justify-end mt-8">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full md:w-80 bg-[#ffcc00] hover:bg-[#e6b800] text-black font-extrabold text-2xl md:text-3xl py-5 border-3 border-black uppercase cursor-pointer transition-all text-center"
        >
          {submitting ? 'SUBMITTING...' : 'FINISH'}
        </button>
      </div>

    </div>
  );
}
