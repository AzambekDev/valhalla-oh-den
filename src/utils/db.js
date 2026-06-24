import { createClient } from "@supabase/supabase-js";

// Helper: Secure browser-native SHA-256 hashing (returns hex string)
export async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);                    
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

// Retrieve keys from environment variables OR localStorage fallback
export function getSupabaseConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem("oden_supabase_url") || "";
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem("oden_supabase_key") || "";
  return { url, key };
}

export function isSupabaseConnected() {
  const { url, key } = getSupabaseConfig();
  return !!(url && key);
}

let supabaseInstance = null;
function getSupabaseClient() {
  if (!isSupabaseConnected()) return null;
  if (supabaseInstance) return supabaseInstance;

  const { url, key } = getSupabaseConfig();
  try {
    supabaseInstance = createClient(url, key);
    return supabaseInstance;
  } catch (error) {
    console.error("Failed to initialize Supabase client:", error);
    return null;
  }
}

export function resetSupabaseClient() {
  supabaseInstance = null;
}

// 🔐 Default Passcodes (SHA-256 Hashed):
// valhallaohden123 -> eed8bf1b966368d93cab3a86d613675102dcf4044e54f66c32e90b14b02f28dc
const DEFAULT_ADMIN_HASH = "eed8bf1b966368d93cab3a86d613675102dcf4044e54f66c32e90b14b02f28dc";
const DEFAULT_WORKER_HASH = "eed8bf1b966368d93cab3a86d613675102dcf4044e54f66c32e90b14b02f28dc";

const OLD_ADMIN_HASHES = [
  "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9", // admin123
  "240a10a68a5c3789069d2719a7dfa0b6c698188147d3d2db763ee18a7c29cb01"
];
const OLD_WORKER_HASHES = [
  "fa0990ab6f2ecfd562611cedad67152e8c1117f91c22d15094d1e242314243af", // chef123
  "65e718b52504285e687895e6f6ee9db566144e82df41e8c7fb97063de7090b8c"
];

// Setup security defaults and upgrade automatically if legacy defaults are detected
const currentAdminHash = localStorage.getItem("oden_admin_passcode_hash");
if (!currentAdminHash || OLD_ADMIN_HASHES.includes(currentAdminHash)) {
  localStorage.setItem("oden_admin_passcode_hash", DEFAULT_ADMIN_HASH);
}

const currentWorkerHash = localStorage.getItem("oden_worker_passcode_hash");
if (!currentWorkerHash || OLD_WORKER_HASHES.includes(currentWorkerHash)) {
  localStorage.setItem("oden_worker_passcode_hash", DEFAULT_WORKER_HASH);
}

// Setup DuitNow Payment QR defaults and upgrade old values automatically
const OLD_TNG_NUMBER = "+60 12-345 6789";
const OLD_TNG_NAME = "ODEN ENTERPRISE STALL (ATRIUM)";

const currentTngNumber = localStorage.getItem("oden_tng_number");
if (!currentTngNumber || currentTngNumber === OLD_TNG_NUMBER) {
  localStorage.setItem("oden_tng_number", "+601164188797");
}

const currentTngName = localStorage.getItem("oden_tng_name");
if (!currentTngName || currentTngName === OLD_TNG_NAME || currentTngName === "Azambek Sattarov XXX") {
  localStorage.setItem("oden_tng_name", "SATTAROV AZAMBEK XXX");
}

// Initialize empty orders storage if not set
if (!localStorage.getItem("oden_orders")) {
  localStorage.setItem("oden_orders", JSON.stringify([]));
}

/**
 * Verifies a plaintext passcode against the stored SHA-256 hash.
 */
export async function verifyPasscode(role, plaintext) {
  const hashKey = role === "admin" ? "oden_admin_passcode_hash" : "oden_worker_passcode_hash";
  const storedHash = localStorage.getItem(hashKey);
  const inputHash = await sha256(plaintext);
  return storedHash === inputHash;
}

/**
 * Hashes and updates a role's passcode.
 */
export async function setPasscode(role, plaintext) {
  const hashKey = role === "admin" ? "oden_admin_passcode_hash" : "oden_worker_passcode_hash";
  const hashedVal = await sha256(plaintext);
  localStorage.setItem(hashKey, hashedVal);
  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new Event("oden_db_update"));
  return true;
}

