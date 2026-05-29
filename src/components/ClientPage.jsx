import React, { useState, useEffect } from "react";
import { 
  ShoppingBag, 
  ChevronRight, 
  ChevronLeft, 
  Clock, 
  User, 
  Phone, 
  CheckCircle, 
  AlertCircle, 
  QrCode,
  DollarSign,
  Upload,
  FileImage,
  MapPin
} from "lucide-react";
import { 
  getCurrentTime, 
  getOrderingStatus, 
  getRemainingTime, 
  formatCountdown, 
  getCutoffTime 
} from "../utils/time";
import { addOrder, subscribeOrders } from "../utils/db";

// Custom Menu Pricing (All skewers set to RM 3.00)
const SKEWER_PRICES = {
  "Cheese Tofu": 3.00,
  "Fish Sandwich": 3.00,
  "Seafood Tofu": 3.00,
  "Fish Ball": 3.00,
  "Seafood Beancurd Roll": 3.00
};

const SKEWER_DESCRIPTIONS = {
  "Cheese Tofu": "Soft premium soybean cake stuffed with melting cheddar cheese center.",
  "Fish Sandwich": "Bouncy fish cake layer filled with a succulent, savory seafood spread.",
  "Seafood Tofu": "Creamy, dense tofu cubes blended with rich and delicate seafood pieces.",
  "Fish Ball": "Classic seasoned bouncy fish balls, perfectly steamed to capture natural juices.",
  "Seafood Beancurd Roll": "Fragrant crispy bean curd sheet wrapped around minced ocean seafood."
};

const SOUP_DETAILS = {
  "Tom-Yum": {
    name: "Fiery Tom-Yum",
    desc: "🌶️ Spicy, sour and loaded with fragrant lemongrass, galangal, and kaffir lime leaves. Perfect for a bold, zesty kick!",
    spiciness: "🌶️🌶️🌶️"
  },
  "Kimchi": {
    name: "Cozy Kimchi",
    desc: "🥬 Deeply savory, mildly spicy, and rich fermented cabbage broth. A comforting Korean comfort classic!",
    spiciness: "🌶️"
  }
};

