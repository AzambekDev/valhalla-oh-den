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
  setPasscode,
  clearOrders,
  syncStallSettings
} from "../utils/db";

export default function AdminPage() {
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;


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

    const fetchAdminData = async () => {
      const allOrders = await getOrders();
      setOrders(allOrders);
      calculateKPIs(allOrders);
    };

    fetchAdminData();

    // Listen for storage events (e.g. from other tabs placing orders or modifying times)
    const handleStorageChange = async () => {

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
    const cleanOrders = orderList.filter(o => o.id !== "STALL_SETTINGS");
    const totalOrders = cleanOrders.length;
    let revenue = 0;
    let skewersSold = 0;

    const skewerCounts = {
      "Lobster-flavoured balls": 0,
      "Stuffed squid rolls": 0,
      "Golden seafood rolls": 0,
      "Scallop-style seafood tofu": 0,
      "Fishball": 0
    };
    let tomYum = 0;
    let kimchi = 0;

    cleanOrders.forEach(order => {
      revenue += parseFloat(order.total_price);
      
      if (order.soup_base === "Tom-Yum") tomYum++;
      if (order.soup_base === "Kimchi") kimchi++;

      Object.keys(order.items || {}).forEach(name => {
        if (name === '_flags') return;
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



  const handleDelete = async (orderId) => {
    if (window.confirm(`Are you sure you want to delete order ${orderId}?`)) {
      await deleteOrder(orderId);
      const updated = orders.filter(o => o.id !== orderId);
      setOrders(updated);
      calculateKPIs(updated);
    }
  };



  const exportToCSV = () => {
    const cleanOrders = orders.filter(o => o.id !== "STALL_SETTINGS");
    if (cleanOrders.length === 0) {
      alert("No order data to export!");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Order ID,Customer Name,Phone,Soup Base,Lobster-flavoured balls,Stuffed squid rolls,Golden seafood rolls,Scallop-style seafood tofu,Fishball,Total Price ($),Pickup Slot,Payment Method,Payment Ref,Status,Created At\n";

    cleanOrders.forEach(o => {
      const lobster = o.items["Lobster-flavoured balls"] || 0;
      const squid = o.items["Stuffed squid rolls"] || 0;
      const golden = o.items["Golden seafood rolls"] || 0;
      const scallop = o.items["Scallop-style seafood tofu"] || 0;
      const fishball = o.items["Fishball"] || 0;
      const cleanPhone = o.phone.replace(/,/g, ""); 
      const cleanName = o.customer_name.replace(/,/g, "");

      csvContent += `${o.id},${cleanName},${cleanPhone},${o.soup_base},${lobster},${squid},${golden},${scallop},${fishball},${parseFloat(o.total_price).toFixed(2)},${o.pickup_time},${o.payment_method.toUpperCase()},${o.payment_ref || "N/A"},${o.status},${o.created_at}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `oden_stall_preorders_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportTodayCSV = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const todayOrders = orders.filter(o => {
      if (o.id === "STALL_SETTINGS") return false;
      const orderDate = new Date(o.created_at).toISOString().split("T")[0];
      return orderDate === todayStr;
    });

    if (todayOrders.length === 0) {
      alert("No order data recorded for today yet!");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Order ID,Customer Name,Phone,Soup Base,Lobster-flavoured balls,Stuffed squid rolls,Golden seafood rolls,Scallop-style seafood tofu,Fishball,Total Price ($),Pickup Slot,Payment Method,Payment Ref,Status,Created At\n";

    todayOrders.forEach(o => {
      const lobster = o.items["Lobster-flavoured balls"] || 0;
      const squid = o.items["Stuffed squid rolls"] || 0;
      const golden = o.items["Golden seafood rolls"] || 0;
      const scallop = o.items["Scallop-style seafood tofu"] || 0;
      const fishball = o.items["Fishball"] || 0;
      const cleanPhone = o.phone.replace(/,/g, ""); 
      const cleanName = o.customer_name.replace(/,/g, "");

      csvContent += `${o.id},${cleanName},${cleanPhone},${o.soup_base},${lobster},${squid},${golden},${scallop},${fishball},${parseFloat(o.total_price).toFixed(2)},${o.pickup_time},${o.payment_method.toUpperCase()},${o.payment_ref || "N/A"},${o.status},${o.created_at}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `oden_today_sales_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredOrders = orders.filter(o => {
    if (o.id === "STALL_SETTINGS") return false;
    return o.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
           o.phone.includes(searchTerm);
  });

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
      </div>

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
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ width: "100%", paddingLeft: "2.5rem", paddingRight: "1rem", paddingTop: "0.55rem", paddingBottom: "0.55rem" }}
              />
              <Search size={15} style={{ position: "absolute", left: "0.9rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-dim)" }} />
            </div>
          </div>

          <div className="table-actions" style={{ display: "flex", gap: "0.5rem" }}>
            <button 
              className="btn btn-secondary"
              onClick={exportTodayCSV}
              style={{ padding: "0.55rem 1rem", fontSize: "0.85rem", gap: "0.35rem", borderColor: "var(--accent-gold)", color: "var(--accent-gold)" }}
              title="Download daily sales spreadsheet for 4:00 PM accounting"
            >
              <Download size={14} /> Daily Sales (Today)
            </button>
            <button 
              className="btn btn-secondary"
              onClick={exportToCSV}
              style={{ padding: "0.55rem 1rem", fontSize: "0.85rem", gap: "0.35rem" }}
              title="Download all pre-orders spreadsheet for Excel"
            >
              <Download size={14} /> Export All CSV
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
                paginatedOrders.map(order => {
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
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
                            <span className="table-status ready" style={{ fontSize: "0.7rem", background: "rgba(242,161,38,0.15)", color: "var(--accent-gold)", fontWeight: 800 }}>
                              📲 TnG ({order.payment_ref.slice(-4)})
                            </span>
                            {order.items && order.items._flags && (!order.items._flags.amountMatch || !order.items._flags.nameMatch || !order.items._flags.isFresh) && (
                              <span style={{ fontSize: "0.65rem", color: "var(--accent-red)", fontWeight: 800, marginTop: "2px" }} title={`Amount Match: ${order.items._flags.amountMatch}, Name Match: ${order.items._flags.nameMatch}, Fresh: ${order.items._flags.isFresh}`}>
                                🚩 Suspicious Receipt
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="table-status pending" style={{ fontSize: "0.7rem", background: "rgba(52,211,153,0.15)", color: "var(--color-success)", fontWeight: 800 }}>
                            💵 Cash (Counter)
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

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border-light)", flexWrap: "wrap", gap: "0.75rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
              Showing <strong>{((currentPage - 1) * itemsPerPage) + 1}</strong> to <strong>{Math.min(currentPage * itemsPerPage, filteredOrders.length)}</strong> of <strong>{filteredOrders.length}</strong> orders
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <button 
                className="btn btn-secondary" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", borderRadius: "8px", minHeight: "32px", opacity: currentPage === 1 ? 0.4 : 1, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
              >
                Previous
              </button>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent-gold)" }}>Page {currentPage} of {totalPages}</span>
              <button 
                className="btn btn-secondary" 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", borderRadius: "8px", minHeight: "32px", opacity: currentPage === totalPages ? 0.4 : 1, cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
