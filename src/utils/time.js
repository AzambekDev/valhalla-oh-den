/**
 * Time management utility for OdenPre.
 * Supports standard operations and simulated time travel.
 */

// Cutoff default is 12:05 PM
const DEFAULT_CUTOFF = "12:05";

/**
 * Gets the current simulated or actual date object.
 */
export function getCurrentTime() {
  const travelEnabled = localStorage.getItem("oden_time_travel_enabled") === "true";
  if (!travelEnabled) {
    return new Date();
  }

  const targetStr = localStorage.getItem("oden_time_travel_target");
  const setAtStr = localStorage.getItem("oden_time_travel_set_at");

  if (!targetStr || !setAtStr) {
    return new Date();
  }

  const targetTime = new Date(targetStr).getTime();
  const setAtTime = new Date(setAtStr).getTime();
  const elapsed = Date.now() - setAtTime;

  return new Date(targetTime + elapsed);
}

/**
 * Sets the simulated clock time.
 * @param {string} timeString - Format "HH:MM" for today, or a full Date ISO string
 */
export function setSimulatedTime(timeString) {
  if (!timeString) {
    localStorage.removeItem("oden_time_travel_enabled");
    localStorage.removeItem("oden_time_travel_target");
    localStorage.removeItem("oden_time_travel_set_at");
    // Dispatch custom storage event so other tabs update instantly
    window.dispatchEvent(new Event("storage"));
    return;
  }

  let targetDate;
  if (timeString.includes("T")) {
    targetDate = new Date(timeString);
  } else {
    // HH:MM format for today
    const [hours, minutes] = timeString.split(":").map(Number);
    targetDate = new getCurrentTime();
    targetDate.setHours(hours, minutes, 0, 0);
  }

  localStorage.setItem("oden_time_travel_enabled", "true");
  localStorage.setItem("oden_time_travel_target", targetDate.toISOString());
  localStorage.setItem("oden_time_travel_set_at", new Date().toISOString());
  window.dispatchEvent(new Event("storage"));
}

/**
 * Disables time travel and returns to actual system clock.
 */
export function resetTimeTravel() {
  setSimulatedTime(null);
}

/**
 * Retrieves the current configured cutoff time (e.g. "12:05")
 */
export function getCutoffTime() {
  return localStorage.getItem("oden_cutoff_time") || DEFAULT_CUTOFF;
}

/**
 * Sets a custom cutoff time.
 */
export function setCutoffTime(cutoff) {
  localStorage.setItem("oden_cutoff_time", cutoff);
  window.dispatchEvent(new Event("storage"));
}

/**
 * Checks if ordering is currently open based on current simulated time and settings.
 * Returns { isOpen: boolean, reason: string }
 */
export function getOrderingStatus() {
  // Admin forced override takes absolute precedence
  const forceStatus = localStorage.getItem("oden_force_status"); // 'open', 'closed', or null
  if (forceStatus === "open") {
    return { isOpen: true, reason: "Forced Open by Admin" };
  }
  if (forceStatus === "closed") {
    return { isOpen: false, reason: "Stall Sold Out / Closed by Admin" };
  }

  // Time restrictions removed: pre-ordering remains active all day!
  return { isOpen: true, reason: "Pre-ordering is Active!" };
}

/**
 * Formats a date object into HH:MM AM/PM
 */
export function formatTimeShort(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Calculates remaining time in milliseconds until the cutoff.
 */
export function getRemainingTime() {
  const now = getCurrentTime();
  const cutoff = getCutoffTime();
  const [cutoffHours, cutoffMinutes] = cutoff.split(":").map(Number);

  const cutoffDate = new Date(now);
  cutoffDate.setHours(cutoffHours, cutoffMinutes, 0, 0);

  const diff = cutoffDate - now;
  return diff > 0 ? diff : 0;
}

/**
 * Formats milliseconds into hh:mm:ss countdown string
 */
export function formatCountdown(ms) {
  if (ms <= 0) return "00h 00m 00s";
  
  const totalSecs = Math.floor(ms / 1000);
  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = totalSecs % 60;

  const hStr = String(hours).padStart(2, "0");
  const mStr = String(minutes).padStart(2, "0");
  const sStr = String(seconds).padStart(2, "0");

  return `${hStr}h ${mStr}m ${sStr}s`;
}