export async function getOrders() {
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      // Check and create system settings row in background
      ensureStallSettings().catch(err => console.error("ensureStallSettings error:", err));
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
      } catch (e) {
        console.error("Supabase getOrders error, falling back to local:", e);
        return JSON.parse(localStorage.getItem("oden_orders") || "[]");
      }
    }
    ensureStallSettings().catch(err => console.error("ensureStallSettings error:", err));
    return JSON.parse(localStorage.getItem("oden_orders") || "[]");
  } catch (err) {
    console.error("Critical error in getOrders, returning local fallback:", err);
    return JSON.parse(localStorage.getItem("oden_orders") || "[]");
  }
}

export async function addOrder(orderData) {
  const newOrder = {
    id: `ODN-${Math.floor(1000 + Math.random() * 9000)}`,
    status: "pending",
    payment_method: "cash",
    payment_ref: "",
    payment_slip: null,
    ping_count: 0,
    created_at: new Date().toISOString(),
    ...orderData
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("orders")
        .insert([newOrder])
        .select();
      if (error) throw error;
      return data[0];
    } catch (e) {
      console.error("Supabase addOrder error, falling back to local:", e);
    }
  }

  const orders = JSON.parse(localStorage.getItem("oden_orders") || "[]");
  orders.unshift(newOrder);
  localStorage.setItem("oden_orders", JSON.stringify(orders));
  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new Event("oden_db_update"));
  return newOrder;
}

export async function updateOrderStatus(orderId, status) {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", orderId)
        .select();
      if (error) throw error;
      return data[0];
    } catch (e) {
      console.error("Supabase updateOrderStatus error, falling back to local:", e);
    }
  }

  const orders = JSON.parse(localStorage.getItem("oden_orders") || "[]");
  const updatedOrders = orders.map(o => o.id === orderId ? { ...o, status } : o);
  localStorage.setItem("oden_orders", JSON.stringify(updatedOrders));
  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new Event("oden_db_update"));
  return updatedOrders.find(o => o.id === orderId);
}

export async function deleteOrder(orderId) {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);
      if (error) throw error;
      return true;
    } catch (e) {
      console.error("Supabase deleteOrder error, falling back to local:", e);
    }
  }

  const orders = JSON.parse(localStorage.getItem("oden_orders") || "[]");
  const updatedOrders = orders.filter(o => o.id !== orderId);
  localStorage.setItem("oden_orders", JSON.stringify(updatedOrders));
  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new Event("oden_db_update"));
  return true;
}

export async function clearOrders() {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase
        .from("orders")
        .delete()
        .neq("id", "placeholder");
      if (error) throw error;
      return true;
    } catch (e) {
      console.error("Supabase clearOrders error, falling back to local:", e);
    }
  }

  localStorage.setItem("oden_orders", JSON.stringify([]));
  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new Event("oden_db_update"));
  return true;
}

export async function pingCustomer(orderId, currentCount) {
  const nextCount = (currentCount || 0) + 1;
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("orders")
        .update({ ping_count: nextCount })
        .eq("id", orderId)
        .select();
      if (error) throw error;
      return data[0];
    } catch (e) {
      console.error("Supabase pingCustomer error, falling back to local:", e);
    }
  }

  const orders = JSON.parse(localStorage.getItem("oden_orders") || "[]");
  const updatedOrders = orders.map(o => o.id === orderId ? { ...o, ping_count: nextCount } : o);
  localStorage.setItem("oden_orders", JSON.stringify(updatedOrders));
  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new Event("oden_db_update"));
  return updatedOrders.find(o => o.id === orderId);
}

