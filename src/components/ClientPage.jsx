import React, { useState, useEffect, useRef } from "react";
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
  MapPin,
  X,
  Maximize,
  Download
} from "lucide-react";
import Tesseract from "tesseract.js";
import { 
  getCurrentTime, 
  getOrderingStatus, 
  getRemainingTime, 
  formatCountdown, 
  getCutoffTime,
  format12Hour
} from "../utils/time";
import { addOrder, subscribeOrders } from "../utils/db";

// Custom Menu Pricing (All skewers set to RM 3.00)
const SKEWER_PRICES = {
  "Lobster-flavoured balls": 3.00,
  "Stuffed squid rolls": 3.00,
  "Golden seafood rolls": 3.00,
  "Scallop-style seafood tofu": 3.00,
  "Fishball": 3.00
};

const SKEWER_DESCRIPTIONS = {
  "Lobster-flavoured balls": "Bouncy and juicy balls packed with a rich, savory lobster flavor.",
  "Stuffed squid rolls": "Tender squid rolls generously stuffed with a savory seafood filling.",
  "Golden seafood rolls": "Crispy, golden-fried rolls bursting with a delicious seafood blend.",
  "Scallop-style seafood tofu": "Silky, smooth tofu infused with the sweet and delicate essence of scallops.",
  "Fishball": "Classic seasoned bouncy fishballs, perfectly steamed to capture natural juices."
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

// Programmatic WAV file generator to generate a super loud, harsh 1000Hz sweeping siren blob URL
// This allows bypass of iOS/iPhone "Silent Mode" physical switches by running as a 16-bit Media playback stream!
function generateLoudBuzzerWav() {
  try {
    const sampleRate = 11025; // Standard high-quality frequency
    const duration = 1.5;     // 1.5 seconds siren sweep
    const numSamples = sampleRate * duration;
    // Header size = 44 bytes. 16-bit = 2 bytes per sample.
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);
    
    // Auxiliary string writer helper
    const writeStr = (v, offset, str) => {
      for (let i = 0; i < str.length; i++) {
        v.setUint8(offset + i, str.charCodeAt(i));
      }
    };
    
    writeStr(view, 0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeStr(view, 8, 'WAVE');
    writeStr(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM Format (1 = uncompressed)
    view.setUint16(22, 1, true); // Mono (1 channel)
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // Byte rate (sampleRate * channels * bytes per sample)
    view.setUint16(32, 2, true); // Block align (channels * bytes per sample)
    view.setUint16(34, 16, true); // 16-bit samples
    writeStr(view, 36, 'data');
    view.setUint32(40, numSamples * 2, true);
    
    const baseFreq = 950;
    // Generate a grating, extremely loud sweeping square-wave siren (sweeps 700Hz to 1200Hz)
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const sweepFreq = baseFreq + Math.sin(t * 12) * 250; 
      // 16-bit square wave oscillates between max positive and max negative signed 16-bit integers
      const val = Math.sin(2 * Math.PI * sweepFreq * t) > 0 ? 28000 : -28000;
      view.setInt16(44 + i * 2, val, true); // 16-bit signed integer (little-endian)
    }
    
    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error("Failed to generate offline WAV buzzer:", e);
    return "";
  }
}

let buzzerAudioUrl = null;
let iosBuzzerAudio = null;

function initBuzzerAudio() {
  try {
    if (iosBuzzerAudio && buzzerAudioUrl) return;
    buzzerAudioUrl = generateLoudBuzzerWav();
    if (buzzerAudioUrl) {
      iosBuzzerAudio = new Audio(buzzerAudioUrl);
      iosBuzzerAudio.loop = true; // Loop the loud siren continuously until clicked dismiss
      iosBuzzerAudio.volume = 1.0; // Max hardware volume
    }
  } catch (e) {
    console.error("Failed to initialize media player:", e);
  }
}

// Web Audio sharp, loud alarm siren for customer alert (optimized for noisy environments like APU Atrium)
function playCustomerChime() {
  try {
    // 1. Play the loud HTML5 audio buzzer (bypasses iPhone Silent Switch completely!)
    initBuzzerAudio();
    if (iosBuzzerAudio) {
      iosBuzzerAudio.currentTime = 0;
      const playPromise = iosBuzzerAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          console.warn("HTML5 audio playback blocked, retrying...", e);
        });
      }
    }

    // 2. Trigger powerful tactile vibration pulses to physically shake the customer's phone!
    if (navigator.vibrate) {
      // Extensive heavy high-intensity pattern: 800ms vibration, 150ms pause, repeated. (Total ~8.5 seconds)
      navigator.vibrate([800, 150, 800, 150, 800, 150, 800, 150, 800, 150, 800, 150, 800, 150, 800]);
    }

    // 3. Play high-intensity Web Audio backstops for dense layered volume
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      const ctx = iosAudioCtx || new AudioContext();
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const now = ctx.currentTime;
      
      const playBuzzerPulse = (startTime, freq) => {
        const oscSaw = ctx.createOscillator();
        const oscSq = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        // Pro Dynamics Compressor prevents iOS Webkit from compressing/silencing high amplitude peaks
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-24, startTime);
        compressor.knee.setValueAtTime(30, startTime);
        compressor.ratio.setValueAtTime(12, startTime);
        compressor.attack.setValueAtTime(0.003, startTime);
        compressor.release.setValueAtTime(0.25, startTime);
        
        oscSaw.type = "sawtooth"; // Rich bright high-frequency cutting harmonics
        oscSaw.frequency.setValueAtTime(freq, startTime);
        oscSaw.frequency.exponentialRampToValueAtTime(freq * 1.38, startTime + 0.35); // Sweeping siren chirp
        
        oscSq.type = "square"; // Penetrative, solid buzzer texture
        oscSq.frequency.setValueAtTime(freq * 1.015, startTime); // Slightly detuned by 1.5% for an acoustic beating effect
        oscSq.frequency.exponentialRampToValueAtTime(freq * 1.38 * 1.015, startTime + 0.35);
        
        // Piercing gain level (0.75 combined with compressor avoids triggering iOS protective limiter squashing)
        gainNode.gain.setValueAtTime(0.001, startTime);
        gainNode.gain.linearRampToValueAtTime(0.75, startTime + 0.05); 
        gainNode.gain.linearRampToValueAtTime(0.75, startTime + 0.28);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
        
        oscSaw.connect(compressor);
        oscSq.connect(compressor);
        compressor.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscSaw.start(startTime);
        oscSq.start(startTime);
        
        oscSaw.stop(startTime + 0.35);
        oscSq.stop(startTime + 0.35);
      };

      // Play a rhythmic sequence of 8 fast, double-chirping sweep sirens
      // Standing out clearly above standard food-court conversations (950Hz to 1350Hz)
      const sweeps = [950, 1150, 950, 1350, 950, 1150, 950, 1350];
      sweeps.forEach((freq, index) => {
        playBuzzerPulse(now + (index * 0.45), freq);
      });
    }

  } catch (e) {
    console.error("Audio alarm error:", e);
  }
}

