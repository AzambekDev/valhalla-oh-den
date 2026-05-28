import React, { useState, useEffect } from "react";
import { Sliders, Clock, Database, RotateCcw, X, Sparkles, AlertCircle } from "lucide-react";
import { 
  getCurrentTime, 
  setSimulatedTime, 
  resetTimeTravel, 
  formatTimeShort, 
  getCutoffTime 
} from "../utils/time";
import { isSupabaseConnected, resetMockOrders, clearOrders } from "../utils/db";

export default function DevPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [simTime, setSimTime] = useState("");
  const [currentTimeStr, setCurrentTimeStr] = useState("");
  const [timeTravelEnabled, setTimeTravelEnabled] = useState(false);
  const [dbMode, setDbMode] = useState("LocalStorage");
  const [cutoffTime, setCutoffTime] = useState("");

  useEffect(() => {
    // Check initial settings
    setTimeTravelEnabled(localStorage.getItem("oden_time_travel_enabled") === "true");
    setDbMode(isSupabaseConnected() ? "Supabase Live Cloud ☁️" : "LocalStorage (Multi-Tab Sync) 💻");
    setCutoffTime(getCutoffTime());

    // Tick the clock display every second
    const interval = setInterval(() => {
      const now = getCurrentTime();
      setCurrentTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);

    // Listen to changes from other views or tabs
    const handleStorageChange = () => {
      setTimeTravelEnabled(localStorage.getItem("oden_time_travel_enabled") === "true");
      setDbMode(isSupabaseConnected() ? "Supabase Live Cloud ☁️" : "LocalStorage (Multi-Tab Sync) 💻");
      setCutoffTime(getCutoffTime());
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("oden_db_update", handleStorageChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("oden_db_update", handleStorageChange);
    };
  }, []);

  const handleTimeChange = (e) => {
    const timeVal = e.target.value;
    setSimTime(timeVal);
    if (timeVal) {
      setSimulatedTime(timeVal);
      setTimeTravelEnabled(true);
    }
  };

  const handleQuickTime = (timeVal) => {
    setSimTime(timeVal);
    setSimulatedTime(timeVal);
    setTimeTravelEnabled(true);
  };

  const handleResetTime = () => {
    setSimTime("");
    resetTimeTravel();
    setTimeTravelEnabled(false);
  };

  const handleResetDb = () => {
    if (window.confirm("Restore default mock pre-orders? (This resets sales analytics!)")) {
      resetMockOrders();
      alert("Database orders restored to initial mock dataset!");
    }
  };

  const handleWipeDb = () => {
    if (window.confirm("Wipe all orders from the database?")) {
      clearOrders();
      alert("All orders deleted!");
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button 
        className="dev-panel-toggle" 
        onClick={() => setIsOpen(!isOpen)}
        title="Open Developer Demo Control Panel"
      >
        {isOpen ? <X size={24} /> : <Sliders size={24} />}
      </button>

      {/* Slide-out Control Drawer */}
      {isOpen && (
        <div className="dev-panel-drawer">
          
          {/* Section 1: Brand & Sync Mode */}
          <div className="dev-drawer-section">
            <div className="dev-drawer-label">
              <Sparkles size={16} /> Demo Control Portal
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                🍢 Pre-Order Stall Project
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <Database size={12} /> Sync: <span style={{ color: "var(--accent-gold)", fontWeight: 700 }}>{dbMode}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Time Travel Clock Controller */}
          <div className="dev-drawer-section" style={{ flex: 1, justifyContent: "center" }}>
            <div className="dev-clock-setup">
              <span className="dev-drawer-label" style={{ margin: 0 }}>
                <Clock size={15} /> Clock:
              </span>
              <span className="dev-clock-sim">{currentTimeStr}</span>
              
              {timeTravelEnabled ? (
                <span style={{ fontSize: "0.75rem", background: "rgba(239, 68, 68, 0.15)", color: "var(--accent-red)", padding: "0.1rem 0.4rem", borderRadius: "4px", fontWeight: 700 }}>
                  SIMULATED
                </span>
              ) : (
                <span style={{ fontSize: "0.75rem", background: "rgba(16, 185, 129, 0.15)", color: "var(--color-success)", padding: "0.1rem 0.4rem", borderRadius: "4px", fontWeight: 700 }}>
                  ACTUAL TIME
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input 
                type="time" 
                className="dev-input-time"
                value={simTime}
                onChange={handleTimeChange}
                title="Select a custom time to travel to"
              />
              
              {/* Presets */}
              <button 
                className="btn btn-secondary" 
                style={{ padding: "0.35rem 0.65rem", fontSize: "0.75rem", borderRadius: "6px" }}
                onClick={() => handleQuickTime("11:30")}
              >
                11:30 AM (Order Open)
              </button>
              <button 
                className="btn btn-secondary" 
                style={{ padding: "0.35rem 0.65rem", fontSize: "0.75rem", borderRadius: "6px" }}
                onClick={() => handleQuickTime("12:06")}
              >
                12:06 PM (Closed)
              </button>

              {timeTravelEnabled && (
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: "0.35rem 0.5rem", borderRadius: "6px", color: "var(--accent-red)" }}
                  onClick={handleResetTime}
                  title="Reset to real clock time"
                >
                  <RotateCcw size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Section 3: Database Resets */}
          <div className="dev-drawer-section">
            <button 
              className="btn btn-secondary" 
              style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", borderRadius: "8px", borderColor: "rgba(242, 161, 38, 0.25)", color: "var(--accent-gold)" }}
              onClick={handleResetDb}
              title="Restore standard dataset of mock pre-orders"
            >
              <RotateCcw size={14} /> Reset Data
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", borderRadius: "8px", color: "var(--color-error)", borderColor: "rgba(239, 68, 68, 0.2)" }}
              onClick={handleWipeDb}
              title="Delete all pre-orders from database"
            >
              Wipe DB
            </button>
          </div>

        </div>
      )}
    </>
  );
}