export function subscribeOrders(callback) {
  let active = true;

  const handleSettingsSync = (ordersList) => {
    if (!ordersList || !Array.isArray(ordersList)) return;
    const settingsOrder = ordersList.find(o => o && o.id === "STALL_SETTINGS");
    if (settingsOrder && settingsOrder.items) {
      const cloudForce = settingsOrder.items.force_status || "auto";
      const cloudCutoff = settingsOrder.items.cutoff_time || "16:00";
      
      const localForce = localStorage.getItem("oden_force_status") || "auto";
      const localCutoff = localStorage.getItem("oden_cutoff_time") || "16:00";
      
      if (cloudForce !== localForce || cloudCutoff !== localCutoff) {
        localStorage.setItem("oden_force_status", cloudForce);
        localStorage.setItem("oden_cutoff_time", cloudCutoff);
        window.dispatchEvent(new Event("storage"));
      }
    }
  };

  getOrders().then(orders => {
    if (active) {
      const ordersArray = Array.isArray(orders) ? orders : [];
      handleSettingsSync(ordersArray);
      callback(ordersArray);
    }
  }).catch(err => {
    console.error("subscribeOrders initial fetch error:", err);
    if (active) {
      callback([]);
    }
  });

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const uniqueChannelId = `orders-channel-${Math.floor(100000 + Math.random() * 900000)}`;
      const channel = supabase
        .channel(uniqueChannelId)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders" },
          async () => {
            try {
              const freshOrders = await getOrders();
              if (active) {
                const ordersArray = Array.isArray(freshOrders) ? freshOrders : [];
                handleSettingsSync(ordersArray);
                callback(ordersArray);
              }
            } catch (err) {
              console.error("postgres_changes event handle error:", err);
            }
          }
        )
        .subscribe();

      // 🔄 Polling fallback: Automatically query fresh orders from the cloud database every 5 seconds
      // to guarantee instant dashboard refreshes if WebSockets are slow or throttling.
      const pollInterval = setInterval(async () => {
        try {
          const freshOrders = await getOrders();
          if (active) {
            const ordersArray = Array.isArray(freshOrders) ? freshOrders : [];
            handleSettingsSync(ordersArray);
            callback(ordersArray);
          }
        } catch (err) {
          console.error("pollInterval cloud error:", err);
        }
      }, 5000);

      return () => {
        active = false;
        try {
          supabase.removeChannel(channel);
        } catch (err) {
          console.error("removeChannel error:", err);
        }
        clearInterval(pollInterval);
      };
    } catch (e) {
      console.error("Supabase subscription setup failed, falling back to local:", e);
    }
  }

  // Fallback to local storage polling (always used as a resilient fallback if Supabase fails or is disabled)
  const handleStorageChange = async () => {
    const freshOrders = JSON.parse(localStorage.getItem("oden_orders") || "[]");
    if (active) {
      const ordersArray = Array.isArray(freshOrders) ? freshOrders : [];
      handleSettingsSync(ordersArray);
      callback(ordersArray);
    }
  };

  // 🔄 Local Polling fallback: Periodically load local storage to sync tabs instantly
  const pollInterval = setInterval(async () => {
    const freshOrders = JSON.parse(localStorage.getItem("oden_orders") || "[]");
    if (active) {
      const ordersArray = Array.isArray(freshOrders) ? freshOrders : [];
      handleSettingsSync(ordersArray);
      callback(ordersArray);
    }
  }, 5000);

  window.addEventListener("storage", handleStorageChange);
  window.addEventListener("oden_db_update", handleStorageChange);
  return () => {
    active = false;
    window.removeEventListener("storage", handleStorageChange);
    window.removeEventListener("oden_db_update", handleStorageChange);
    clearInterval(pollInterval);
  };
}

/**
 * Ensures the special STALL_SETTINGS row exists in the cloud database or local storage.
 */
export async function ensureStallSettings() {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", "STALL_SETTINGS");
      if (error) throw error;
      
      if (!data || data.length === 0) {
        const defaultSettings = {
          id: "STALL_SETTINGS",
          customer_name: "Stall Settings",
          phone: "0000000000",
          soup_base: "System",
          items: {
            force_status: localStorage.getItem("oden_force_status") || "auto",
            cutoff_time: localStorage.getItem("oden_cutoff_time") || "16:00",
            lucky_prob: localStorage.getItem("oden_lucky_prob") || "0.001"
          },
          total_price: 0,
          pickup_time: "System",
          status: "completed",
          payment_method: "cash",
          payment_ref: "",
          payment_slip: null,
          ping_count: 0,
          created_at: new Date().toISOString()
        };
        await supabase.from("orders").insert([defaultSettings]);
      }
    } catch (e) {
      console.error("Failed to ensure cloud settings:", e);
    }
  } else {
    const orders = JSON.parse(localStorage.getItem("oden_orders") || "[]");
    const exists = orders.some(o => o.id === "STALL_SETTINGS");
    if (!exists) {
      const defaultSettings = {
        id: "STALL_SETTINGS",
        customer_name: "Stall Settings",
        phone: "0000000000",
        soup_base: "System",
        items: {
          force_status: localStorage.getItem("oden_force_status") || "auto",
          cutoff_time: localStorage.getItem("oden_cutoff_time") || "16:00",
          lucky_prob: localStorage.getItem("oden_lucky_prob") || "0.001"
        },
        total_price: 0,
        pickup_time: "System",
        status: "completed",
        payment_method: "cash",
        payment_ref: "",
        payment_slip: null,
        ping_count: 0,
        created_at: new Date().toISOString()
      };
      orders.push(defaultSettings);
      localStorage.setItem("oden_orders", JSON.stringify(orders));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("oden_db_update"));
    }
  }
}