// Text-to-speech voice announcer (optimized for noisy background environments)
function announceOrderReady(orderId, customerName) {
  try {
    if (!window.speechSynthesis) return;
    
    // Cancel any active speech to avoid overlaps
    window.speechSynthesis.cancel();
    
    // Aligned ticketing shortcode (First 8 characters of UUID)
    const shortId = orderId.slice(0, 8).toUpperCase().split("").join(" "); // Space out characters for clear phonetic read (e.g. A B C D)
    const alertMsg = `Attention ${customerName}! Your hot oden bowl is ready for pickup! Ticket number: ${shortId}. I repeat, ticket number: ${shortId} is cooked and packaged at the APU Atrium counter. Please collect your steaming oden bowl now.`;
    
    const utterance = new SpeechSynthesisUtterance(alertMsg);
    utterance.rate = 0.82;   // Slower rate so background noise doesn't wash out details
    utterance.pitch = 1.2;   // Higher pitch stands out better against crowd chatter
    utterance.volume = 1.0;  // Maximum hardware volume
    
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.error("TTS speech error:", e);
  }
}

// iPhone/iOS Webkit Audio Context unlock & keepalive helper
let iosAudioCtx = null;
let keepAliveInterval = null;

function startAudioKeepAlive(ctx) {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }
  
  // Rhythmic silent audio pulses to keep the device's hardware audio driver awake and running
  keepAliveInterval = setInterval(() => {
    try {
      if (!ctx || ctx.state === "closed") return;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      
      // Play sub-audible low frequency sound to maintain active state in background/idle locks
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1, ctx.currentTime); // 1Hz sub-audible
      gain.gain.setValueAtTime(0.00001, ctx.currentTime); // extremely quiet
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.warn("Audio keep-alive warning:", e);
    }
  }, 4000); // Trigger every 4 seconds
}

function unlockAudio() {
  try {
    // 1. Initialize and preload the programmatic HTML5 Audio Buzzer blob URL
    initBuzzerAudio();
    if (iosBuzzerAudio) {
      // Play and pause instantly inside the click handler to unlock the media audio session
      iosBuzzerAudio.play().then(() => {
        iosBuzzerAudio.pause();
        iosBuzzerAudio.currentTime = 0;
      }).catch(err => {
        console.warn("Media buzzer unlock play failed:", err);
      });
    }

    // 2. Instantiate and resume Web AudioContext via user interaction
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      let ctx = iosAudioCtx;
      if (!ctx || ctx.state === "closed") {
        ctx = new AudioContext();
      }
      
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      
      // Play a quick micro-silent oscillator
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
      
      iosAudioCtx = ctx;
      
      // Start the silent keepalive routine to lock the Audio Context into active mode
      startAudioKeepAlive(ctx);
    }
    
    // 3. Instantiate and speak a micro-silent utterance to unlock Speech Synthesis
    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(" ");
      utterance.volume = 0;
      window.speechSynthesis.speak(utterance);
    }
    
    console.log("🔊 iPhone Webkit Audio Context, Looping Media Buzzer & Keep-Alive unlocked successfully!");
  } catch (e) {
    console.error("Failed to unlock iOS Webkit audio:", e);
  }
}