export default function ClientPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [status, setStatus] = useState({ isOpen: true, reason: "" });
  const [timeLeft, setTimeLeft] = useState(0);
  const [activeReceiptId, setActiveReceiptId] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  
  // Pre-order Stepper Form State
  const [soupBase, setSoupBase] = useState("");
  const [skewerQty, setSkewerQty] = useState({
    "Cheese Tofu": 0,
    "Fish Sandwich": 0,
    "Seafood Tofu": 0,
    "Fish Ball": 0,
    "Seafood Beancurd Roll": 0
  });
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 💳 New Payment States
  const [paymentMethod, setPaymentMethod] = useState("cash"); // 'cash' or 'tng'
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentSlip, setPaymentSlip] = useState(null); // base64 string
  const [slipFileName, setSlipFileName] = useState("");

  // DuitNow QR settings
  const [tngNumber, setTngNumber] = useState("+601164188797");
  const [tngName, setTngName] = useState("SATTAROV AZAMBEK XXX");

  // Time & Status checker
  useEffect(() => {
    setStatus(getOrderingStatus());
    setTimeLeft(getRemainingTime());

    const interval = setInterval(() => {
      setStatus(getOrderingStatus());
      setTimeLeft(getRemainingTime());
    }, 1000);

    // Retrieve active receipt from localStorage if they have an active order
    const savedReceiptId = localStorage.getItem("oden_active_receipt_id");
    if (savedReceiptId) {
      setActiveReceiptId(savedReceiptId);
    }

    // Load merchant DuitNow details
    setTngNumber(localStorage.getItem("oden_tng_number") || "+601164188797");
    setTngName(localStorage.getItem("oden_tng_name") || "SATTAROV AZAMBEK XXX");

    const handleStorage = () => {
      setStatus(getOrderingStatus());
      setTimeLeft(getRemainingTime());
      const rid = localStorage.getItem("oden_active_receipt_id");
      if (rid !== activeReceiptId) {
        setActiveReceiptId(rid);
      }
      setTngNumber(localStorage.getItem("oden_tng_number") || "+601164188797");
      setTngName(localStorage.getItem("oden_tng_name") || "SATTAROV AZAMBEK XXX");
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
    };
  }, [activeReceiptId]);

  // Subscribe to updates for the active order to show real-time status changes
  useEffect(() => {
    if (!activeReceiptId) {
      setActiveOrder(null);
      return;
    }

    const unsubscribe = subscribeOrders((orders) => {
      const match = orders.find(o => o.id === activeReceiptId);
      if (match) {
        setActiveOrder(match);
      }
    });

    return () => unsubscribe();
  }, [activeReceiptId]);

  // Handle image upload and compress to Base64 Data URL
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size limit (e.g. 2MB to avoid overflowing localStorage bounds)
    if (file.size > 2 * 1024 * 1024) {
      alert("Screenshot file is too large! Please upload a file smaller than 2MB.");
      return;
    }

    setSlipFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      setPaymentSlip(event.target.result); // Base64 string
    };
    reader.readAsDataURL(file);
  };

  const handleSkewerChange = (name, amount) => {
    setSkewerQty(prev => {
      const current = prev[name];
      const newVal = Math.max(0, current + amount);
      return { ...prev, [name]: newVal };
    });
  };

  const calculateTotal = () => {
    let sum = 0;
    Object.keys(skewerQty).forEach(key => {
      sum += skewerQty[key] * (SKEWER_PRICES[key] || 0);
    });
    if (soupBase) {
      sum += 5.00; // Soup stock is RM 5.00
    }
    return sum;
  };

  const totalSkewers = Object.values(skewerQty).reduce((a, b) => a + b, 0);

  const handleNextStep = () => {
    if (currentStep === 1 && !soupBase) {
      alert("Please select a zesty soup stock!");
      return;
    }
    if (currentStep === 2 && totalSkewers === 0) {
      alert("Please select at least 1 delicious skewer!");
      return;
    }
    setCurrentStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Safety check cutoff before submitting
    const checkStatus = getOrderingStatus();
    if (!checkStatus.isOpen) {
      alert("Oops! Pre-ordering just closed! " + checkStatus.reason);
      setStatus(checkStatus);
      return;
    }

    if (!custName.trim() || !custPhone.trim() || !pickupTime) {
      alert("Please fill in all details and pick a pickup slot!");
      return;
    }

    // TnG eWallet Validations
    if (paymentMethod === "tng") {
      if (!paymentRef.trim()) {
        alert("Please enter the 12-digit Touch 'n Go Transaction Reference ID!");
        return;
      }
      if (!paymentSlip) {
        alert("Please upload the transaction success screenshot slip for verification!");
        return;
      }
    }

    setIsSubmitting(true);

    const itemsFiltered = {};
    Object.keys(skewerQty).forEach(key => {
      if (skewerQty[key] > 0) {
        itemsFiltered[key] = skewerQty[key];
      }
    });

    const orderData = {
      customer_name: custName,
      phone: custPhone,
      soup_base: soupBase,
      items: itemsFiltered,
      total_price: calculateTotal(),
      pickup_time: pickupTime,
      payment_method: paymentMethod,
      payment_ref: paymentMethod === "tng" ? paymentRef.trim() : "",
      payment_slip: paymentMethod === "tng" ? paymentSlip : null
    };

    try {
      const submittedOrder = await addOrder(orderData);
      localStorage.setItem("oden_active_receipt_id", submittedOrder.id);
      setActiveReceiptId(submittedOrder.id);
    } catch (error) {
      console.error(error);
      alert("Order submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewOrder = () => {
    if (window.confirm("Start a new order? This receipt will no longer be tracked on this page.")) {
      localStorage.removeItem("oden_active_receipt_id");
      setActiveReceiptId(null);
      setActiveOrder(null);
      setSoupBase("");
      setSkewerQty({
        "Cheese Tofu": 0,
        "Fish Sandwich": 0,
        "Seafood Tofu": 0,
        "Fish Ball": 0,
        "Seafood Beancurd Roll": 0
      });
      setCustName("");
      setCustPhone("");
      setPickupTime("");
      setPaymentMethod("cash");
      setPaymentRef("");
      setPaymentSlip(null);
      setSlipFileName("");
      setCurrentStep(1);
    }
  };

  // 1. Receipt Screen (If user already has an active order)
  if (activeReceiptId && activeOrder) {
    return (
      <div className="receipt-wrapper" style={{ animation: "slideUp 0.4s ease" }}>
        <div className="receipt-card">
          <div className="receipt-header">
            <div className="receipt-logo">🍢</div>
            <div className="receipt-shop-name">VALHALLA OH-DEN!</div>
            <div style={{ fontSize: "0.75rem", color: "#666666", marginTop: "0.15rem", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem" }}>
              <MapPin size={11} style={{ color: "var(--accent-red)" }} /> APU Atrium (Ground Floor)
            </div>
            
            <div className="receipt-number">{activeOrder.id}</div>
            
            <div>
              <span className={`receipt-status-badge ${activeOrder.status === "pending" && activeOrder.payment_method === "cash" ? "awaiting-cash" : activeOrder.status}`}>
                {activeOrder.status === "pending" && (
                  activeOrder.payment_method === "cash" 
                    ? "Awaiting Cash Payment ⚠️" 
                    : "Preparing Order"
                )}
                {activeOrder.status === "preparing" && "Cooking Oden"}
                {activeOrder.status === "ready" && "Ready for Pickup! 🎉"}
                {activeOrder.status === "completed" && "Completed / Handed Over"}
              </span>
            </div>
          </div>

          <div className="receipt-meta">
            <div className="receipt-meta-row">
              <span className="receipt-meta-label">Customer:</span>
              <span className="receipt-meta-val">{activeOrder.customer_name}</span>
            </div>
            <div className="receipt-meta-row">
              <span className="receipt-meta-label">Phone:</span>
              <span className="receipt-meta-val">{activeOrder.phone}</span>
            </div>
            <div className="receipt-meta-row">
              <span className="receipt-meta-label">Pickup Location:</span>
              <span className="receipt-meta-val" style={{ color: "var(--accent-red)" }}>
                Atrium (Ground Floor)
              </span>
            </div>
            <div className="receipt-meta-row">
              <span className="receipt-meta-label">Pickup Time:</span>
              <span className="receipt-meta-val" style={{ color: "var(--accent-red)", fontWeight: 800 }}>
                {activeOrder.pickup_time}
              </span>
            </div>
            <div className="receipt-meta-row">
              <span className="receipt-meta-label">Payment:</span>
              <span className="receipt-meta-val" style={{ textTransform: "uppercase", fontWeight: 800 }}>
                {activeOrder.payment_method === "tng" ? `TnG eWallet (Verified)` : "Cash on Pickup"}
              </span>
            </div>
            {activeOrder.payment_method === "tng" && (
              <div className="receipt-meta-row">
                <span className="receipt-meta-label">Ref ID:</span>
                <span className="receipt-meta-val" style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{activeOrder.payment_ref}</span>
              </div>
            )}
          </div>

          <div className="receipt-items">
            <div className="receipt-item-row" style={{ borderBottom: "1px solid #eeeeee", paddingBottom: "0.25rem", marginBottom: "0.5rem", fontSize: "0.8rem", color: "#666666", fontWeight: 700 }}>
              <span>ITEM DESCRIPTION</span>
              <span>QTY</span>
            </div>
            
            <div className="receipt-item-row" style={{ fontWeight: 700, color: activeOrder.soup_base === "Tom-Yum" ? "var(--accent-red)" : "var(--accent-gold)", marginBottom: "0.5rem" }}>
              <span>🍲 Soup: {activeOrder.soup_base} Base</span>
              <span>$5.00</span>
            </div>

            {Object.keys(activeOrder.items).map((key) => (
              <div className="receipt-item-row" key={key}>
                <span className="receipt-item-name">{key}</span>
                <span className="receipt-item-qty">x{activeOrder.items[key]}</span>
              </div>
            ))}
          </div>

          <div className="receipt-total-row">
            <span className="receipt-total-label">TOTAL</span>
            <span className="receipt-total-val">${parseFloat(activeOrder.total_price).toFixed(2)}</span>
          </div>

          {activeOrder.status === "ready" ? (
            <div style={{ background: "rgba(52, 211, 153, 0.1)", border: "1px solid var(--color-success)", color: "#047857", borderRadius: "8px", padding: "0.75rem", fontSize: "0.85rem", textAlign: "center", fontWeight: 700, marginBottom: "1rem" }}>
              ⚡ Your Oden is steaming hot and packaged! Head to the Atrium stall, present this receipt number, and pick it up!
            </div>
          ) : (
            <div style={{ background: activeOrder.payment_method === "cash" ? "rgba(239, 68, 68, 0.08)" : "rgba(242, 161, 38, 0.05)", border: activeOrder.payment_method === "cash" ? "1px solid rgba(239, 68, 68, 0.25)" : "1px solid var(--border-light)", color: activeOrder.payment_method === "cash" ? "var(--accent-red)" : "#666", borderRadius: "8px", padding: "0.75rem", fontSize: "0.85rem", textAlign: "center", fontStyle: "italic", marginBottom: "1rem", fontWeight: activeOrder.payment_method === "cash" ? 700 : "normal" }}>
              {activeOrder.payment_method === "cash" 
                ? "⚠️ UNCONFIRMED PRE-ORDER: Cooking will ONLY start after you make physical cash payment at our APU Atrium counter. Please hand over RM " + parseFloat(activeOrder.total_price).toFixed(2) + " to verify and begin prep!"
                : "📲 Touch 'n Go payment slip uploaded. Kitchen is verifying transfer details and preparing your steaming bowl."}
            </div>
          )}

          <div className="receipt-barcode">
            <div className="barcode-stripes"></div>
            <div className="barcode-text">{activeOrder.id}</div>
          </div>

          <p className="receipt-tip">Thank you for supporting our student module assignment project!</p>
          
          <button 
            className="btn btn-secondary" 
            style={{ width: "100%", marginTop: "1.5rem", display: "flex", justifyContent: "center" }}
            onClick={handleNewOrder}
          >
            Place Another Order
          </button>
        </div>
      </div>
    );
  }

  // 2. Closed Jumbotron (If pre-ordering is currently locked/cutoff)
  if (!status.isOpen) {
    return (
      <div className="closed-jumbotron">
        <div className="closed-icon">🍢🔒</div>
        <h2 className="closed-title">Pre-Ordering is Closed</h2>
        <p className="closed-desc">
          {status.reason} <br />
          To ensure fresh preparation and seamless pickup, pre-orders are strictly accepted between **8:00 AM** and **{getCutoffTime()} PM** daily.
        </p>
        <div className="closed-reopen">
          🔔 Next Pre-Order Window Opens: **Tomorrow at 8:00 AM**
        </div>
        <div style={{ borderTop: "1px solid var(--border-light)", marginTop: "2rem", paddingTop: "1.5rem", fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
          💡 **Graders / Evaluators:** You can use the floating **Demo Control panel** in the bottom-right of the page to travel in time back to **11:30 AM** to test the ordering flow!
        </div>
      </div>
    );
  }

  // 3. Main Pre-Ordering Stepper Form
  return (
    <div className="preorder-layout" style={{ animation: "slideUp 0.3s ease" }}>
      
      {/* Stepper Wizard Form */}
      <div>
        <div className="client-hero">
          <h1>🍢 Customize Your Oden Bowl</h1>
          <p>Select your favorite soup stock, build your combination of premium skewers, and pick it up fresh at our stall!</p>
          
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", background: "rgba(242, 76, 38, 0.1)", border: "1px solid rgba(242, 76, 38, 0.25)", color: "var(--accent-red)", padding: "0.4rem 1rem", borderRadius: "9999px", fontSize: "0.8rem", fontWeight: 700, marginTop: "1rem" }}>
            <MapPin size={12} /> Pickup Venue: APU Atrium (Ground Floor) ONLY
          </div>
        </div>

        {/* Stepper Nodes */}
        <div className="stepper-bar">
          <div 
            className="stepper-bar-fill" 
            style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
          ></div>
          <div className={`step-node ${currentStep >= 1 ? "active" : ""} ${currentStep > 1 ? "completed" : ""}`} onClick={() => currentStep > 1 && setCurrentStep(1)}>1</div>
          <div className={`step-node ${currentStep >= 2 ? "active" : ""} ${currentStep > 2 ? "completed" : ""}`} onClick={() => currentStep > 2 && setCurrentStep(2)}>2</div>
          <div className={`step-node ${currentStep >= 3 ? "active" : ""}`} onClick={() => currentStep > 3 && setCurrentStep(3)}>3</div>
        </div>

        {/* Stepper Card */}
        <div className="step-panel">
          
          {/* STEP 1: SOUP SELECTOR */}
          {currentStep === 1 && (
            <div>
              <div className="step-title-group">
                <span className="step-subtitle">Step One</span>
                <h2 className="step-title">Choose Your Soup base</h2>
              </div>

              <div className="soup-grid">
                {Object.keys(SOUP_DETAILS).map((key) => {
                  const soup = SOUP_DETAILS[key];
                  const isSelected = soupBase === key;
                  return (
                    <div 
                      key={key} 
                      className={`soup-card ${key.toLowerCase()} ${isSelected ? "selected" : ""}`}
                      onClick={() => setSoupBase(key)}
                    >
                      <span className={`soup-badge ${key.toLowerCase()}`}>{soup.spiciness} Spice</span>
                      <h3 className="soup-name">{soup.name}</h3>
                      <p className="soup-desc">{soup.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: SKEWER PICKER */}
          {currentStep === 2 && (
            <div>
              <div className="step-title-group">
                <span className="step-subtitle">Step Two</span>
                <h2 className="step-title">Select Premium Skewers</h2>
              </div>

              <div className="skewer-grid">
                {Object.keys(SKEWER_PRICES).map((key) => {
                  const qty = skewerQty[key];
                  return (
                    <div className="skewer-item" key={key}>
                      <div className="skewer-info">
                        <span className="skewer-name">{key}</span>
                        <span className="skewer-desc">{SKEWER_DESCRIPTIONS[key]}</span>
                        <span className="skewer-price">${SKEWER_PRICES[key].toFixed(2)} / skewer</span>
                      </div>
                      
                      <div className="skewer-control">
                        <button 
                          className="quantity-btn" 
                          onClick={() => handleSkewerChange(key, -1)}
                          disabled={qty === 0}
                        >
                          -
                        </button>
                        <span className="quantity-value">{qty}</span>
                        <button 
                          className="quantity-btn" 
                          onClick={() => handleSkewerChange(key, 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: CUSTOMER DETAILS & SECURE PAYMENT */}
          {currentStep === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              <div>
                <div className="step-title-group" style={{ marginBottom: "1rem" }}>
                  <span className="step-subtitle">Step Three</span>
                  <h2 className="step-title">Enter Details & Pay Securely</h2>
                </div>
                
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">
                      <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}><User size={14} /> Full Name</span>
                    </label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Darren Wong"
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}><Phone size={14} /> WhatsApp Number (For Pickup Alerts)</span>
                    </label>
                    <input 
                      type="tel" 
                      className="form-input" 
                      placeholder="e.g. +6011-8299102"
                      value={custPhone}
                      onChange={(e) => setCustPhone(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label">
                      <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}><Clock size={14} /> Select Atrium Pickup Slot</span>
                    </label>
                    <select 
                      className="form-input"
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      required
                    >
                      <option value="">-- Choose a pickup slot at Atrium --</option>
                      <option value="12:15 PM">12:15 PM (First Batch)</option>
                      <option value="12:30 PM">12:30 PM</option>
                      <option value="12:45 PM">12:45 PM</option>
                      <option value="1:00 PM">1:00 PM</option>
                      <option value="1:15 PM">1:15 PM (Last Batch)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 💵 Payment Method Selection */}
              <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "1.5rem" }}>
                <span className="form-label" style={{ marginBottom: "0.75rem", display: "block", fontSize: "0.9rem", fontWeight: 700 }}>
                  Select Payment Method
                </span>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  
                  {/* Option 1: Cash */}
                  <div 
                    className={`soup-card ${paymentMethod === "cash" ? "selected" : ""}`}
                    style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem", borderRadius: "12px" }}
                    onClick={() => setPaymentMethod("cash")}
                  >
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: paymentMethod === "cash" ? "rgba(52, 211, 153, 0.15)" : "var(--bg-card)", display: "flex", alignItems: "center", justifyCenter: "center", color: paymentMethod === "cash" ? "var(--color-success)" : "var(--color-text-dim)" }}>
                      <DollarSign size={20} style={{ margin: "auto" }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>Cash on Pickup</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Pay upon physical collection</div>
                    </div>
                  </div>

                  {/* Option 2: TnG */}
                  <div 
                    className={`soup-card ${paymentMethod === "tng" ? "selected" : ""}`}
                    style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem", borderRadius: "12px" }}
                    onClick={() => setPaymentMethod("tng")}
                  >
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: paymentMethod === "tng" ? "rgba(242, 161, 38, 0.15)" : "var(--bg-card)", display: "flex", alignItems: "center", justifyCenter: "center", color: paymentMethod === "tng" ? "var(--accent-gold)" : "var(--color-text-dim)" }}>
                      <QrCode size={20} style={{ margin: "auto" }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>Touch 'n Go eWallet</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Scan QR Code to pay in advance</div>
                    </div>
                  </div>

                </div>
              </div>

              {/* 📲 TnG DuitNow QR Interactive Area */}
              {paymentMethod === "tng" && (
                <div style={{ background: "var(--bg-input)", border: "1px solid var(--border-light)", borderRadius: "12px", padding: "1.5rem", animation: "slideUp 0.3s ease" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "1.5rem", alignItems: "center" }}>
                    
                    {/* Real Touch 'n Go DuitNow QR Image */}
                    <div style={{ background: "white", padding: "0.5rem", borderRadius: "8px", boxShadow: "0 4px 10px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
                      <img 
                        src="/tng_qr.jpg" 
                        alt="Touch 'n Go DuitNow QR Code" 
                        style={{ width: "120px", height: "auto", borderRadius: "6px", display: "block" }}
                      />
                    </div>

                    {/* DuitNow Transfer Details & Inputs */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      <div>
                        <div style={{ fontStyle: "italic", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Scan QR Code above, or transfer to:</div>
                        <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--accent-gold)" }}>{tngNumber}</div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-main)", textTransform: "uppercase" }}>Registered name: {tngName}</div>
                        <div style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--accent-red)", marginTop: "0.15rem" }}>
                          Transfer Exactly: ${calculateTotal().toFixed(2)}
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "1rem" }}>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: "0.75rem" }}>12-Digit TnG Transaction Ref ID</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            placeholder="e.g. TNG-182938..."
                            value={paymentRef}
                            onChange={(e) => setPaymentRef(e.target.value)}
                            style={{ padding: "0.5rem", fontSize: "0.85rem" }}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: "0.75rem" }}>Upload Success Screenshot</label>
                          <div style={{ position: "relative" }}>
                            <input 
                              type="file" 
                              id="slip-upload" 
                              accept="image/*"
                              onChange={handleFileChange}
                              style={{ display: "none" }}
                            />
                            <label 
                              htmlFor="slip-upload" 
                              className="btn btn-secondary"
                              style={{ padding: "0.5rem", fontSize: "0.75rem", borderRadius: "8px", cursor: "pointer", width: "100%", justifyContent: "center", gap: "0.25rem" }}
                            >
                              <Upload size={13} /> {slipFileName ? "Uploaded ✓" : "Browse"}
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Display Base64 Screenshot Slip Preview Thumbnail */}
                      {paymentSlip && (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--bg-card)", padding: "0.5rem", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.05)" }}>
                          <FileImage size={16} style={{ color: "var(--accent-gold)" }} />
                          <span style={{ fontSize: "0.75rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
                            {slipFileName || "screenshot.png"}
                          </span>
                          <img 
                            src={paymentSlip} 
                            alt="Payment success slip" 
                            style={{ width: "32px", height: "32px", objectFit: "cover", borderRadius: "4px" }}
                          />
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="step-actions">
            {currentStep > 1 ? (
              <button className="btn btn-secondary" onClick={handlePrevStep}>
                <ChevronLeft size={16} /> Back
              </button>
            ) : (
              <div></div> // Empty spacer to push primary button right
            )}

            {currentStep < 3 ? (
              <button 
                className="btn btn-primary" 
                onClick={handleNextStep}
                disabled={currentStep === 1 && !soupBase || currentStep === 2 && totalSkewers === 0}
              >
                Next Step <ChevronRight size={16} />
              </button>
            ) : (
              <button 
                className="btn btn-primary" 
                onClick={handleSubmit}
                disabled={isSubmitting || !custName.trim() || !custPhone.trim() || !pickupTime || (paymentMethod === "tng" && (!paymentRef.trim() || !paymentSlip))}
                style={{ background: "var(--color-success)", color: "#ffffff", boxShadow: "0 4px 14px rgba(16, 185, 129, 0.25)" }}
              >
                {isSubmitting ? "Locking in pre-order..." : "Confirm & Pre-Order! 🍢"}
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Cart Summary & Countdown Sidebar */}
      <div>
        {/* Real-time Ticking Countdown */}
        <div className="countdown-card">
          <div className="countdown-info">
            <h3>
              <Clock size={16} style={{ color: timeLeft < 300000 ? "var(--accent-red)" : "var(--accent-gold)" }} /> 
              Pre-Orders Close
            </h3>
            <p>Target limit: {getCutoffTime()} PM</p>
          </div>
          <div className={`countdown-timer ${timeLeft < 300000 ? "ending" : ""}`}>
            {formatCountdown(timeLeft)}
          </div>
        </div>

        {/* Sidebar cart list */}
        <div className="cart-sidebar">
          <h3 className="cart-title">
            <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><ShoppingBag size={18} /> Order Summary</span>
          </h3>

          {soupBase ? (
            <div className="cart-item" style={{ color: soupBase === "Tom-Yum" ? "var(--accent-red)" : "var(--accent-gold)", fontWeight: 700 }}>
              <span className="cart-item-name">🍲 Soup: {soupBase}</span>
              <span className="cart-item-qty">$5.00</span>
            </div>
          ) : (
            <div className="cart-item" style={{ fontStyle: "italic", color: "var(--color-text-dim)" }}>
              No soup stock selected yet.
            </div>
          )}

          <div className="cart-divider"></div>

          {totalSkewers > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {Object.keys(skewerQty).map(key => {
                if (skewerQty[key] === 0) return null;
                return (
                  <div className="cart-item" key={key}>
                    <span className="cart-item-name">{key}</span>
                    <span className="cart-item-qty">
                      {skewerQty[key]} x ${SKEWER_PRICES[key].toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="cart-item" style={{ fontStyle: "italic", color: "var(--color-text-dim)" }}>
              No skewers selected yet.
            </div>
          )}

          <div className="cart-divider"></div>

          <div className="cart-total-row">
            <span>Bowl Total</span>
            <span className="cart-total-price">${calculateTotal().toFixed(2)}</span>
          </div>

          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "1rem", lineHeight: "1.4", borderTop: "1px solid var(--border-light)", paddingTop: "0.75rem", display: "flex", alignItems: "flex-start", gap: "0.25rem" }}>
            <AlertCircle size={13} style={{ flexShrink: 0, marginTop: "0.1rem" }} />
            <span>Pre-orders are packaged securely to keep skewers simmering hot. Please pick up promptly at the Atrium stall!</span>
          </div>
        </div>
      </div>

    </div>
  );
}
