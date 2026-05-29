import React, { useState, useEffect } from "react";
import { 
  ShoppingBag, 
  Flame, 
  Settings, 
  Clock, 
  Database,
  ArrowRight,
  Lock,
  Unlock,
  Key,
  X
} from "lucide-react";
import ClientPage from "./components/ClientPage";
import WorkerPage from "./components/WorkerPage";
import AdminPage from "./components/AdminPage";
import { getCurrentTime } from "./utils/time";
import { isSupabaseConnected, verifyPasscode } from "./utils/db";

export default function App() {
  const [activeTab, setActiveTab] = useState("client");
  const [headerTimeStr, setHeaderTimeStr] = useState("");
  const [supabaseActive, setSupabaseActive] = useState(false);

  // 🔐 Secure Passcode States
  const [passcodeInput, setPasscodeInput] = useState("");
  const [passcodeError, setPasscodeError] = useState("");
  const [isWorkerUnlocked, setIsWorkerUnlocked] = useState(false);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  useEffect(() => {
    // Tick the header clock dynamically
    const interval = setInterval(() => {
      const now = getCurrentTime();
      setHeaderTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);

    // Initial check for DB mode
    setSupabaseActive(isSupabaseConnected());

    // Check sessionStorage to see if already unlocked in this active tab session
    setIsWorkerUnlocked(sessionStorage.getItem("oden_worker_auth") === "true");
    setIsAdminUnlocked(sessionStorage.getItem("oden_admin_auth") === "true");

    const handleStorageChange = () => {
      setSupabaseActive(isSupabaseConnected());
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("oden_db_update", handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("oden_db_update", handleStorageChange);
    };
  }, []);

  const handleVerifyPasscode = async (e) => {
    e.preventDefault();
    setPasscodeError("");

    if (!passcodeInput.trim()) {
      setPasscodeError("Please enter a passcode!");
      return;
    }

    const role = activeTab === "worker" ? "worker" : "admin";
    
    try {
      const isValid = await verifyPasscode(role, passcodeInput.trim());
      if (isValid) {
        if (role === "worker") {
          sessionStorage.setItem("oden_worker_auth", "true");
          setIsWorkerUnlocked(true);
        } else {
          sessionStorage.setItem("oden_admin_auth", "true");
          setIsAdminUnlocked(true);
        }
        setPasscodeInput("");
      } else {
        setPasscodeError("❌ Access Denied: Invalid security passcode hash!");
      }
    } catch (err) {
      console.error(err);
      setPasscodeError("Cryptography error. Attempt blocked.");
    }
  };

  const handleLogout = (role) => {
    if (role === "worker") {
      sessionStorage.removeItem("oden_worker_auth");
      setIsWorkerUnlocked(false);
    } else {
      sessionStorage.removeItem("oden_admin_auth");
      setIsAdminUnlocked(false);
    }
    setActiveTab("client");
  };

  const currentRoleName = activeTab === "worker" ? "Prep Kitchen" : "Manager Dashboard";
  const isCurrentlyLocked = (activeTab === "worker" && !isWorkerUnlocked) || (activeTab === "admin" && !isAdminUnlocked);

  return (
    <div className="app-container">
      
      <header className="main-header">
        <div className="brand-section">
          <img 
            src="/logo.jpg" 
            alt="Valhalla Oh-Den! Logo" 
            style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", border: "1.5px solid var(--accent-gold)", display: "block" }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span className="brand-name">Valhalla Oh-Den!</span>
            <span style={{ fontSize: "0.65rem", color: "var(--color-text-muted)" }}>Simmering Atrium System</span>
          </div>
        </div>

        {/* Dynamic Navigation Tabs */}
        <nav className="nav-tabs">
          <button 
            className={`nav-tab-btn ${activeTab === "client" ? "active" : ""}`}
            onClick={() => setActiveTab("client")}
          >
            <ShoppingBag size={15} /> Pre-Order
          </button>
          
          <button 
            className={`nav-tab-btn ${activeTab === "worker" ? "active" : ""}`}
            onClick={() => setActiveTab("worker")}
          >
            {isWorkerUnlocked ? <Unlock size={14} style={{ color: "var(--color-success)" }} /> : <Lock size={14} />}
            Kitchen Prep
          </button>
          
          <button 
            className={`nav-tab-btn ${activeTab === "admin" ? "active" : ""}`}
            onClick={() => setActiveTab("admin")}
          >
            {isAdminUnlocked ? <Unlock size={14} style={{ color: "var(--color-success)" }} /> : <Lock size={14} />}
            Manager Settings
          </button>
        </nav>

        {/* Header Action Elements */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          
          {/* Quick Logout Button */}
          {activeTab === "worker" && isWorkerUnlocked && (
            <button 
              className="btn btn-secondary animate-pulse" 
              onClick={() => handleLogout("worker")}
              style={{ padding: "0.4rem 0.75rem", fontSize: "0.75rem", color: "var(--accent-red)", borderColor: "rgba(239, 68, 68, 0.25)" }}
              title="Lock kitchen prep view"
            >
              <Lock size={12} /> Lock Dashboard
            </button>
          )}
          {activeTab === "admin" && isAdminUnlocked && (
            <button 
              className="btn btn-secondary animate-pulse" 
              onClick={() => handleLogout("admin")}
              style={{ padding: "0.4rem 0.75rem", fontSize: "0.75rem", color: "var(--accent-red)", borderColor: "rgba(239, 68, 68, 0.25)" }}
              title="Lock manager settings"
            >
              <Lock size={12} /> Lock settings
            </button>
          )}

          {/* Live Clock indicator */}
          <div className="header-clock" title="Active stall simulation clock">
            <Clock size={14} style={{ color: "var(--accent-gold)" }} />
            <span>{headerTimeStr || "--:--:--"}</span>
          </div>

        </div>
      </header>

      {/* 3. DYNAMIC WORKSPACE VIEW WRAPPER */}
      <main className="view-wrapper">
        
        {/* Passcode lock screen gate overlay */}
        {isCurrentlyLocked ? (
          <div style={{ display: "flex", width: "100%", justifyContent: "center", padding: "4rem 0", animation: "slideUp 0.4s ease" }}>
            <div className="step-panel" style={{ maxWidth: "480px", width: "100%", textAlign: "center", padding: "3rem 2rem", background: "rgba(28, 24, 21, 0.85)", backdropFilter: "blur(12px)" }}>
              
              <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(242, 161, 38, 0.1)", border: "1px solid rgba(242, 161, 38, 0.25)", color: "var(--accent-gold)", display: "flex", alignItems: "center", justifyCenter: "center", margin: "0 auto 1.5rem auto" }}>
                <Key size={30} style={{ margin: "auto" }} />
              </div>

              <h2 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.5px" }}>🔒 {currentRoleName} Gate</h2>
              
              <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", margin: "0.5rem 0 1.75rem 0", lineHeight: "1.5" }}>
                This portal requires secure stall operator authorization. Hashed input is cross-verified via **SHA-256 Browser Cryptography** client-side.
              </p>

              <form onSubmit={handleVerifyPasscode} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <input 
                    type="password"
                    className="form-input"
                    placeholder="Enter security passcode"
                    value={passcodeInput}
                    onChange={(e) => setPasscodeInput(e.target.value)}
                    style={{ textAlign: "center", fontSize: "1.1rem", letterSpacing: "3px" }}
                    autoFocus
                    required
                  />
                  {passcodeError && (
                    <span style={{ fontSize: "0.75rem", color: "var(--color-error)", fontWeight: 700, animation: "pulse 0.5s infinite" }}>
                      {passcodeError}
                    </span>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "0.5rem" }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setActiveTab("client")}
                    style={{ justifyContent: "center" }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    style={{ justifyContent: "center", background: "var(--accent-gold)" }}
                  >
                    Verify & Unlock
                  </button>
                </div>
              </form>

              {/* Demonstration Defaults Removed for Production */}

            </div>
          </div>
        ) : (
          // Unlocked Views
          <>
            {activeTab === "client" && <ClientPage />}
            {activeTab === "worker" && <WorkerPage />}
            {activeTab === "admin" && <AdminPage />}
          </>
        )}

      </main>

    </div>
  );
}