/**
 * Synchronizes force status and cutoff time to the STALL_SETTINGS row in cloud DB.
 */
export async function syncStallSettings(forceStatus, cutoffTime, luckyProb) {
  const currentForce = forceStatus !== undefined ? forceStatus : (localStorage.getItem("oden_force_status") || "auto");
  const currentCutoff = cutoffTime !== undefined ? cutoffTime : (localStorage.getItem("oden_cutoff_time") || "16:00");
  const currentProb = luckyProb !== undefined ? luckyProb : (localStorage.getItem("oden_lucky_prob") || "0.001");
  
  // Save locally immediately for snappy responsiveness
  localStorage.setItem("oden_force_status", currentForce);
  localStorage.setItem("oden_cutoff_time", currentCutoff);
  localStorage.setItem("oden_lucky_prob", currentProb);
  window.dispatchEvent(new Event("storage"));

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await ensureStallSettings();
      const { error } = await supabase
        .from("orders")
        .update({
          items: {
            force_status: currentForce,
            cutoff_time: currentCutoff,
            lucky_prob: currentProb
          }
        })
        .eq("id", "STALL_SETTINGS");
      if (error) throw error;
    } catch (e) {
      console.error("Failed to sync cloud settings:", e);
    }
  } else {
    // LocalStorage fallback
    const orders = JSON.parse(localStorage.getItem("oden_orders") || "[]");
    let match = orders.find(o => o.id === "STALL_SETTINGS");
    if (match) {
      match.items = {
        force_status: currentForce,
        cutoff_time: currentCutoff,
        lucky_prob: currentProb
      };
    } else {
      orders.push({
        id: "STALL_SETTINGS",
        customer_name: "Stall Settings",
        phone: "0000000000",
        soup_base: "System",
        items: {
          force_status: currentForce,
          cutoff_time: currentCutoff,
          lucky_prob: currentProb
        },
        total_price: 0,
        pickup_time: "System",
        status: "completed",
        payment_method: "cash",
        payment_ref: "",
        payment_slip: null,
        ping_count: 0,
        created_at: new Date().toISOString()
      });
    }
    localStorage.setItem("oden_orders", JSON.stringify(orders));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("oden_db_update"));
  }
}

// 🍢 Stress Testing Mock Data Generators & Helpers
const MOCK_NAMES = [
  "Ragnar Lothbrok", "Bjorn Ironside", "Ivar the Boneless", "Lagertha", "Floki", "Odin", "Thor", "Loki", "Freya", "Harald",
  "Ali Bin Ahmad", "Chong Wei", "Muthu", "Siti Nurhaliza", "Devi", "Tan Ah Kow", "Sarah Connor", "John Doe", "Darren Tan", "Azambek"
];
const MOCK_PHONES = [
  "+60 11-234 5678", "+60 12-345 6789", "+60 13-987 6543", "+60 16-418 8797", "+60 17-555 4321", "+60 19-888 1234"
];
const MOCK_SOUPS = ["Tom-Yum", "Kimchi"];
const MOCK_ITEMS = [
  "Lobster-flavoured balls", "Stuffed squid rolls", "Golden seafood rolls", "Scallop-style seafood tofu", "Fishball"
];
const MOCK_STATUSES = ["pending", "preparing", "ready", "completed"];
const MOCK_SLOTS = ["11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM"];
const MOCK_PAYMENTS = ["cash", "tng"];