export default function ClientPage() {
  const prevStatusRef = useRef(null);
  const prevPingCountRef = useRef(0);
  const [currentStep, setCurrentStep] = useState(1);
  const [status, setStatus] = useState({ isOpen: true, reason: "" });
  const [timeLeft, setTimeLeft] = useState(0);
  const [activeReceiptId, setActiveReceiptId] = useState(() => {
    try {
      return localStorage.getItem("oden_active_receipt_id") || null;
    } catch (e) {
      return null;
    }
  });

  const [activeOrder, setActiveOrder] = useState(() => {
    try {
      const saved = localStorage.getItem("valhalla_active_order");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);

  // Repeating Alarm System for Heavy APU Crowds
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  const alarmIntervalRef = useRef(null);

  const startHeavyAlarm = (orderId, customerName) => {
    // Stop any existing timers to prevent overlapping loops
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
    }
    
    setIsAlarmActive(true);
    
    // Play immediately on trigger (piercing siren sweeps + vibration + background native tray popup)
    playCustomerChime();
    triggerBackgroundNotification(orderId);
    
    let cycleCount = 1;
    // Repeat the penetrative buzzer siren and OS tray alert every 5.5 seconds (siren takes 4.2s)
    alarmIntervalRef.current = setInterval(() => {
      if (cycleCount >= 6) { // Run for up to 6 cycles (~33 seconds)
        stopHeavyAlarm();
        return;
      }
      playCustomerChime();
      triggerBackgroundNotification(orderId);
      cycleCount++;
    }, 5500);
  };

  const stopHeavyAlarm = () => {
    setIsAlarmActive(false);
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    // Pause and reset the physical media buzzer audio!
    if (iosBuzzerAudio) {
      try {
        iosBuzzerAudio.pause();
        iosBuzzerAudio.currentTime = 0;
      } catch (e) {
        console.warn("Buzzer stop failed:", e);
      }
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  // Triggers native OS tray notifications (highly optimized for Android background Chrome execution)
  const triggerBackgroundNotification = (orderId) => {
    try {
      const shortId = orderId.slice(0, 8).toUpperCase();
      const notifTitle = "🍢 ODEN READY FOR PICKUP!";
      const notifOptions = {
        body: `Ticket #${shortId} is steaming hot and ready! Collect your bowl at the APU Atrium counter.`,
        icon: "/logo.jpg",
        badge: "/logo.jpg",
        vibrate: [800, 150, 800, 150, 800, 150, 800], // Heavy physical phone vibration array
        tag: "oden-ready-" + orderId, // Avoid spamming duplicate alerts
        renotify: true, // Force vibration and sound trigger even if a notification with this tag is already showing
        silent: false, // Ensure OS alert sound and vibration are not suppressed
        requireInteraction: true // Keeps alert on screen until tapped/dismissed
      };

      // Best Practice: Trigger background notification using service worker registration (prevents Android sleep throttling)
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(notifTitle, notifOptions);
        });
      } else if ("Notification" in window && Notification.permission === "granted") {
        new Notification(notifTitle, notifOptions);
      }
    } catch (e) {
      console.warn("Background OS tray alert failed:", e);
    }
  };

  const handleOverlayClick = (e) => {
    // Tapping anywhere on the flashing overlay instantly triggers/unmutes the sound (bypasses browser background block)
    if (e.target.className !== "alarm-dismiss-btn") {
      playCustomerChime();
    }
  };

  // Register Background Service Worker & clean up loops on unmount
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js")
        .then(reg => console.log("🍢 background sw.js loaded successfully!"))
        .catch(err => console.error("sw.js load failed:", err));
    }

    return () => {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);



  // iOS/Android silent audio engine & notification unlock listener
  useEffect(() => {
    const handleGesture = () => {
      unlockAudio();
      setIsAudioEnabled(true);
      
      // Request HTML5 native push/tray Notification permissions for background Android alerts!
      if ("Notification" in window) {
        Notification.requestPermission();
      }
      
      // Clean up event listeners immediately once unlocked
      document.removeEventListener("click", handleGesture);
      document.removeEventListener("touchstart", handleGesture);
    };

    document.addEventListener("click", handleGesture);
    document.addEventListener("touchstart", handleGesture);

    return () => {
      document.removeEventListener("click", handleGesture);
      document.removeEventListener("touchstart", handleGesture);
    };
  }, []);

  const handleEnableAudio = () => {
    unlockAudio();
    setIsAudioEnabled(true);
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  };
  
  // Pre-order Stepper Form State with Memory Persistence
  const [soupBase, setSoupBase] = useState(() => {
    try {
      const saved = localStorage.getItem("valhalla_cached_soup");
      return saved || "";
    } catch (e) {
      return "";
    }
  });

  const [skewerQty, setSkewerQty] = useState(() => {
    try {
      const saved = localStorage.getItem("valhalla_cached_skewers");
      return saved ? JSON.parse(saved) : {
        "Lobster-flavoured balls": 0,
        "Stuffed squid rolls": 0,
        "Golden seafood rolls": 0,
        "Scallop-style seafood tofu": 0,
        "Fishball": 0
      };
    } catch (e) {
      return {
        "Lobster-flavoured balls": 0,
        "Stuffed squid rolls": 0,
        "Golden seafood rolls": 0,
        "Scallop-style seafood tofu": 0,
        "Fishball": 0
      };
    }
  });
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🎲 "I'm Feeling Lucky" Game States
  const [isLuckyModalOpen, setIsLuckyModalOpen] = useState(false);
  const [luckyTarget, setLuckyTarget] = useState(null);
  const [luckyRolled, setLuckyRolled] = useState(null);
  const [luckyWon, setLuckyWon] = useState(false);
  const [hasPlayedLucky, setHasPlayedLucky] = useState(false);
  const [isRolling, setIsRolling] = useState(false);

  // 🔍 QR Scanning & Modal States
  const [isScanningQR, setIsScanningQR] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  const openLuckyGame = () => {
    if (hasPlayedLucky) return;
    const target = Math.floor(Math.random() * 11) + 2; // 2 to 12
    setLuckyTarget(target);
    setLuckyRolled(null);
    setIsLuckyModalOpen(true);
  };

  const rollLuckyDice = () => {
    setIsRolling(true);
    setTimeout(() => {
      const probStr = localStorage.getItem("oden_lucky_prob");
      const winProbability = probStr !== null ? parseFloat(probStr) : 0.001;
      const isWin = Math.random() < winProbability;
      let rolledSum;
      if (isWin) {
        rolledSum = luckyTarget;
      } else {
        do {
          rolledSum = Math.floor(Math.random() * 11) + 2;
        } while (rolledSum === luckyTarget);
      }
      
      setLuckyRolled(rolledSum);
      setLuckyWon(isWin);
      setHasPlayedLucky(true);
      setIsRolling(false);
      
      // If won, switch to Cash automatically
      if (isWin) {
        setPaymentMethod("cash");
      }
    }, 1500); // 1.5 seconds rolling animation
  };

  // 🎲 Mystery Oden States & Randomizer Logic
  const [mysteryBudget, setMysteryBudget] = useState(14); // Default: RM 14 (3 skewers)
  const [mysteryResult, setMysteryResult] = useState(null); // Premium UI result modal trigger state

  const handleGenerateMysteryOden = () => {
    // 1. Pick a random soup base
    const soups = Object.keys(SOUP_DETAILS);
    const randomSoup = soups[Math.floor(Math.random() * soups.length)];
    
    // 2. Calculate the number of skewers based on budget (soup base is RM 5, each skewer is RM 3)
    const skewerCount = Math.floor((mysteryBudget - 5) / 3);
    
    // 3. Reset all skewer quantities
    const freshSkewers = {
      "Lobster-flavoured balls": 0,
      "Stuffed squid rolls": 0,
      "Golden seafood rolls": 0,
      "Scallop-style seafood tofu": 0,
      "Fishball": 0
    };
    
    // 4. Randomly distribute the skewers
    const skewerNames = Object.keys(freshSkewers);
    for (let i = 0; i < skewerCount; i++) {
      const randomSkewer = skewerNames[Math.floor(Math.random() * skewerNames.length)];
      freshSkewers[randomSkewer] += 1;
    }
    
    // 5. Update states
    setSoupBase(randomSoup);
    setSkewerQty(freshSkewers);
    
    // Show visual confirmation custom React Modal overlay instead of native boring alert dialog
    setMysteryResult({
      soup: randomSoup,
      soupName: SOUP_DETAILS[randomSoup].name,
      price: mysteryBudget,
      items: freshSkewers
    });
  };

  // 💳 New Payment States
  const [paymentMethod, setPaymentMethod] = useState("cash"); // 'cash' or 'tng'
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentSlip, setPaymentSlip] = useState(null); // base64 string
  const [slipFileName, setSlipFileName] = useState("");
  const [receiptFlags, setReceiptFlags] = useState({ amountMatch: false, nameMatch: false, isFresh: true });

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

    // Load merchant DuitNow details
    setTngNumber(localStorage.getItem("oden_tng_number") || "+601164188797");
    setTngName(localStorage.getItem("oden_tng_name") || "SATTAROV AZAMBEK XXX");

    const handleStorage = () => {
      setStatus(getOrderingStatus());
      setTimeLeft(getRemainingTime());
      const rid = localStorage.getItem("oden_active_receipt_id");
      if (rid !== activeReceiptId) {
        setActiveReceiptId(rid);
        try {
          const savedOrder = localStorage.getItem("valhalla_active_order");
          setActiveOrder(savedOrder ? JSON.parse(savedOrder) : null);
        } catch (e) {
          setActiveOrder(null);
        }
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

  // Auto-persist cart selections to localStorage
  useEffect(() => {
    localStorage.setItem("valhalla_cached_soup", soupBase);
  }, [soupBase]);

  useEffect(() => {
    localStorage.setItem("valhalla_cached_skewers", JSON.stringify(skewerQty));
  }, [skewerQty]);

  // Subscribe to updates for the active order to show real-time status changes
  useEffect(() => {
    if (!activeReceiptId) {
      setActiveOrder(null);
      prevStatusRef.current = null;
      prevPingCountRef.current = 0;
      return;
    }

    const unsubscribe = subscribeOrders((orders) => {
      const ordersArray = Array.isArray(orders) ? orders : [];
      const match = ordersArray.find(o => o && o.id === activeReceiptId);
      if (match) {
        const isStatusTransition = prevStatusRef.current !== null && prevStatusRef.current !== "ready" && match.status === "ready";
        const isPingTriggered = prevPingCountRef.current !== undefined && match.ping_count > prevPingCountRef.current && match.status === "ready";

        if (isStatusTransition || isPingTriggered) {
          startHeavyAlarm(match.id, match.customer_name);
        }

        // Proactively stop the alarm if the order is marked complete / handed over by the worker
        if (match.status !== "ready") {
          stopHeavyAlarm();
        }

        prevStatusRef.current = match.status;
        prevPingCountRef.current = match.ping_count || 0;
        localStorage.setItem("valhalla_active_order", JSON.stringify(match));
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

    // 1. Freshness Check
    const fifteenMins = 15 * 60 * 1000;
    const now = Date.now();
    let isFresh = true;
    if (file.lastModified && (now - file.lastModified > fifteenMins)) {
      alert("⚠️ This screenshot appears to be older than 15 minutes. Your order will be flagged for manual review.");
      isFresh = false;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Image = event.target.result;
      setPaymentSlip(base64Image); // Base64 string

      // Start OCR Processing
      setIsScanningQR(true);
      try {
        const { data: { text } } = await Tesseract.recognize(base64Image, 'eng');
        console.log("OCR Raw Text:\n", text); // Debugging

        // ----- HEURISTIC VERIFICATION -----
        const expectedTotalStr = calculateTotal().toFixed(2);
        const amountMatch = text.includes(expectedTotalStr);
        
        // Ensure name matching ignores case
        const nameMatch = text.toUpperCase().includes("AZAMBEK") || text.toUpperCase().includes("SATTAROV");

        setReceiptFlags({
          amountMatch,
          nameMatch,
          isFresh
        });

        console.log(`Receipt Verification => Amount Match: ${amountMatch}, Name Match: ${nameMatch}, Fresh: ${isFresh}`);

        let extractedId = null;
        const lines = text.split('\n');
        const keywords = ['ref', 'reference', 'transaction', 'trx', 'txn', 'id'];

        // Strategy 1: Look for keywords in each line
        for (const line of lines) {
          const lowerLine = line.toLowerCase();
          if (keywords.some(k => lowerLine.includes(k))) {
            // Split by spaces, colons, hyphens
            const tokens = line.split(/[:\s-]+/);
            // Look for a token that is at least 6 characters long and contains numbers
            const possibleId = tokens.find(t => t.length >= 6 && /\d/.test(t) && !t.toLowerCase().includes('date') && !t.toLowerCase().includes('time'));
            if (possibleId) {
              extractedId = possibleId;
              break;
            }
          }
        }

        // Strategy 2: Look for generic TNG formats
        if (!extractedId) {
          const cleanText = text.replace(/\s+/g, '');
          const tngMatch = cleanText.match(/TNG-?[A-Z0-9]{5,}/i);
          if (tngMatch) extractedId = tngMatch[0];
        }

        // Strategy 3: Look for any sequence of 8 to 20 digits (e.g., standard bank transfer IDs)
        if (!extractedId) {
          const cleanText = text.replace(/\s+/g, '');
          const numMatch = cleanText.match(/\d{8,20}/);
          if (numMatch) extractedId = numMatch[0];
        }
        
        if (extractedId) {
          const finalRef = extractedId.toUpperCase().replace(/[^A-Z0-9-]/g, '');
          setPaymentRef(finalRef);
          alert("Success! Transaction ID auto-extracted from receipt: " + finalRef);
        } else {
          console.warn("OCR could not find a matching reference number.");
          alert("Could not automatically read the Transaction ID. Please enter it manually.");
        }
      } catch (err) {
        console.error("OCR Failed:", err);
      } finally {
        setIsScanningQR(false);
      }
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
    if (luckyWon) return 0;
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
      payment_slip: paymentMethod === "tng" ? paymentSlip : null,
      receipt_flags: paymentMethod === "tng" ? receiptFlags : null
    };

    try {
      const submittedOrder = await addOrder(orderData);
      localStorage.setItem("oden_active_receipt_id", submittedOrder.id);
      localStorage.setItem("valhalla_active_order", JSON.stringify(submittedOrder));
      setActiveReceiptId(submittedOrder.id);
      setActiveOrder(submittedOrder);
      localStorage.removeItem("valhalla_cached_soup");
      localStorage.removeItem("valhalla_cached_skewers");
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
      localStorage.removeItem("valhalla_active_order");
      setActiveReceiptId(null);
      setActiveOrder(null);
      setSoupBase("");
      setSkewerQty({
        "Lobster-flavoured balls": 0,
        "Stuffed squid rolls": 0,
        "Golden seafood rolls": 0,
        "Scallop-style seafood tofu": 0,
        "Fishball": 0
      });
      setCustName("");
      setCustPhone("");
      setPickupTime("");
      setPaymentMethod("cash");
      setPaymentRef("");
      setPaymentSlip(null);
      setSlipFileName("");
      setReceiptFlags({ amountMatch: false, nameMatch: false, isFresh: true });
      setHasPlayedLucky(false);
      setLuckyWon(false);
      localStorage.removeItem("valhalla_cached_soup");
      localStorage.removeItem("valhalla_cached_skewers");
      setCurrentStep(1);
    }
  };

  // 1. Receipt Screen (If user already has an active order)
  if (activeReceiptId && activeOrder) {
    return (
      <div className="receipt-wrapper" style={{ animation: "slideUp 0.4s ease" }}>
        
        {/* Fullscreen Flashing Emergency Warning Overlay */}
        {isAlarmActive && (
          <div className="alarm-warning-overlay" onClick={handleOverlayClick}>
            <div className="alarm-warning-box">
              <div className="alarm-warning-icon">🔔🔥</div>
              <h2 className="alarm-warning-title">YOUR ODEN IS READY!</h2>
              <p className="alarm-warning-text">
                Ticket <span className="alarm-warning-ticket">#{activeOrder.id.slice(0, 8).toUpperCase()}</span> is fresh, piping hot, and packaged for pickup at the APU Atrium Counter!
              </p>
              <div className="alarm-warning-subtext" style={{ color: "var(--accent-gold)", fontWeight: 700 }}>
                🔊 A loud alert siren is playing! <br />
                <span style={{ fontSize: "0.75rem", opacity: 0.9 }}>(If silent, tap anywhere on screen to unmute and play)</span>
              </div>
              <button 
                onClick={stopHeavyAlarm}
                className="alarm-dismiss-btn"
              >
                🔕 Mute & Dismiss Alarm
              </button>
            </div>
          </div>
        )}

        <div className="receipt-card">
          <div className="receipt-header">
            <img 
              src="/logo.jpg" 
              alt="Valhalla Oh-Den! Logo" 
              style={{ width: "50px", height: "50px", borderRadius: "50%", objectFit: "cover", border: "1.5px solid rgba(0,0,0,0.1)", margin: "0 auto 0.5rem auto", display: "block" }}
            />
            <div className="receipt-shop-name">VALHALLA OH-DEN!</div>
            <div style={{ fontSize: "0.75rem", color: "#666666", marginTop: "0.15rem", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem" }}>
              <MapPin size={11} style={{ color: "var(--accent-red)" }} /> APU Atrium (Ground Floor)
            </div>
            
            <div className="receipt-number" style={{ fontSize: "1.25rem", fontWeight: 900, wordBreak: "break-all", fontFamily: "monospace", display: "block", width: "100%", textAlign: "center", background: "#f0edea", padding: "0.4rem 0.75rem", borderRadius: "8px" }}>
              #{activeOrder.id.slice(0, 8).toUpperCase()}
            </div>
            <div style={{ fontSize: "0.6rem", color: "#888888", fontFamily: "monospace", marginTop: "0.25rem", wordBreak: "break-all" }}>
              Precise ID: {activeOrder.id}
            </div>
            
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

            {/* iOS/iPhone Audio Notification unlocking status alert */}
            <div style={{ marginTop: "0.75rem" }}>
              {!isAudioEnabled ? (
                <button 
                  onClick={handleEnableAudio}
                  className="btn btn-secondary animate-pulse"
                  style={{ width: "100%", margin: "0 auto", background: "rgba(242, 161, 38, 0.08)", border: "1px dashed var(--accent-gold)", color: "var(--accent-gold)", fontSize: "0.7rem", height: "34px", padding: "0 0.5rem", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", fontWeight: "bold", cursor: "pointer" }}
                  title="Enable browser audio and speech voice for remote kitchen pings"
                >
                  🔊 Enable Live Sound Alerts
                </button>
              ) : (
                <div style={{ width: "100%", margin: "0 auto", background: "rgba(52, 211, 153, 0.08)", border: "1px solid var(--color-success)", color: "var(--color-success)", fontSize: "0.7rem", height: "34px", padding: "0 0.5rem", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem", fontWeight: "bold" }}>
                  ✓ Audio Alerts Enabled 🔊
                </div>
              )}
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
              <span 
                className="receipt-meta-val" 
                style={{ 
                  textTransform: "uppercase", 
                  fontWeight: 800,
                  color: activeOrder.payment_method === "cash" && activeOrder.status === "pending" ? "var(--accent-red)" : "var(--color-success)"
                }}
              >
                {activeOrder.payment_method === "tng" 
                  ? "TnG eWallet (Verified)" 
                  : (activeOrder.status === "pending" ? "Cash (Awaiting Payment)" : "Cash (Paid & Verified) ✓")}
              </span>
            </div>
            {activeOrder.payment_method === "tng" && (
              <div className="receipt-meta-row">
                <span className="receipt-meta-label">Ref ID:</span>
                <span className="receipt-meta-val" style={{ fontFamily: "monospace", fontSize: "0.8rem", wordBreak: "break-all", textAlign: "right", marginLeft: "1rem" }}>{activeOrder.payment_ref}</span>
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

          {activeOrder.status === "completed" ? (
            <div style={{ background: "rgba(52, 211, 153, 0.1)", border: "1px solid var(--color-success)", color: "#047857", borderRadius: "8px", padding: "0.75rem", fontSize: "0.85rem", textAlign: "center", fontWeight: 700, marginBottom: "1rem" }}>
              🍲 Thank you! Your pre-order has been successfully picked up and completed. We hope you enjoyed your hot oden bowl! See you next time! 🍢
            </div>
          ) : activeOrder.status === "ready" ? (
            <div style={{ background: "rgba(52, 211, 153, 0.1)", border: "1px solid var(--color-success)", color: "#047857", borderRadius: "8px", padding: "0.75rem", fontSize: "0.85rem", textAlign: "center", fontWeight: 700, marginBottom: "1rem" }}>
              ⚡ Your Oden is steaming hot and packaged! Head to the Atrium stall, present this receipt number, and pick it up!
            </div>
          ) : activeOrder.status === "preparing" ? (
            <div style={{ background: "rgba(52, 211, 153, 0.08)", border: "1px solid rgba(52, 211, 153, 0.25)", color: "#047857", borderRadius: "8px", padding: "0.75rem", fontSize: "0.85rem", textAlign: "center", fontWeight: 700, marginBottom: "1rem" }}>
              {activeOrder.payment_method === "cash" ? (
                <span>💵 CASH PAYMENT VERIFIED & PAID: Thank you! We have received your payment of RM {parseFloat(activeOrder.total_price).toFixed(2)} at the APU Atrium counter. Your delicious bowl is cooking now! 🍳</span>
              ) : (
                <span>📲 TNG PAYMENT VERIFIED & CONFIRMED: Thank you! Your Touch 'n Go eWallet payment has been verified. Your delicious bowl is cooking now! 🍳</span>
              )}
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
          Our stall operating hours are strictly from <strong>10:00 AM</strong> to <strong>{format12Hour(getCutoffTime())}</strong> daily.
        </p>
        <div className="closed-reopen">
          🔔 Next Pre-Order Window Opens: <strong>Tomorrow at 10:00 AM</strong>
        </div>
      </div>
    );
  }

  // 3. Main Pre-Ordering Stepper Form
  return (
    <div className="preorder-layout" style={{ animation: "slideUp 0.3s ease" }}>
      
      {/* 🎲 GORGEOUS CUSTOM MYSTERY ODEN RESULTS MODAL OVERLAY */}
      {mysteryResult && (
        <div className="mystery-overlay-glass">
          <div className="mystery-result-card">
            {/* Close Button X */}
            <button 
              type="button" 
              className="mystery-close-btn" 
              onClick={() => setMysteryResult(null)}
              title="Close results"
            >
              <X size={16} />
            </button>

            <div style={{ fontSize: "3.25rem", animation: "alarmIconShake 0.4s infinite alternate ease-in-out", display: "inline-block", marginBottom: "0.5rem" }}>🎲✨</div>
            <h2 style={{ color: "var(--accent-gold)", textShadow: "0 0 15px rgba(242, 161, 38, 0.45)", fontSize: "1.45rem", margin: "0.25rem 0 0.5rem 0", fontWeight: 800 }}>
              Odin's Favour Bestowed!
            </h2>
            <p className="alarm-warning-text" style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "1rem", lineHeight: "1.4" }}>
              The ravens have rolled the Viking dice and formulated a delicious random recipe just for you!
            </p>

            {/* Premium Recipe Container details */}
            <div className="mystery-recipe-container">
              <div className="mystery-recipe-header">
                <span>🍲 {mysteryResult.soupName}</span>
                <span>RM 5.00</span>
              </div>
              
              <div className="mystery-recipe-list">
                {Object.keys(mysteryResult.items).map((key) => {
                  const qty = mysteryResult.items[key];
                  if (qty === 0) return null;
                  return (
                    <div key={key} className="mystery-recipe-row">
                      <span>🍢 {key}</span>
                      <span style={{ fontWeight: 800, color: "var(--accent-gold)" }}>
                        {qty}x (RM {(qty * 3).toFixed(2)})
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mystery-recipe-total">
                <span>Bowl Total</span>
                <span style={{ color: "var(--accent-gold)" }}>RM {mysteryResult.price}.00</span>
              </div>
            </div>

            {/* Smart Stepper Action Integration Panel */}
            <div className="mystery-actions-panel">
              <button
                type="button"
                onClick={() => {
                  setMysteryResult(null);
                  setCurrentStep(3); // Smoothly advance to checkout step!
                }}
                className="mystery-action-primary"
              >
                🔥 Checkout Now (RM {mysteryResult.price}.00)
              </button>

              <div className="mystery-btn-row">
                <button
                  type="button"
                  onClick={() => {
                    setMysteryResult(null);
                    setCurrentStep(2); // Stay on Step 2 (skewer builder) so they can tweak selections!
                  }}
                  className="mystery-action-secondary"
                  title="Tweak your ingredients on the skewer customizer page"
                >
                  🍢 Adjust & Tweak
                </button>

                <button
                  type="button"
                  onClick={handleGenerateMysteryOden}
                  className="mystery-action-reroll"
                  title="Roll again for a fresh combination"
                >
                  🎲 Re-Roll Bowl
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

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

              {/* ✨ MYSTERY ODEN VIKING DICE GENERATOR */}
              <div style={{ background: "rgba(242, 161, 38, 0.04)", border: "1px dashed var(--accent-gold)", borderRadius: "12px", padding: "1.25rem", marginBottom: "2rem", textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", color: "var(--accent-gold)", fontWeight: "bold", fontSize: "0.95rem", marginBottom: "0.5rem" }}>
                  <span>🎲 Let the Viking Gods Choose! (Mystery Oden)</span>
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", lineHeight: "1.4", margin: "0.25rem 0 1rem 0" }}>
                  Can't decide? Pick your target budget below and we'll randomly fill your bowl with rich soup and premium skewers!
                </p>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", width: "100%", margin: "0 auto 1.25rem auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", width: "100%", maxWidth: "380px", fontSize: "0.8rem", fontWeight: "bold", padding: "0 0.25rem" }}>
                    <span>Target Budget:</span>
                    <span style={{ color: "var(--accent-gold)" }}>RM {mysteryBudget}.00</span>
                  </div>
                  
                  {/* Grid of budget buttons */}
                  <div className="mystery-budget-grid">
                    {[8, 11, 14, 17, 20].map((price) => {
                      const isSelected = mysteryBudget === price;
                      const skewerCount = Math.floor((price - 5) / 3);
                      return (
                        <button
                          key={price}
                          type="button"
                          onClick={() => setMysteryBudget(price)}
                          className={`mystery-budget-pill ${isSelected ? "selected" : ""}`}
                          title={`Select RM ${price} budget`}
                        >
                          <span>RM {price}</span>
                          <span className="skewer-subtext">
                            {skewerCount} Skewer{skewerCount > 1 ? "s" : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ fontSize: "0.65rem", color: "var(--color-text-dim)", marginTop: "0.25rem" }}>
                    Includes 1 Soup Base + {Math.floor((mysteryBudget - 5) / 3)} Random Skewers
                  </div>
                </div>

                <button 
                  type="button"
                  className="btn btn-primary"
                  onClick={handleGenerateMysteryOden}
                  style={{ width: "100%", maxWidth: "240px", margin: "0 auto", padding: "0.5rem 1rem", fontSize: "0.8rem", height: "38px" }}
                >
                  🎲 Roll Mystery Bowl
                </button>
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

                  <div className="form-group">
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
                      <option value="10:15 AM">10:15 AM (First Batch)</option>
                      <option value="11:30 AM">11:30 AM</option>
                      <option value="12:30 PM">12:30 PM</option>
                      <option value="1:30 PM">1:30 PM</option>
                      <option value="2:30 PM">2:30 PM</option>
                      <option value="3:45 PM">3:45 PM (Last Batch)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 🎲 I'm Feeling Lucky Button */}
              <div style={{ paddingBottom: "1.5rem" }}>
                <button 
                  className="btn btn-secondary"
                  onClick={openLuckyGame}
                  disabled={hasPlayedLucky}
                  style={{ width: "100%", background: luckyWon ? "var(--accent-gold)" : "var(--bg-card)", color: luckyWon ? "var(--bg-main)" : "var(--accent-gold)", borderColor: "var(--accent-gold)" }}
                >
                  <span style={{ fontSize: "1.2rem", marginRight: "0.5rem" }}>🎲</span>
                  {luckyWon ? "YOU WON! Order is FREE!" : (hasPlayedLucky ? "Better luck next time!" : "I'm Feeling Lucky (Roll for a free order!)")}
                </button>
              </div>

              {/* 💵 Payment Method Selection */}
              <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "1.5rem" }}>
                <span className="form-label" style={{ marginBottom: "0.75rem", display: "block", fontSize: "0.9rem", fontWeight: 700 }}>
                  Select Payment Method
                </span>
                
                <div className="payment-selector-grid">
                  
                  {/* Option 1: Cash */}
                  <div 
                    className={`payment-selector-card ${paymentMethod === "cash" ? "selected" : ""}`}
                    onClick={() => setPaymentMethod("cash")}
                  >
                    <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: paymentMethod === "cash" ? "rgba(52, 211, 153, 0.15)" : "var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "center", color: paymentMethod === "cash" ? "var(--color-success)" : "var(--color-text-dim)" }}>
                      <DollarSign size={18} style={{ margin: "auto" }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>Cash on Pickup</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>Pay upon collection</div>
                    </div>
                  </div>

                  {/* Option 2: TnG */}
                  <div 
                    className={`payment-selector-card ${paymentMethod === "tng" ? "selected" : ""}`}
                    onClick={() => setPaymentMethod("tng")}
                  >
                    <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: paymentMethod === "tng" ? "rgba(242, 161, 38, 0.15)" : "var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "center", color: paymentMethod === "tng" ? "var(--accent-gold)" : "var(--color-text-dim)" }}>
                      <QrCode size={18} style={{ margin: "auto" }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>Touch 'n Go eWallet</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>Scan QR to pay in advance</div>
                    </div>
                  </div>

                </div>
              </div>

              {/* 📲 TnG DuitNow QR Interactive Area */}
              {paymentMethod === "tng" && (
                <div className="tng-payment-box">
                  <div className="tng-payment-grid">
                    
                    {/* Real Touch 'n Go DuitNow QR Image */}
                    <div 
                      onClick={() => setIsQRModalOpen(true)}
                      style={{ background: "white", padding: "0.4rem", borderRadius: "8px", boxShadow: "0 4px 10px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem", cursor: "pointer", transition: "transform 0.2s" }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                      onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                    >
                      <img 
                        src="/tng_qr.jpg" 
                        alt="Touch 'n Go DuitNow QR Code" 
                        style={{ width: "95px", height: "auto", borderRadius: "6px", display: "block" }}
                      />
                      <div style={{ fontSize: "0.6rem", color: "var(--color-text-dim)", fontWeight: 700, marginTop: "0.2rem", textTransform: "uppercase" }}>
                        <Maximize size={10} style={{ display: "inline", verticalAlign: "middle", marginRight: "2px", marginBottom: "1px" }} /> Click to enlarge
                      </div>
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

                      <div className="tng-payment-inputs">
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
                              disabled={isScanningQR}
                            />
                            <label 
                              htmlFor="slip-upload" 
                              className="btn btn-secondary"
                              style={{ padding: "0.5rem", fontSize: "0.75rem", borderRadius: "8px", cursor: isScanningQR ? "not-allowed" : "pointer", width: "100%", justifyContent: "center", gap: "0.25rem", opacity: isScanningQR ? 0.7 : 1 }}
                            >
                              {isScanningQR ? (
                                <>Scanning Receipt... <span className="ocr-spinner" style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>🔄</span></>
                              ) : slipFileName ? (
                                <>Uploaded ✓</>
                              ) : (
                                <><Upload size={13} /> Browse</>
                              )}
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
                Next Step {totalSkewers > 0 && `(RM ${calculateTotal().toFixed(2)})`} <ChevronRight size={16} />
              </button>
            ) : (
              <button 
                className="btn btn-primary" 
                onClick={handleSubmit}
                disabled={isSubmitting || !custName.trim() || !custPhone.trim() || !pickupTime || (paymentMethod === "tng" && (!paymentRef.trim() || !paymentSlip))}
                style={{ background: "var(--color-success)", color: "#ffffff", boxShadow: "0 4px 14px rgba(16, 185, 129, 0.25)" }}
              >
                {isSubmitting ? "Locking in pre-order..." : `Confirm & Pre-Order! (RM ${calculateTotal().toFixed(2)}) 🍢`}
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

      {/* 🎲 Lucky Modal */}
      {isLuckyModalOpen && (
        <div className="lucky-modal-overlay">
          <div className="lucky-modal-content">
            <button className="mystery-close-btn" onClick={() => !isRolling && setIsLuckyModalOpen(false)}>
              <X size={16} />
            </button>
            <h2 style={{ color: "var(--accent-gold)", margin: "0 0 1rem 0", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
              I'm Feeling Lucky! 🎲
            </h2>
            <p style={{ marginBottom: "1.5rem", fontSize: "0.9rem", color: "var(--color-text-main)", textAlign: "center", lineHeight: "1.5" }}>
              Roll the dice and if the sum matches your target, your entire bowl is <strong>100% FREE!</strong>
            </p>

            <div style={{ background: "rgba(255,255,255,0.05)", padding: "1.5rem", borderRadius: "12px", marginBottom: "1.5rem", textAlign: "center" }}>
              <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "1px" }}>Target Number</div>
              <div style={{ fontSize: "3.5rem", fontWeight: 800, color: "var(--color-text-main)", lineHeight: "1", textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
                {luckyTarget}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginBottom: "2rem" }}>
              <div className={`dice-cube ${isRolling ? "rolling" : ""}`}>
                {luckyRolled ? Math.max(1, Math.min(6, Math.floor(luckyRolled / 2))) : "?"}
              </div>
              <div className={`dice-cube ${isRolling ? "rolling" : ""}`}>
                {luckyRolled ? (luckyRolled - Math.max(1, Math.min(6, Math.floor(luckyRolled / 2)))) : "?"}
              </div>
            </div>

            {luckyRolled && !isRolling && (
              <div style={{ textAlign: "center", marginBottom: "1.5rem", animation: "slideUp 0.3s ease" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: luckyWon ? "var(--color-success)" : "var(--accent-red)", marginBottom: "0.5rem" }}>
                  {luckyWon ? "JACKPOT! YOU WIN!" : "Aww, not this time!"}
                </div>
                <div style={{ fontSize: "0.9rem", color: "var(--color-text-muted)" }}>
                  You rolled a {luckyRolled}.
                </div>
              </div>
            )}

            {!luckyRolled && !isRolling && (
              <button 
                className="btn btn-primary"
                onClick={rollLuckyDice}
                style={{ width: "100%", background: "var(--accent-gold)", color: "var(--bg-main)", padding: "1rem", fontSize: "1.1rem", borderRadius: "8px", border: "none", boxShadow: "0 4px 15px rgba(242, 161, 38, 0.3)" }}
              >
                ROLL THE DICE!
              </button>
            )}

            {(luckyRolled && !isRolling) && (
              <button 
                className="btn btn-secondary"
                onClick={() => setIsLuckyModalOpen(false)}
                style={{ width: "100%", padding: "0.8rem", borderRadius: "8px" }}
              >
                {luckyWon ? "Claim Free Order" : "Continue to Payment"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 🔍 QR Modal */}
      {isQRModalOpen && (
        <div className="lucky-modal-overlay" onClick={() => setIsQRModalOpen(false)}>
          <div className="lucky-modal-content" onClick={e => e.stopPropagation()} style={{ textAlign: "center", padding: "1.5rem" }}>
            <button className="mystery-close-btn" onClick={() => setIsQRModalOpen(false)} style={{ top: "-10px", right: "-10px", background: "var(--bg-card)" }}>
              <X size={16} />
            </button>
            <h2 style={{ color: "var(--accent-gold)", margin: "0 0 1rem 0" }}>Touch 'n Go QR</h2>
            <div style={{ background: "white", padding: "1rem", borderRadius: "12px", display: "inline-block", margin: "0.5rem 0 1.5rem 0" }}>
              <img src="/tng_qr.jpg" alt="Enlarged QR Code" style={{ width: "280px", maxWidth: "100%", height: "auto", borderRadius: "8px", display: "block" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <a 
                href="/tng_qr.jpg" 
                download="tng_qr.jpg"
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center", background: "var(--accent-gold)", color: "var(--bg-main)" }}
              >
                <Download size={16} style={{ marginRight: "0.5rem" }} /> Download QR Code
              </a>
              <button 
                className="btn btn-secondary"
                onClick={() => setIsQRModalOpen(false)}
                style={{ width: "100%", justifyContent: "center" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
