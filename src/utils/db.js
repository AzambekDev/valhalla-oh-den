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
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error("Supabase getOrders error, falling back to local:", e);
    }
  }
  return JSON.parse(localStorage.getItem("oden_orders") || "[]");
}

export async function addOrder(orderData) {
  const newOrder = {
    id: `ODN-${Math.floor(1000 + Math.random() * 9000)}`,
    status: "pending",
    payment_method: "cash",
    payment_ref: "",
    payment_slip: null,
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

export function subscribeOrders(callback) {
  let active = true;

  getOrders().then(orders => {
    if (active) callback(orders);
  });

  const supabase = getSupabaseClient();
  if (supabase) {
    const channel = supabase
      .channel("custom-all-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        async () => {
          const freshOrders = await getOrders();
          if (active) callback(freshOrders);
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  } else {
    const handleStorageChange = async () => {
      const freshOrders = JSON.parse(localStorage.getItem("oden_orders") || "[]");
      if (active) callback(freshOrders);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("oden_db_update", handleStorageChange);
    return () => {
      active = false;
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("oden_db_update", handleStorageChange);
    };
  }
}
