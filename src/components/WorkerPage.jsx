import React, { useState, useEffect, useRef } from "react";
import { 
  Flame, 
  Clock, 
  Bell, 
  Check, 
  Printer, 
  Phone, 
  Inbox, 
  Image,
  DollarSign,
  QrCode,
  X 
} from "lucide-react";
import { subscribeOrders, updateOrderStatus } from "../utils/db";

// Browser Synthetic "Ding-Dong" bell to avoid external asset dependency
function playKitchenChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // First high note (Ding)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, ctx.currentTime); 
    gain1.gain.setValueAtTime(0.12, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.45);
    
    // Second lower note (Dong)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.14); 
    gain2.gain.setValueAtTime(0.12, ctx.currentTime + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.14);
    osc2.stop(ctx.currentTime + 0.65);
  } catch (e) {
    console.error("Audio synth error:", e);
  }
}

export default function WorkerPage() {
  const [orders, setOrders] = useState([]);
  const [selectedPrintOrder, setSelectedPrintOrder] = useState(null);
  const [activeReceiptOrder, setActiveReceiptOrder] = useState(null); // Modal viewer order
  const prevOrdersCountRef = useRef(0);
  const initialLoadRef = useRef(true);

  // Subscribe to real-time order streams
  useEffect(() => {
    const unsubscribe = subscribeOrders((freshOrders) => {
      const currentPendingCount = freshOrders.filter(o => o.status === "pending").length;
      if (!initialLoadRef.current && currentPendingCount > prevOrdersCountRef.current) {
        playKitchenChime();
      }
      setOrders(freshOrders);
      prevOrdersCountRef.current = currentPendingCount;
      initialLoadRef.current = false;
    });

    return () => unsubscribe();
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
    } catch (e) {
      alert("Failed to update status. Please try again.");
    }
  };

  const triggerChimeManual = () => {
    playKitchenChime();
  };

  const handlePrint = (order) => {
    setSelectedPrintOrder(order);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const pendingOrders = orders.filter(o => o.status === "pending");
  const preparingOrders = orders.filter(o => o.status === "preparing");
  const readyOrders = orders.filter(o => o.status === "ready");
  const completedOrders = orders.filter(o => o.status === "completed");

  return (
    <div className="worker-layout" style={{ animation: "slideUp 0.3s ease" }}>
      
      {/* Page Header */}
      <div className="worker-header">
        <div className="worker-title-group">
          <h2>👨‍🍳 Kitchen Prep Dashboard</h2>
          <p>Manage incoming customer pre-orders, verify payments, and coordinate hot pickup batches at the APU Atrium in real-time.</p>
        </div>

        <button 
          className="btn btn-secondary" 
          onClick={triggerChimeManual}
          title="Test kitchen bell speaker"
          style={{ padding: "0.6rem 1rem", fontSize: "0.85rem", gap: "0.35rem" }}
        >
          <Bell size={15} /> Test Chime
        </button>
      </div>

      {/* Kanban Board Columns */}
      <div className="worker-board-grid">
        
        {/* COLUMN 1: PENDING ORDERS */}
        <div className="worker-column pending">
          <div className="worker-column-header">
            <span className="worker-column-title">
              <Inbox size={16} /> Pending
            </span>
            <span className="worker-column-count">{pendingOrders.length}</span>
          </div>

          <div className="worker-order-list">
            {pendingOrders.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-dim)", fontSize: "0.85rem", fontStyle: "italic" }}>
                No pending orders.
              </div>
            ) : (
              pendingOrders.map(order => (
                <div key={order.id} className="order-card">
                  <div className="order-card-header">
                    <span className="order-card-id">{order.id}</span>
                    <span className="order-card-time">
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div>
                    <div className="order-card-cust">{order.customer_name}</div>
                    <div className="order-card-phone">
                      <a 
                        href={`https://wa.me/${order.phone.replace(/[^0-9]/g, "")}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", gap: "0.2rem", color: "var(--color-success)", textDecoration: "none" }}
                      >
                        <Phone size={11} /> {order.phone}
                      </a>
                    </div>
                  </div>

                  {/* Payment Badging */}
                  <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                    <span className={`order-card-soup ${order.soup_base.toLowerCase()}`}>
                      🍲 {order.soup_base}
                    </span>
                    {order.payment_method === "tng" ? (
                      <span 
                        className="order-card-soup" 
                        style={{ background: "rgba(242, 161, 38, 0.12)", color: "var(--accent-gold)", display: "inline-flex", alignItems: "center", gap: "0.15rem", cursor: "pointer" }}
                        onClick={() => setActiveReceiptOrder(order)}
                        title="Click to verify screenshot slip"
                      >
                        <QrCode size={11} /> TnG (Ref: {order.payment_ref.slice(-4)}) 📸
                      </span>
                    ) : (
                      <span 
                        className="order-card-soup" 
                        style={{ 
                          background: "rgba(239, 68, 68, 0.15)", 
                          color: "var(--accent-red)", 
                          display: "inline-flex", 
                          alignItems: "center", 
                          gap: "0.15rem",
                          fontWeight: "bold"
                        }}
                      >
                        <DollarSign size={11} /> Cash (Pay First ⚠️)
                      </span>
                    )}
                  </div>

                  <div className="order-card-items">
                    {Object.keys(order.items).map(name => (
                      <div className="order-card-item" key={name}>
                        <span className="order-card-item-name">{name}</span>
                        <span className="order-card-qty">x{order.items[name]}</span>
                      </div>
                    ))}
                  </div>

                  <div className="order-card-pickup" style={{ color: "var(--accent-red)" }}>
                    <Clock size={13} /> Pickup: {order.pickup_time}
                  </div>

                  <div className="order-card-footer">
                    {order.payment_method === "cash" ? (
                      <button 
                        className="order-action-btn btn-cook"
                        onClick={() => handleStatusChange(order.id, "preparing")}
                        style={{ background: "var(--color-success)", color: "white", flex: 1, fontWeight: "bold" }}
                      >
                        💵 Confirm Pay & Cook
                      </button>
                    ) : (
                      <button 
                        className="order-action-btn btn-cook"
                        onClick={() => handleStatusChange(order.id, "preparing")}
                      >
                        <Flame size={12} /> Start Prep
                      </button>
                    )}
                    <button 
                      className="order-action-btn btn-print"
                      onClick={() => handlePrint(order)}
                      title="Print order kitchen slip"
                    >
                      <Printer size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 2: PREPARING ORDERS */}
        <div className="worker-column preparing">
          <div className="worker-column-header">
            <span className="worker-column-title">
              <Flame size={16} /> Cooking
            </span>
            <span className="worker-column-count">{preparingOrders.length}</span>
          </div>

          <div className="worker-order-list">
            {preparingOrders.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-dim)", fontSize: "0.85rem", fontStyle: "italic" }}>
                No active cooking.
              </div>
            ) : (
              preparingOrders.map(order => (
                <div key={order.id} className="order-card">
                  <div className="order-card-header">
                    <span className="order-card-id">{order.id}</span>
                    <span className="order-card-time">
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div>
                    <div className="order-card-cust">{order.customer_name}</div>
                    <div className="order-card-phone">
                      <a 
                        href={`https://wa.me/${order.phone.replace(/[^0-9]/g, "")}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", gap: "0.2rem", color: "var(--color-success)", textDecoration: "none" }}
                      >
                        <Phone size={11} /> {order.phone}
                      </a>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                    <span className={`order-card-soup ${order.soup_base.toLowerCase()}`}>
                      🍲 {order.soup_base}
                    </span>
                    {order.payment_method === "tng" ? (
                      <span 
                        className="order-card-soup" 
                        style={{ background: "rgba(242, 161, 38, 0.12)", color: "var(--accent-gold)", display: "inline-flex", alignItems: "center", gap: "0.15rem", cursor: "pointer" }}
                        onClick={() => setActiveReceiptOrder(order)}
                      >
                        <QrCode size={11} /> TnG (Ref: {order.payment_ref.slice(-4)}) 📸
                      </span>
                    ) : (
                      <span className="order-card-soup" style={{ background: "rgba(52, 211, 153, 0.12)", color: "var(--color-success)", display: "inline-flex", alignItems: "center", gap: "0.15rem" }}>
                        <DollarSign size={11} /> Cash
                      </span>
                    )}
                  </div>

                  <div className="order-card-items">
                    {Object.keys(order.items).map(name => (
                      <div className="order-card-item" key={name}>
                        <span className="order-card-item-name">{name}</span>
                        <span className="order-card-qty">x{order.items[name]}</span>
                      </div>
                    ))}
                  </div>

                  <div className="order-card-pickup" style={{ color: "var(--accent-gold)" }}>
                    <Clock size={13} /> Pickup: {order.pickup_time}
                  </div>

                  <div className="order-card-footer">
                    <button 
                      className="order-action-btn btn-ready"
                      onClick={() => handleStatusChange(order.id, "ready")}
                    >
                      <Bell size={12} /> Pack & Ready
                    </button>
                    <button 
                      className="order-action-btn btn-print"
                      onClick={() => handlePrint(order)}
                      title="Print order slip"
                    >
                      <Printer size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 3: READY FOR PICKUP */}
        <div className="worker-column ready">
          <div className="worker-column-header">
            <span className="worker-column-title">
              <Bell size={16} /> Ready
            </span>
            <span className="worker-column-count">{readyOrders.length}</span>
          </div>

          <div className="worker-order-list">
            {readyOrders.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-dim)", fontSize: "0.85rem", fontStyle: "italic" }}>
                Awaiting ready orders.
              </div>
            ) : (
              readyOrders.map(order => (
                <div key={order.id} className="order-card ready-state">
                  <div className="order-card-header">
                    <span className="order-card-id">{order.id}</span>
                    <span className="order-card-time">
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div>
                    <div className="order-card-cust">{order.customer_name}</div>
                    <div className="order-card-phone">
                      <a 
                        href={`https://wa.me/${order.phone.replace(/[^0-9]/g, "")}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", gap: "0.2rem", color: "var(--color-success)", textDecoration: "none" }}
                      >
                        <Phone size={11} /> {order.phone}
                      </a>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                    <span className={`order-card-soup ${order.soup_base.toLowerCase()}`}>
                      🍲 {order.soup_base}
                    </span>
                    {order.payment_method === "tng" ? (
                      <span 
                        className="order-card-soup" 
                        style={{ background: "rgba(242, 161, 38, 0.12)", color: "var(--accent-gold)", display: "inline-flex", alignItems: "center", gap: "0.15rem", cursor: "pointer" }}
                        onClick={() => setActiveReceiptOrder(order)}
                      >
                        <QrCode size={11} /> TnG (Ref: {order.payment_ref.slice(-4)}) 📸
                      </span>
                    ) : (
                      <span className="order-card-soup" style={{ background: "rgba(52, 211, 153, 0.12)", color: "var(--color-success)", display: "inline-flex", alignItems: "center", gap: "0.15rem" }}>
                        <DollarSign size={11} /> Cash
                      </span>
                    )}
                  </div>

                  <div className="order-card-items">
                    {Object.keys(order.items).map(name => (
                      <div className="order-card-item" key={name}>
                        <span className="order-card-item-name">{name}</span>
                        <span className="order-card-qty">x{order.items[name]}</span>
                      </div>
                    ))}
                  </div>

                  <div className="order-card-pickup" style={{ color: "var(--color-success)" }}>
                    <Clock size={13} /> Pickup: {order.pickup_time}
                  </div>

                  <div className="order-card-footer">
                    <button 
                      className="order-action-btn btn-complete"
                      onClick={() => handleStatusChange(order.id, "completed")}
                    >
                      <Check size={12} /> Hand Over
                    </button>
                    <button 
                      className="order-action-btn btn-print"
                      onClick={() => handlePrint(order)}
                      title="Print order slip"
                    >
                      <Printer size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 4: COMPLETED ORDERS */}
        <div className="worker-column completed">
          <div className="worker-column-header">
            <span className="worker-column-title">
              <Check size={16} /> Done
            </span>
            <span className="worker-column-count">{completedOrders.length}</span>
          </div>

          <div className="worker-order-list">
            {completedOrders.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-dim)", fontSize: "0.85rem", fontStyle: "italic" }}>
                No completed history.
              </div>
            ) : (
              completedOrders.slice(0, 15).map(order => (
                <div key={order.id} className="order-card" style={{ opacity: 0.65 }}>
                  <div className="order-card-header">
                    <span className="order-card-id" style={{ color: "var(--color-text-dim)" }}>{order.id}</span>
                    <span className="order-card-time">
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div>
                    <div className="order-card-cust" style={{ textDecoration: "line-through" }}>{order.customer_name}</div>
                  </div>

                  <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                    <span className="order-card-soup" style={{ background: "rgba(255, 255, 255, 0.05)", color: "var(--color-text-muted)" }}>
                      🍲 {order.soup_base}
                    </span>
                    {order.payment_method === "tng" ? (
                      <span 
                        className="order-card-soup" 
                        style={{ background: "rgba(255, 255, 255, 0.05)", color: "var(--color-text-muted)", display: "inline-flex", alignItems: "center", gap: "0.15rem", cursor: "pointer" }}
                        onClick={() => setActiveReceiptOrder(order)}
                      >
                        <QrCode size={11} /> TnG (Ref: {order.payment_ref.slice(-4)}) 📸
                      </span>
                    ) : (
                      <span className="order-card-soup" style={{ background: "rgba(255, 255, 255, 0.05)", color: "var(--color-text-muted)", display: "inline-flex", alignItems: "center", gap: "0.15rem" }}>
                        <DollarSign size={11} /> Cash
                      </span>
                    )}
                  </div>

                  <div className="order-card-items">
                    {Object.keys(order.items).map(name => (
                      <div className="order-card-item" key={name}>
                        <span className="order-card-item-name">{name}</span>
                        <span className="order-card-qty">x{order.items[name]}</span>
                      </div>
                    ))}
                  </div>

                  <div className="order-card-footer">
                    <button 
                      className="order-action-btn btn-print"
                      onClick={() => handlePrint(order)}
                      title="Reprint order slip"
                      style={{ maxWidth: "100%" }}
                    >
                      <Printer size={12} /> Reprint Ticket
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* 📸 POPUP MODAL: Touch 'n Go screenshot Receipt Slip Viewer */}
      {activeReceiptOrder && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.8)", backdropFilter: "blur(8px)", display: "flex", zIndex: 1000, padding: "2rem", animation: "fadeIn 0.25s ease" }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-light)", borderRadius: "16px", maxWidth: "450px", width: "100%", margin: "auto", padding: "1.5rem", boxShadow: "var(--shadow-lg)", position: "relative", animation: "slideUp 0.3s ease" }}>
            
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "between", alignItems: "center", borderBottom: "1px solid var(--border-light)", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "1.1rem", fontWeight: 800 }}>TNG eWallet Slip Verification</span>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Order Reference: <strong style={{ color: "var(--accent-gold)", fontFamily: "monospace" }}>{activeReceiptOrder.id}</strong></span>
              </div>
              <button 
                onClick={() => setActiveReceiptOrder(null)}
                style={{ background: "transparent", border: "none", color: "var(--color-text-muted)", cursor: "pointer", marginLeft: "auto" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body: Slip Details */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", background: "var(--bg-input)", padding: "0.75rem", borderRadius: "8px", fontSize: "0.85rem" }}>
                <div>
                  <span style={{ color: "var(--color-text-muted)", display: "block" }}>Customer Name</span>
                  <strong>{activeReceiptOrder.customer_name}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-muted)", display: "block" }}>TnG Reference ID</span>
                  <strong style={{ color: "var(--accent-gold)", fontFamily: "monospace" }}>{activeReceiptOrder.payment_ref}</strong>
                </div>
                <div style={{ marginTop: "0.5rem" }}>
                  <span style={{ color: "var(--color-text-muted)", display: "block" }}>Transfer Total</span>
                  <strong style={{ color: "var(--accent-red)", fontSize: "1rem" }}>${parseFloat(activeReceiptOrder.total_price).toFixed(2)}</strong>
                </div>
                <div style={{ marginTop: "0.5rem" }}>
                  <span style={{ color: "var(--color-text-muted)", display: "block" }}>Pickup Slot</span>
                  <strong>{activeReceiptOrder.pickup_time}</strong>
                </div>
              </div>

              {/* Render Slip Image screenshot */}
              <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border-light)", display: "flex", background: "black", minHeight: "250px" }}>
                {activeReceiptOrder.payment_slip ? (
                  <img 
                    src={activeReceiptOrder.payment_slip} 
                    alt="Touch n Go success payment slip" 
                    style={{ width: "100%", maxHeight: "350px", objectFit: "contain", margin: "auto" }}
                  />
                ) : (
                  <div style={{ color: "var(--color-text-dim)", margin: "auto", fontSize: "0.85rem", fontStyle: "italic", textAlign: "center", padding: "2rem" }}>
                    ⚠️ No screenshot slip uploaded for this transaction.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ marginTop: "1.5rem", display: "flex", justify: "end" }}>
              <button 
                className="btn btn-primary" 
                onClick={() => setActiveReceiptOrder(null)}
                style={{ width: "100%", justifyContent: "center" }}
              >
                Close & Confirm Verification
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Hidden Thermal Printer Slip Mock Element (Visible only during window.print()) */}
      {selectedPrintOrder && (
        <div style={{ display: "none" }}>
          <div className="receipt-card">
            <div className="receipt-header">
              <div className="receipt-logo">🍢</div>
              <div className="receipt-shop-name">VALHALLA OH-DEN! (KITCHEN)</div>
              <div style={{ fontSize: "0.8rem", fontWeight: "bold" }}>-- PRE-ORDER SLIP --</div>
              <div className="receipt-number">{selectedPrintOrder.id}</div>
            </div>
            
            <div className="receipt-meta">
              <div className="receipt-meta-row">
                <span>Customer:</span>
                <span>{selectedPrintOrder.customer_name}</span>
              </div>
              <div className="receipt-meta-row">
                <span>Payment:</span>
                <span style={{ textTransform: "uppercase", fontWeight: "bold" }}>
                  {selectedPrintOrder.payment_method === "tng" ? `TnG (Ref: ${selectedPrintOrder.payment_ref.slice(-4)})` : "Cash on Pickup"}
                </span>
              </div>
              <div className="receipt-meta-row">
                <span>Pickup Slot:</span>
                <span style={{ fontSize: "1.1rem", fontWeight: "bold" }}>{selectedPrintOrder.pickup_time}</span>
              </div>
            </div>

            <div className="receipt-items">
              <div style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>
                🍲 Broth: {selectedPrintOrder.soup_base} Base
              </div>
              {Object.keys(selectedPrintOrder.items).map(name => (
                <div className="receipt-item-row" key={name}>
                  <span className="receipt-item-name" style={{ fontSize: "1.1rem" }}>{name}</span>
                  <span className="receipt-item-qty" style={{ fontSize: "1.2rem", fontWeight: "bold" }}>x{selectedPrintOrder.items[name]}</span>
                </div>
              ))}
            </div>

            <div className="receipt-barcode">
              <div className="barcode-stripes"></div>
              <div className="barcode-text">{selectedPrintOrder.id}</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
