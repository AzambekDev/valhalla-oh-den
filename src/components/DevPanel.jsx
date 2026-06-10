import React, { useState, useEffect, useRef } from "react";
import { Sliders, Clock, Database, RotateCcw, X, Sparkles, Zap, Play, Square } from "lucide-react";
import { 
  getCurrentTime, 
  setSimulatedTime, 
  resetTimeTravel, 
  formatTimeShort, 
  getCutoffTime 
} from "../utils/time";
import { isSupabaseConnected, resetMockOrders, clearOrders, bulkAddOrders } from "../utils/db";

export default function DevPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [simTime, setSimTime] = useState("");
  const [currentTimeStr, setCurrentTimeStr] = useState("");
  const [timeTravelEnabled, setTimeTravelEnabled] = useState(false);
  const [dbMode, setDbMode] = useState("LocalStorage");
  const [cutoffTime, setCutoffTime] = useState("");

  // Stress testing states
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedCount, setSimulatedCount] = useState(0);
  const [simulatedTarget] = useState(500);
  const simIntervalRef = useRef(null);

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
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
      }
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

  const handleBulkGenerate = async (count) => {
    const activeDb = isSupabaseConnected() ? "Supabase Cloud" : "LocalStorage";
    const confirmed = window.confirm(`Generate ${count} random mock orders instantly to ${activeDb}?`);
    if (!confirmed) return;

    try {
      await bulkAddOrders(count);
      alert(`Successfully added ${count} mock orders!`);
    } catch (e) {
      console.error(e);
      alert("Error adding orders.");
    }
  };

  const startSimulator = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSimulatedCount(0);
    
    // Add first chunk immediately
    bulkAddOrders(5);
    setSimulatedCount(5);

    simIntervalRef.current = setInterval(() => {
      setSimulatedCount(prev => {
        const next = prev + 5;
        if (next >= 500) {
          clearInterval(simIntervalRef.current);
          setIsSimulating(false);
          alert("🎉 Stress simulator complete! 500 orders generated successfully.");
          return 500;
        }
        bulkAddOrders(5);
        return next;
      });
    }, 200); // 5 orders every 200ms = 25 orders/sec.
  };

  const stopSimulator = () => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
    }
    setIsSimulating(false);
    alert(`Stress simulator stopped. Generated ${simulatedCount} mock orders.`);
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
        <div className="dev-panel-drawer" style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem" }}>
          
          {/* Section 1: Brand & Sync Mode */}
          <div className="dev-drawer-section">
            <div className="dev-drawer-label">
              <Sparkles size={16} /> Demo Control
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700 }}>
                🍢 Pre-Order Stall
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <Database size={11} /> <span style={{ color: "var(--accent-gold)", fontWeight: 700 }}>{dbMode}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Time Travel Clock Controller */}
          <div className="dev-drawer-section" style={{ flex: 1, minWidth: "250px" }}>
            <div className="dev-clock-setup" style={{ padding: "0.25rem 0.5rem" }}>
              <span className="dev-drawer-label" style={{ margin: 0, fontSize: "0.75rem" }}>
                Clock:
              </span>
              <span className="dev-clock-sim" style={{ fontSize: "0.85rem" }}>{currentTimeStr}</span>
              
              {timeTravelEnabled ? (
                <span style={{ fontSize: "0.65rem", background: "rgba(239, 68, 68, 0.15)", color: "var(--accent-red)", padding: "0.05rem 0.3rem", borderRadius: "4px", fontWeight: 700 }}>
                  SIM
                </span>
              ) : (
                <span style={{ fontSize: "0.65rem", background: "rgba(16, 185, 129, 0.15)", color: "var(--color-success)", padding: "0.05rem 0.3rem", borderRadius: "4px", fontWeight: 700 }}>
                  LIVE
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <input 
                type="time" 
                className="dev-input-time"
                value={simTime}
                onChange={handleTimeChange}
                style={{ padding: "0.2rem", fontSize: "0.8rem" }}
                title="Select a custom time to travel to"
              />
              
              <button 
                className="btn btn-secondary" 
                style={{ padding: "0.3rem 0.5rem", fontSize: "0.7rem", borderRadius: "6px" }}
                onClick={() => handleQuickTime("11:30")}
              >
                11:30 AM
              </button>
              <button 
                className="btn btn-secondary" 
                style={{ padding: "0.3rem 0.5rem", fontSize: "0.7rem", borderRadius: "6px" }}
                onClick={() => handleQuickTime("16:05")}
              >
                4:05 PM
              </button>

              {timeTravelEnabled && (
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: "0.3rem 0.4rem", borderRadius: "6px", color: "var(--accent-red)" }}
                  onClick={handleResetTime}
                  title="Reset to real clock time"
                >
                  <RotateCcw size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Section 3: Stress Testing Simulator Panel */}
          <div className="dev-drawer-section" style={{ borderLeft: "1px solid var(--border-light)", borderRight: "1px solid var(--border-light)", padding: "0 1.5rem", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "0.35rem", minWidth: "280px" }}>
            <div className="dev-drawer-label" style={{ margin: 0, fontSize: "0.75rem" }}>
              <Zap size={14} /> Stress Testing Suite
            </div>
            
            {isSimulating ? (
              <div style={{ width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", width: "100%" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--accent-red)", fontWeight: "bold", animation: "pulse 1s infinite" }}>
                    Simulating: {simulatedCount} / {simulatedTarget}
                  </span>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: "0.25rem 0.5rem", fontSize: "0.7rem", color: "var(--accent-red)", borderColor: "rgba(239, 68, 68, 0.3)", borderRadius: "4px" }}
                    onClick={stopSimulator}
                  >
                    <Square size={10} style={{ marginRight: "0.2rem" }} /> Stop
                  </button>
                </div>
                <div style={{ width: "100%", background: "rgba(255,255,255,0.1)", height: "4px", borderRadius: "2px", overflow: "hidden", marginTop: "0.3rem" }}>
                  <div style={{ width: `${(simulatedCount / simulatedTarget) * 100}%`, background: "var(--accent-gold)", height: "100%", transition: "width 0.2s ease" }}></div>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: "0.3rem 0.55rem", fontSize: "0.7rem", borderRadius: "6px" }}
                  onClick={() => handleBulkGenerate(100)}
                >
                  +100 Orders
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: "0.3rem 0.55rem", fontSize: "0.7rem", borderRadius: "6px" }}
                  onClick={() => handleBulkGenerate(500)}
                >
                  +500 Orders
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: "0.3rem 0.55rem", fontSize: "0.7rem", borderRadius: "6px", background: "var(--accent-gold)", color: "var(--bg-main)", fontWeight: "bold" }}
                  onClick={startSimulator}
                  title="Generate 500 mock orders over 20 seconds"
                >
                  <Play size={10} style={{ marginRight: "0.2rem" }} /> Run Simulator
                </button>
              </div>
            )}
          </div>

          {/* Section 4: Database Resets */}
          <div className="dev-drawer-section">
            <button 
              className="btn btn-secondary" 
              style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", borderRadius: "8px", borderColor: "rgba(242, 161, 38, 0.25)", color: "var(--accent-gold)" }}
              onClick={handleResetDb}
              title="Restore standard dataset of 10 mock pre-orders"
            >
              <RotateCcw size={13} /> Reset Data
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
