const firebaseConfig = {
  apiKey: "AIzaSyBA_sWEOwNJyGNStk-qyubYc1MyvRPSXm8",
  authDomain: "trive-ai.firebaseapp.com",
  projectId: "trive-ai",
  storageBucket: "trive-ai.firebasestorage.app",
  messagingSenderId: "54938165514",
  appId: "1:54938165514:web:07152ff791f2e33eeb9af3",
  measurementId: "G-28NV98N7NE"
};

let db = null;
let analytics = null;

if (typeof window !== 'undefined' && window.firebase) {
  try {
    if (!window.firebase.apps.length) {
      window.firebase.initializeApp(firebaseConfig);
    }
    db = window.firebase.firestore();
    analytics = window.firebase.analytics();
  } catch (err) {
    console.warn("Firebase initialization warning:", err);
  }
}

/**
 * Log custom event to Google Analytics 4
 */
export const logAnalyticsEvent = (eventName, params = {}) => {
  if (analytics) {
    try {
      analytics.logEvent(eventName, params);
    } catch (err) {
      console.warn("Analytics log error:", err);
    }
  }
};

/**
 * Save Survey response directly to Firebase Firestore ('surveys' collection)
 */
export const saveSurveyToFirestore = async (surveyData) => {
  if (db) {
    try {
      await db.collection("surveys").add({
        ...surveyData,
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      console.warn("Firestore survey save warning:", err);
    }
  }
};

/**
 * Save Site Traffic / Analytics event to Firebase Firestore ('analytics_events' collection)
 */
export const saveAnalyticsEventToFirestore = async (eventType, usernameOrSession) => {
  if (db) {
    try {
      await db.collection("analytics_events").add({
        eventType,
        usernameOrSession: usernameOrSession || "anonymous",
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      console.warn("Firestore event save warning:", err);
    }
  }
};