function generateSingleMockOrder(idNum, forceStatus) {
  const name = MOCK_NAMES[Math.floor(Math.random() * MOCK_NAMES.length)];
  const phone = MOCK_PHONES[Math.floor(Math.random() * MOCK_PHONES.length)];
  const soup = MOCK_SOUPS[Math.floor(Math.random() * MOCK_SOUPS.length)];
  
  const items = {};
  let totalQty = 0;
  while (totalQty === 0) {
    MOCK_ITEMS.forEach(item => {
      const qty = Math.floor(Math.random() * 4); // 0-3
      if (qty > 0) {
        items[item] = qty;
        totalQty += qty;
      }
    });
  }
  
  const totalPrice = totalQty * 3.00;
  const slot = MOCK_SLOTS[Math.floor(Math.random() * MOCK_SLOTS.length)];
  const status = forceStatus || MOCK_STATUSES[Math.floor(Math.random() * MOCK_STATUSES.length)];
  const payment = MOCK_PAYMENTS[Math.floor(Math.random() * MOCK_PAYMENTS.length)];
  const paymentRef = payment === "tng" ? `TNG${Math.floor(10000000 + Math.random() * 90000000)}` : "";
  
  return {
    id: `ODN-${idNum || Math.floor(1000 + Math.random() * 9000)}`,
    customer_name: name,
    phone: phone,
    soup_base: soup,
    items: items,
    total_price: totalPrice,
    pickup_time: slot,
    status: status,
    payment_method: payment,
    payment_ref: paymentRef,
    payment_slip: null,
    ping_count: 0,
    created_at: new Date(Date.now() - Math.random() * 8 * 3600 * 1000).toISOString()
  };
}

export async function bulkAddOrders(count) {
  const generated = [];
  for (let i = 0; i < count; i++) {
    const idNum = Math.floor(1000 + Math.random() * 8999);
    generated.push(generateSingleMockOrder(idNum));
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const chunkSize = 200;
      for (let i = 0; i < generated.length; i += chunkSize) {
        const chunk = generated.slice(i, i + chunkSize);
        const { error } = await supabase
          .from("orders")
          .insert(chunk);
        if (error) throw error;
      }
      return true;
    } catch (e) {
      console.error("Supabase bulkAddOrders error, falling back to local:", e);
    }
  }

  const orders = JSON.parse(localStorage.getItem("oden_orders") || "[]");
  const filtered = orders.filter(o => o.id !== "STALL_SETTINGS");
  const settings = orders.find(o => o.id === "STALL_SETTINGS");
  
  const newOrders = [...generated, ...filtered];
  if (settings) {
    newOrders.push(settings);
  }
  
  localStorage.setItem("oden_orders", JSON.stringify(newOrders));
  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new Event("oden_db_update"));
  return true;
}

export async function resetMockOrders() {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error: delError } = await supabase
        .from("orders")
        .delete()
        .neq("id", "STALL_SETTINGS");
      if (delError) throw delError;

      const cleanMocks = [];
      const sampleStatuses = ["pending", "pending", "preparing", "preparing", "ready", "ready", "completed", "completed", "completed", "completed"];
      for (let i = 0; i < 10; i++) {
        cleanMocks.push(generateSingleMockOrder(Math.floor(1000 + Math.random() * 8999), sampleStatuses[i]));
      }

      const { error: insError } = await supabase
        .from("orders")
        .insert(cleanMocks);
      if (insError) throw insError;

      return true;
    } catch (e) {
      console.error("Supabase resetMockOrders error, falling back to local:", e);
    }
  }

  const cleanMocks = [];
  const sampleStatuses = ["pending", "pending", "preparing", "preparing", "ready", "ready", "completed", "completed", "completed", "completed"];
  for (let i = 0; i < 10; i++) {
    cleanMocks.push(generateSingleMockOrder(Math.floor(1000 + Math.random() * 8999), sampleStatuses[i]));
  }

  const orders = JSON.parse(localStorage.getItem("oden_orders") || "[]");
  const settings = orders.find(o => o.id === "STALL_SETTINGS");
  
  const newOrders = [...cleanMocks];
  if (settings) {
    newOrders.push(settings);
  } else {
    newOrders.push({
      id: "STALL_SETTINGS",
      customer_name: "Stall Settings",
      phone: "0000000000",
      soup_base: "System",
      items: {
        force_status: localStorage.getItem("oden_force_status") || "auto",
        cutoff_time: localStorage.getItem("oden_cutoff_time") || "16:00"
      },
      total_price: 0,
      pickup_time: "System",
      status: "completed",
      payment_method: "cash",
      payment_ref: "",
      payment_slip: null,
      ping_count: 0,
      created_at: new Date().toISOString()
    });
  }

  localStorage.setItem("oden_orders", JSON.stringify(newOrders));
  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new Event("oden_db_update"));
  return true;
}

