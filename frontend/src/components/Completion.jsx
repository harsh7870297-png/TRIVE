import React from 'react';

export default function Completion({ onRestart }) {
  return (
    <div className="min-h-screen bg-[#ffffff] font-sans p-6 flex flex-col items-center justify-center select-none">
      <div className="w-full max-w-xl bg-[#93c5fd] p-8 border-4 border-black text-center space-y-6">
        
        <div className="bg-[#8b5cf6] text-[#ffcc00] font-extrabold text-2xl md:text-3xl py-3 border-2 border-black uppercase">
          THANK YOU FOR USING TRIVE!
        </div>

        <div className="font-mono text-black text-sm md:text-base leading-relaxed space-y-3 bg-white p-4 border-2 border-black">
          <p>
            Your interview session and survey feedback have been successfully recorded.
          </p>
          <p className="font-bold text-[#8b5cf6]">
            Three perspectives. One interview.
          </p>
          <div className="mt-4 p-3 bg-[#ffcc00] border-2 border-black text-black font-bold text-xs md:text-sm uppercase">
            🔒 SECURITY REMINDER: YOU CAN NOW SAFELY DELETE OR REVOKE YOUR API KEY IN GOOGLE AI STUDIO (AISTUDIO.GOOGLE.COM).
          </div>
        </div>

        <button
          type="button"
          onClick={onRestart}
          className="w-full bg-[#ffcc00] hover:bg-[#e6b800] text-black font-extrabold text-xl py-4 border-2 border-black uppercase cursor-pointer transition-all"
        >
          START ANOTHER PRACTICE SESSION
        </button>

      </div>
    </div>
  );
}
