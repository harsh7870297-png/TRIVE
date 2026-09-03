// Live Analytics and Community Stats Manager (Client + Server sync with 0 default baseline)
import { API_BASE_URL } from '../config/api';

const STATS_KEY = 'trive_live_stats';

const DEFAULT_STATS = {
  siteVisits: 0,
  startedCount: 0,
  finishedCount: 0,
  totalSurveys: 0,
  wouldUseAgainCount: 0,
  wouldReferCount: 0,
  totalPriceSum: 0,
  avgPrice: 0
};

export function getLocalStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_STATS, ...parsed };
    }
  } catch (e) {}
  return { ...DEFAULT_STATS };
}

export function saveLocalStats(stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {}
}

export async function fetchLiveStats() {
  const local = getLocalStats();

  try {
    const res = await fetch(`${API_BASE_URL}/api/analytics/stats`);
    if (res.ok) {
      const serverData = await res.json();
      const merged = {
        siteVisits: Math.max(local.siteVisits, serverData.siteVisits || 0),
        startedCount: Math.max(local.startedCount, serverData.startedCount || 0),
        finishedCount: Math.max(local.finishedCount, serverData.finishedCount || 0),
        totalSurveys: Math.max(local.totalSurveys, serverData.totalSurveys || 0),
        wouldUseAgainCount: Math.max(local.wouldUseAgainCount, serverData.wouldUseAgainCount || 0),
        wouldReferCount: Math.max(local.wouldReferCount, serverData.wouldReferCount || 0),
        totalPriceSum: Math.max(local.totalPriceSum, serverData.totalPriceSum || 0),
        avgPrice: serverData.avgPrice || local.avgPrice || 0
      };
      saveLocalStats(merged);
      return merged;
    }
  } catch (e) {}

  return local;
}

export async function recordStatEvent(eventType, extraData = {}) {
  const current = getLocalStats();

  if (eventType === 'SITE_VISIT') {
    current.siteVisits += 1;
  } else if (eventType === 'INTERVIEW_STARTED') {
    current.startedCount += 1;
  } else if (eventType === 'INTERVIEW_FINISHED') {
    current.finishedCount += 1;
  } else if (eventType === 'SURVEY_SUBMITTED') {
    current.totalSurveys += 1;
    if (extraData.wouldUseAgain) current.wouldUseAgainCount += 1;
    if (extraData.wouldRefer) current.wouldReferCount += 1;

    if (extraData.willingToPay && extraData.priceRange) {
      let priceVal = 0;
      if (extraData.priceRange.includes('0–50')) priceVal = 25;
      else if (extraData.priceRange.includes('50–100')) priceVal = 75;
      else if (extraData.priceRange.includes('100–150')) priceVal = 125;
      else if (extraData.priceRange.includes('150+')) priceVal = 175;

      current.totalPriceSum = (current.totalPriceSum || 0) + priceVal;
      current.avgPrice = Math.round(current.totalPriceSum / current.totalSurveys);
    }
  }

  saveLocalStats(current);

  // Sync with backend API if available
  try {
    await fetch(`${API_BASE_URL}/api/analytics/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: eventType,
        usernameOrSession: extraData.username || 'anonymous',
        payload: JSON.stringify(extraData)
      })
    });
  } catch (e) {}

  return current;
}
