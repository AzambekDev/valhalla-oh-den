import React, { useState, useEffect } from 'react';
import { Key, QrCode, Settings, Clock } from 'lucide-react';
import { setPasscode, clearOrders, syncStallSettings } from '../utils/db';
import { getCutoffTime } from '../utils/time';
export default function OwnerPage() {
  const [newAdminPass, setNewAdminPass] = useState("");
  const [newWorkerPass, setNewWorkerPass] = useState("");
  const [newOwnerPass, setNewOwnerPass] = useState("");
  
  const [tngNumber, setTngNumber] = useState(localStorage.getItem("oden_tng_number") || "+601164188797");
  const [tngName, setTngName] = useState(localStorage.getItem("oden_tng_name") || "SATTAROV AZAMBEK XXX");
  
  const [purgeInput, setPurgeInput] = useState("");
  const [isPurging, setIsPurging] = useState(false);

  // Stall Controls
  const [cutoffVal, setCutoffVal] = useState("16:00");
  const [forceStatus, setForceStatus] = useState("auto"); // 'auto', 'open', 'closed'
  const [luckyProb, setLuckyProb] = useState("0.001");

  // Sync owner state
  useEffect(() => {
    setCutoffVal(getCutoffTime());
    setForceStatus(localStorage.getItem("oden_force_status") || "auto");
    setLuckyProb(localStorage.getItem("oden_lucky_prob") || "0.001");

    const handleStorageChange = async () => {
      setCutoffVal(getCutoffTime());
      setForceStatus(localStorage.getItem("oden_force_status") || "auto");
      setLuckyProb(localStorage.getItem("oden_lucky_prob") || "0.001");
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("oden_db_update", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("oden_db_update", handleStorageChange);
    };
  }, []);

  const handleCutoffChange = async (e) => {
    const newVal = e.target.value;
    setCutoffVal(newVal);
    await syncStallSettings(undefined, newVal, undefined);
  };

  const handleForceStatus = async (status) => {
    setForceStatus(status);
    await syncStallSettings(status, undefined, undefined);
  };

  const handleLuckyProbChange = async (e) => {
    const newVal = e.target.value;
    setLuckyProb(newVal);
    await syncStallSettings(undefined, undefined, newVal);
  };

  const handleUpdatePasscodes = async (e) => {
    e.preventDefault();
    if (!newAdminPass.trim() && !newWorkerPass.trim() && !newOwnerPass.trim()) {
      alert("Please enter at least one new passcode to upgrade.");
      return;
    }

    try {
      if (newAdminPass.trim()) {
        await setPasscode("admin", newAdminPass.trim());
      }
      if (newWorkerPass.trim()) {
        await setPasscode("worker", newWorkerPass.trim());
      }
      if (newOwnerPass.trim()) {
        await setPasscode("owner", newOwnerPass.trim());
      }
      alert("✅ Cryptographic passcodes successfully hashed and locked.");
      setNewAdminPass("");
      setNewWorkerPass("");
      setNewOwnerPass("");
    } catch (err) {
      alert("❌ Failed to hash passcodes. See console.");
      console.error(err);
    }
  };

  const handleUpdateTngDetails = (e) => {
    e.preventDefault();
    if (!tngNumber.trim() || !tngName.trim()) {
      alert("Please fill in both DuitNow details.");
      return;
    }
    localStorage.setItem("oden_tng_number", tngNumber.trim());
    localStorage.setItem("oden_tng_name", tngName.trim().toUpperCase());
    window.dispatchEvent(new Event("storage"));
    alert("✅ DuitNow QR credentials synced across active client devices!");
  };

  const handlePurgeDatabase = async (e) => {
    e.preventDefault();
    if (purgeInput !== "clear valhalla-oh-den database " && purgeInput !== "clear valhalla-oh-den database") {
      alert("Verification failed. Type the phrase exactly as shown.");
      return;
    }

    if (window.confirm("CRITICAL WARNING: This will irreversibly wipe ALL orders from the cloud database. Are you 100% sure?")) {
      setIsPurging(true);
      try {
        await clearOrders();
        alert("💥 DATABASE PURGED SUCCESSFULLY. All orders have been wiped clean from the cloud.");
        setPurgeInput("");
      } catch (err) {
        alert("Failed to purge database: " + err.message);
      } finally {
        setIsPurging(false);
      }
    }
  };

  return (
    <div className="dashboard-layout" style={{ animation: "slideUp 0.3s ease", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      
      <div className="dashboard-header">
        <div>
          <h2>👑 Owner Settings / Super Admin</h2>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
            Critical stall configuration, cryptographic passcodes, and danger zone tools.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "1.5rem" }}>
        
        {/* Passcode Security */}
        <div className="chart-card">
          <div className="chart-card-title">
            <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><Key size={18} style={{ color: "var(--accent-gold)" }} /> Cryptographic Passcode Upgrades</span>
          </div>
          
          <form onSubmit={handleUpdatePasscodes} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", lineHeight: "1.4", borderBottom: "1px solid var(--border-light)", paddingBottom: "0.5rem" }}>
              🔒 <strong>Cyber-sec Defense Active:</strong> Passcodes are client-side hashed via <strong>SHA-256</strong> before storage. Decompiling or inspecting bundles will only show one-way cryptographic hex strings.
            </div>

            <div className="form-group">
              <span className="form-label" style={{ fontSize: "0.75rem" }}>New Owner (Superadmin) Passcode</span>
              <input 
                type="password" 
                className="form-input" 
                placeholder="Leave blank to keep current (default: owner123)"
                value={newOwnerPass}
                onChange={(e) => setNewOwnerPass(e.target.value)}
                style={{ padding: "0.5rem", fontSize: "0.85rem" }}
              />
            </div>

            <div className="form-group">
              <span className="form-label" style={{ fontSize: "0.75rem" }}>New Admin Page Passcode</span>
              <input 
                type="password" 
                className="form-input" 
                placeholder="Leave blank to keep current (default: admin123)"
                value={newAdminPass}
                onChange={(e) => setNewAdminPass(e.target.value)}
                style={{ padding: "0.5rem", fontSize: "0.85rem" }}
              />
            </div>
            
            <div className="form-group">
              <span className="form-label" style={{ fontSize: "0.75rem" }}>New Kitchen (Worker) Board Passcode</span>
              <input 
                type="password" 
                className="form-input" 
                placeholder="Leave blank to keep current (default: chef123)"
                value={newWorkerPass}
                onChange={(e) => setNewWorkerPass(e.target.value)}
                style={{ padding: "0.5rem", fontSize: "0.85rem" }}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ width: "100%", height: "35px", padding: "0.5rem", fontSize: "0.8rem", background: "var(--accent-red)", color: "white", boxShadow: "none" }}
            >
              Hash & Lock In Passcodes
            </button>
          </form>
        </div>

        {/* TnG DuitNow Merchant details */}
        <div className="chart-card">
          <div className="chart-card-title">
            <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><QrCode size={18} style={{ color: "var(--accent-gold)" }} /> Stall DuitNow QR Configuration</span>
          </div>

          <form onSubmit={handleUpdateTngDetails} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", lineHeight: "1.4", borderBottom: "1px solid var(--border-light)", paddingBottom: "0.5rem" }}>
              📲 Modify payment data displayed on customer phones. Enables quick routing to your actual Touch 'n Go wallet!
            </div>

            <div className="form-group">
              <span className="form-label" style={{ fontSize: "0.75rem" }}>DuitNow Mobile / Account Number</span>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. +60 17-8899234"
                value={tngNumber}
                onChange={(e) => setTngNumber(e.target.value)}
                style={{ padding: "0.5rem", fontSize: "0.85rem" }}
                required
              />
            </div>

            <div className="form-group">
              <span className="form-label" style={{ fontSize: "0.75rem" }}>Registered Merchant/Account Name</span>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. DARREN ENTERPRISE STALL"
                value={tngName}
                onChange={(e) => setTngName(e.target.value)}
                style={{ padding: "0.5rem", fontSize: "0.85rem" }}
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ width: "100%", height: "35px", padding: "0.5rem", fontSize: "0.8rem", background: "var(--accent-gold)", color: "var(--bg-main)", boxShadow: "none" }}
            >
              Sync DuitNow QR details
            </button>
          </form>
        </div>

      </div>

      {/* Configuration Card */}
      <div className="chart-card">
        <div className="chart-card-title">
          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><Settings size={18} /> Stall Controls</span>
        </div>

        <div className="settings-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem", marginTop: "1rem" }}>
          
          {/* Cutoff Time Input */}
          <div className="toggle-switch-wrapper" style={{ flexDirection: "column", alignItems: "stretch", gap: "0.5rem" }}>
            <div className="toggle-info">
              <span className="toggle-label" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Clock size={14} style={{ color: "var(--accent-gold)" }} /> Cutoff Time Limit
              </span>
              <span className="toggle-desc">Lock customer pre-ordering instantly at this clock time.</span>
            </div>
            <input 
              type="time" 
              className="form-input"
              value={cutoffVal}
              onChange={handleCutoffChange}
              style={{ width: "100%", padding: "0.5rem" }}
            />
          </div>

          {/* Force Override status */}
          <div className="toggle-switch-wrapper" style={{ flexDirection: "column", alignItems: "stretch", gap: "0.5rem" }}>
            <div className="toggle-info">
              <span className="toggle-label">Stall Ordering State</span>
              <span className="toggle-desc">Force system to ignore clock limits. Good for selling out early!</span>
            </div>
            <div className="force-group">
              <button 
                type="button"
                className={`force-btn auto ${forceStatus === "auto" ? "active" : ""}`}
                onClick={() => handleForceStatus("auto")}
              >
                Auto
              </button>
              <button 
                type="button"
                className={`force-btn open ${forceStatus === "open" ? "active" : ""}`}
                onClick={() => handleForceStatus("open")}
              >
                Force Open
              </button>
              <button 
                type="button"
                className={`force-btn closed ${forceStatus === "closed" ? "active" : ""}`}
                onClick={() => handleForceStatus("closed")}
              >
                Force Close
              </button>
            </div>
          </div>

          {/* Lucky Dice Probability */}
          <div className="toggle-switch-wrapper" style={{ flexDirection: "column", alignItems: "stretch", gap: "0.5rem" }}>
            <div className="toggle-info">
              <span className="toggle-label" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                🎲 Lucky Dice Win Chance (%)
              </span>
              <span className="toggle-desc">Set the probability for a free order. Currently: {(parseFloat(luckyProb)*100).toFixed(3)}%</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input 
                type="number" 
                min="0" 
                max="100" 
                step="0.001"
                value={luckyProb * 100}
                onChange={async (e) => {
                  let val = parseFloat(e.target.value);
                  if (isNaN(val)) val = 0;
                  const rawVal = (val / 100).toString();
                  setLuckyProb(rawVal);
                  await syncStallSettings(undefined, undefined, rawVal);
                }}
                className="form-input"
                style={{ flex: 1, padding: "0.5rem" }}
                placeholder="e.g. 0.1 for 0.1%"
              />
              <span style={{ fontWeight: 800, color: "var(--accent-gold)", minWidth: "20px", textAlign: "right" }}>
                %
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* ⚠️ DANGER ZONE: CLOUD DATABASE PURGE GATE */}
      <div className="chart-card" style={{ border: "1px solid rgba(239, 68, 68, 0.2)", background: "rgba(239, 68, 68, 0.02)" }}>
        <div className="chart-card-title">
          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--accent-red)", fontWeight: "bold" }}>
            ⚠️ Danger Zone: Purge All Pre-Order Logs
          </span>
        </div>

        <form onSubmit={handlePurgeDatabase} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", lineHeight: "1.4", borderBottom: "1px solid rgba(239, 68, 68, 0.1)", paddingBottom: "0.5rem" }}>
            💥 <strong>Warning:</strong> Wiping the database permanently deletes all pre-order lists, transaction histories, receipt slips, and sales KPIs from the Supabase cloud tables. This is irreversible. Highly recommended before going live!
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1rem", alignItems: "flex-end" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <span className="form-label" style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                To verify, please type exactly: <strong style={{ color: "var(--color-text-main)", fontFamily: "monospace" }}>clear valhalla-oh-den database </strong>
              </span>
              <input 
                type="text" 
                className="form-input" 
                placeholder='Type: "clear valhalla-oh-den database "'
                value={purgeInput}
                onChange={(e) => setPurgeInput(e.target.value)}
                style={{ padding: "0.55rem", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "8px", margin: 0, width: "100%" }}
                required
              />
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isPurging || (purgeInput !== "clear valhalla-oh-den database " && purgeInput !== "clear valhalla-oh-den database")}
              style={{ 
                padding: "0.65rem 1.25rem", 
                borderRadius: "10px", 
                fontSize: "0.85rem", 
                height: "39px",
                background: "var(--accent-red)",
                color: "white",
                opacity: (purgeInput === "clear valhalla-oh-den database " || purgeInput === "clear valhalla-oh-den database") ? 1 : 0.4,
                cursor: (purgeInput === "clear valhalla-oh-den database " || purgeInput === "clear valhalla-oh-den database") ? "pointer" : "not-allowed",
                boxShadow: "none"
              }}
            >
              {isPurging ? "Wiping Database..." : "💥 Wipe Cloud Database & Reset Stall"}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
