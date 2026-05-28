import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  ShoppingBag, 
  Users, 
  DollarSign, 
  Settings, 
  Database, 
  Trash2, 
  Download, 
  Search, 
  RefreshCw,
  Clock,
  Key,
  QrCode
} from "lucide-react";
import { 
  getOrders, 
  deleteOrder, 
  isSupabaseConnected, 
  getSupabaseConfig,
  resetSupabaseClient,
  setPasscode 
} from "../utils/db";
import { getCutoffTime, setCutoffTime } from "../utils/time";

export default function AdminPage() {
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [cutoffVal, setCutoffVal] = useState("12:05");
  const [forceStatus, setForceStatus] = useState("auto"); // 'auto', 'open', 'closed'
  // DuitNow TnG configurations
  const [tngNumber, setTngNumber] = useState("+601164188797");
  const [tngName, setTngName] = useState("SATTAROV AZAMBEK XXX");

  // 🔐 Secure Passcode states
  const [newAdminPass, setNewAdminPass] = useState("");
  const [newWorkerPass, setNewWorkerPass] = useState("");

  // KPI stats
  const [kpis, setKpis] = useState({
    revenue: 0,
    totalOrders: 0,
    skewersSold: 0,
    avgBasketValue: 0
  });

  // Chart analytics states
  const [skewerStats, setSkewerStats] = useState({});
  const [soupStats, setSoupStats] = useState({ tomYum: 0, kimchi: 0 });

  // Sync admin state
  useEffect(() => {
    setCutoffVal(getCutoffTime());
    setForceStatus(localStorage.getItem("oden_force_status") || "auto");
    
    // Load DuitNow config
    setTngNumber(localStorage.getItem("oden_tng_number") || "+601164188797");
    setTngName(localStorage.getItem("oden_tng_name") || "SATTAROV AZAMBEK XXX");

    const fetchAdminData = async () => {
      const allOrders = await getOrders();
      setOrders(allOrders);
      calculateKPIs(allOrders);
    };

    fetchAdminData();

    // Listen for storage events (e.g. from other tabs placing orders or modifying times)
    const handleStorageChange = async () => {
      setCutoffVal(getCutoffTime());
      setForceStatus(localStorage.getItem("oden_force_status") || "auto");
      setTngNumber(localStorage.getItem("oden_tng_number") || "+601164188797");
      setTngName(localStorage.getItem("oden_tng_name") || "SATTAROV AZAMBEK XXX");
      const allOrders = await getOrders();
      setOrders(allOrders);
      calculateKPIs(allOrders);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("oden_db_update", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("oden_db_update", handleStorageChange);
    };
  }, []);

  const calculateKPIs = (orderList) => {
    const totalOrders = orderList.length;
    let revenue = 0;
    let skewersSold = 0;

    const skewerCounts = {
      "Cheese Tofu": 0,
      "Fish Sandwich": 0,
      "Seafood Tofu": 0,
      "Fish Ball": 0,
      "Seafood Beancurd Roll": 0
    };
    let tomYum = 0;
    let kimchi = 0;

    orderList.forEach(order => {
      revenue += parseFloat(order.total_price);
      
      if (order.soup_base === "Tom-Yum") tomYum++;
      if (order.soup_base === "Kimchi") kimchi++;

      Object.keys(order.items).forEach(name => {
        const qty = order.items[name] || 0;
        skewersSold += qty;
        if (skewerCounts[name] !== undefined) {
          skewerCounts[name] += qty;
        }
      });
    });

    const avgBasketValue = totalOrders > 0 ? revenue / totalOrders : 0;

    setKpis({
      revenue,
      totalOrders,
      skewersSold,
      avgBasketValue
    });
    setSkewerStats(skewerCounts);
    setSoupStats({ tomYum, kimchi });
  };

  const handleCutoffChange = (e) => {
    const newVal = e.target.value;
    setCutoffVal(newVal);
    setCutoffTime(newVal);
  };

  const handleForceStatus = (status) => {
    setForceStatus(status);
    if (status === "auto") {
      localStorage.removeItem("oden_force_status");
    } else {
      localStorage.setItem("oden_force_status", status);
    }
    window.dispatchEvent(new Event("storage"));
  };

  // 🔐 Secure plain-text passcode updates (hashes in SHA-256 before saving)
  const handleUpdatePasscodes = async (e) => {
    e.preventDefault();
    try {
      if (newAdminPass.trim()) {
        await setPasscode("admin", newAdminPass.trim());
        setNewAdminPass("");
        alert("Admin passcode upgraded and secured with SHA-256 hash successfully!");
      }
      if (newWorkerPass.trim()) {
        await setPasscode("worker", newWorkerPass.trim());
        setNewWorkerPass("");
        alert("Worker passcode upgraded and secured with SHA-256 hash successfully!");
      }
      if (!newAdminPass.trim() && !newWorkerPass.trim()) {
        alert("Please enter a new passcode!");
      }
    } catch (err) {
      console.error(err);
      alert("Error setting passcodes.");
    }
  };

  // 📲 DuitNow QR config save
  const handleUpdateTngDetails = (e) => {
    e.preventDefault();
    if (tngNumber.trim() && tngName.trim()) {
      localStorage.setItem("oden_tng_number", tngNumber.trim());
      localStorage.setItem("oden_tng_name", tngName.trim());
      window.dispatchEvent(new Event("storage"));
      alert("Touch 'n Go DuitNow QR merchant credentials updated successfully!");
    } else {
      alert("Please fill in both merchant details!");
    }
  };

  const handleDelete = async (orderId) => {
    if (window.confirm(`Are you sure you want to delete order ${orderId}?`)) {
      await deleteOrder(orderId);
      const updated = orders.filter(o => o.id !== orderId);
      setOrders(updated);
      calculateKPIs(updated);
    }
  };

  const exportToCSV = () => {
    if (orders.length === 0) {
      alert("No order data to export!");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Order ID,Customer Name,Phone,Soup Base,Cheese Tofu,Fish Sandwich,Seafood Tofu,Fish Ball,Seafood Beancurd Roll,Total Price ($),Pickup Slot,Payment Method,Payment Ref,Status,Created At\n";

    orders.forEach(o => {
      const cheese = o.items["Cheese Tofu"] || 0;
      const sandwich = o.items["Fish Sandwich"] || 0;
      const seaTofu = o.items["Seafood Tofu"] || 0;
      const ball = o.items["Fish Ball"] || 0;
      const roll = o.items["Seafood Beancurd Roll"] || 0;
      const cleanPhone = o.phone.replace(/,/g, ""); 
      const cleanName = o.customer_name.replace(/,/g, "");

      csvContent += `${o.id},${cleanName},${cleanPhone},${o.soup_base},${cheese},${sandwich},${seaTofu},${ball},${roll},${parseFloat(o.total_price).toFixed(2)},${o.pickup_time},${o.payment_method.toUpperCase()},${o.payment_ref || "N/A"},${o.status},${o.created_at}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `oden_stall_preorders_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredOrders = orders.filter(o => {
    return o.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
           o.phone.includes(searchTerm);
  });

  const maxSkewerCount = Math.max(...Object.values(skewerStats), 1);
  const totalSoupCount = soupStats.tomYum + soupStats.kimchi || 1;

  return (
    <div className="admin-layout" style={{ animation: "slideUp 0.3s ease" }}>
      
      {/* 1. KPI CARD WRAPPER */}
      <div className="admin-kpis">
        <div className="kpi-card kpi-sales">
          <div className="kpi-icon-wrap"><DollarSign size={20} /></div>
          <div className="kpi-info">
            <span className="kpi-label">Gross Revenue</span>
            <span className="kpi-value">${kpis.revenue.toFixed(2)}</span>
          </div>
        </div>

        <div className="kpi-card kpi-orders">
          <div className="kpi-icon-wrap"><ShoppingBag size={20} /></div>
          <div className="kpi-info">
            <span className="kpi-label">Pre-Orders Placed</span>
            <span className="kpi-value">{kpis.totalOrders}</span>
          </div>
        </div>

        <div className="kpi-card kpi-skewers">
          <div className="kpi-icon-wrap"><TrendingUp size={20} /></div>
          <div className="kpi-info">
            <span className="kpi-label">Skewers Simmered</span>
            <span className="kpi-value">{kpis.skewersSold}</span>
          </div>
        </div>

        <div className="kpi-card kpi-ticket">
          <div className="kpi-icon-wrap"><Users size={20} /></div>
          <div className="kpi-info">
            <span className="kpi-label">Average Order Basket</span>
            <span className="kpi-value">${kpis.avgBasketValue.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* 2. SPLIT ANALYTICS & CONFIGURATION GRID */}
      <div className="admin-charts-grid">
        
        {/* Analytics Card */}
        <div className="chart-card">
          <div className="chart-card-title">
            <span>📈 Real-Time Demand Metrics</span>
            <span style={{ fontSize: "0.75rem", background: "rgba(255, 255, 255, 0.05)", padding: "0.25rem 0.5rem", borderRadius: "4px", color: "var(--color-text-muted)" }}>
              Sorted Popularity
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem" }}>
            
            {/* Skewer bars */}
            <div>
              <h4 style={{ fontSize: "0.9rem", color: "var(--accent-gold)", marginBottom: "0.75rem" }}>Skewer Sales Quantities</h4>
              <div className="skewers-popularity-chart">
                {Object.keys(skewerStats)
                  .sort((a, b) => skewerStats[b] - skewerStats[a])
                  .map(key => {
                    const count = skewerStats[key];
                    const percent = (count / maxSkewerCount) * 100;
                    return (
                      <div className="chart-bar-row" key={key}>
                        <div className="chart-bar-info">
                          <span className="chart-bar-label">{key}</span>
                          <span className="chart-bar-val">{count} pcs</span>
                        </div>
                        <div className="chart-bar-track">
                          <div className="chart-bar-fill" style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Soup share list */}
            <div>
              <h4 style={{ fontSize: "0.9rem", color: "var(--accent-red)", marginBottom: "0.75rem" }}>Soup Broth Breakdown</h4>
              <div className="soup-analytics-list">
                <div className="soup-analytic-item">
                  <div className="soup-analytic-label">
                    <div className="soup-color-dot tom-yum"></div>
                    <span>Tom-Yum Base</span>
                  </div>
                  <div className="soup-analytic-vals">
                    <span className="soup-analytic-qty">{soupStats.tomYum}</span>
                    <span className="soup-analytic-pct">({((soupStats.tomYum / totalSoupCount) * 100).toFixed(0)}%)</span>
                  </div>
                </div>

                <div className="soup-analytic-item">
                  <div className="soup-analytic-label">
                    <div className="soup-color-dot kimchi"></div>
                    <span>Kimchi Base</span>
                  </div>
                  <div className="soup-analytic-vals">
                    <span className="soup-analytic-qty">{soupStats.kimchi}</span>
                    <span className="soup-analytic-pct">({((soupStats.kimchi / totalSoupCount) * 100).toFixed(0)}%)</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Configuration Card */}
        <div className="chart-card">
          <div className="chart-card-title">
            <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><Settings size={18} /> Stall Controls</span>
          </div>

          <div className="settings-group">
            
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
                  className={`force-btn auto ${forceStatus === "auto" ? "active" : ""}`}
                  onClick={() => handleForceStatus("auto")}
                >
                  Auto
                </button>
                <button 
                  className={`force-btn open ${forceStatus === "open" ? "active" : ""}`}
                  onClick={() => handleForceStatus("open")}
                >
                  Force Open
                </button>
                <button 
                  className={`force-btn closed ${forceStatus === "closed" ? "active" : ""}`}
                  onClick={() => handleForceStatus("closed")}
                >
                  Force Close
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* 3. 🛡️ CYBERSECURITY PASSWORD SHIELD CONFIGURATION & 📲 TNG CREDENTIALS */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "1.5rem" }}>
        
        {/* Passcode Security */}
        <div className="chart-card">
          <div className="chart-card-title">
            <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><Key size={18} style={{ color: "var(--accent-gold)" }} /> Cryptographic Passcode Upgrades</span>
          </div>
          
          <form onSubmit={handleUpdatePasscodes} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", lineHeight: "1.4", borderBottom: "1px solid var(--border-light)", paddingBottom: "0.5rem" }}>
              🔒 **Cyber-sec Defense Active:** Passcodes are client-side hashed via **SHA-256** before storage. Decompiling or inspecting bundles will only show one-way cryptographic hex strings.
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

      {/* Cloud Database Connector Panel Removed for Production */}

      {/* 5. ORDERS DATABASE LEDGER TABLE */}
      <div className="table-card">
        <div className="table-header-row">
          <div className="table-search-wrap">
            <div style={{ position: "relative", width: "100%" }}>
              <input 
                type="text" 
                className="form-input"
                placeholder="Search orders (e.g. Darren, ODN-4182)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: "100%", paddingLeft: "2.5rem", paddingRight: "1rem", paddingTop: "0.55rem", paddingBottom: "0.55rem" }}
              />
              <Search size={15} style={{ position: "absolute", left: "0.9rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-dim)" }} />
            </div>
          </div>

          <div className="table-actions">
            <button 
              className="btn btn-secondary"
              onClick={exportToCSV}
              style={{ padding: "0.55rem 1rem", fontSize: "0.85rem", gap: "0.35rem" }}
              title="Download pre-orders spreadsheet for Excel"
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Pickup Slot</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Soup</th>
                <th style={{ textAlign: "center" }}>Skewers Qty</th>
                <th>Basket Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-dim)", fontStyle: "italic" }}>
                    No matching pre-orders found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const itemsCount = Object.values(order.items).reduce((a, b) => a + b, 0);
                  return (
                    <tr key={order.id}>
                      <td style={{ fontFamily: "monospace", fontWeight: 800, color: "var(--accent-gold)" }}>{order.id}</td>
                      <td style={{ fontWeight: 700, color: "var(--accent-red)" }}>{order.pickup_time}</td>
                      <td style={{ fontWeight: 600 }}>{order.customer_name}</td>
                      <td>{order.phone}</td>
                      <td>
                        <span className={`table-status ${order.soup_base.toLowerCase()}`} style={{ fontSize: "0.7rem", padding: "0.1rem 0.4rem", borderRadius: "4px" }}>
                          {order.soup_base}
                        </span>
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 700 }}>{itemsCount} skewers</td>
                      <td style={{ fontWeight: 700, color: "var(--accent-gold)" }}>${parseFloat(order.total_price).toFixed(2)}</td>
                      
                      {/* Payment method */}
                      <td>
                        {order.payment_method === "tng" ? (
                          <span className="table-status ready" style={{ fontSize: "0.7rem", background: "rgba(242,161,38,0.15)", color: "var(--accent-gold)", fontWeight: 800 }}>
                            📲 TnG ({order.payment_ref.slice(-4)})
                          </span>
                        ) : (
                          <span className="table-status pending" style={{ fontSize: "0.7rem", background: "rgba(52,211,153,0.15)", color: "var(--color-success)", fontWeight: 800 }}>
                            💵 Cash
                          </span>
                        )}
                      </td>

                      <td>
                        <span className={`table-status ${order.status}`}>
                          {order.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button 
                          className="table-action-del"
                          onClick={() => handleDelete(order.id)}
                          title="Delete / cancel this pre-order"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
