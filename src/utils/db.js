import { createClient } from "@supabase/supabase-js";

// Helper: Secure browser-native SHA-256 hashing (returns hex string)
export async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);                    
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

// Retrieve keys from environment or localStorage
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
// admin123 -> 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
// chef123  -> fa0990ab6f2ecfd562611cedad67152e8c1117f91c22d15094d1e242314243af
const DEFAULT_ADMIN_HASH = "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9";
const DEFAULT_WORKER_HASH = "fa0990ab6f2ecfd562611cedad67152e8c1117f91c22d15094d1e242314243af";

const OLD_ADMIN_HASH = "240a10a68a5c3789069d2719a7dfa0b6c698188147d3d2db763ee18a7c29cb01";
const OLD_WORKER_HASH = "65e718b52504285e687895e6f6ee9db566144e82df41e8c7fb97063de7090b8c";

// Setup security defaults and repair wrong hashes if they already exist in browser local storage
const currentAdminHash = localStorage.getItem("oden_admin_passcode_hash");
if (!currentAdminHash || currentAdminHash === OLD_ADMIN_HASH) {
  localStorage.setItem("oden_admin_passcode_hash", DEFAULT_ADMIN_HASH);
}

const currentWorkerHash = localStorage.getItem("oden_worker_passcode_hash");
if (!currentWorkerHash || currentWorkerHash === OLD_WORKER_HASH) {
  localStorage.setItem("oden_worker_passcode_hash", DEFAULT_WORKER_HASH);
}

// Setup DuitNow Payment QR defaults and upgrade old mock values automatically
const OLD_TNG_NUMBER = "+60 12-345 6789";
const OLD_TNG_NAME = "ODEN ENTERPRISE STALL (ATRIUM)";

const currentTngNumber = localStorage.getItem("oden_tng_number");
if (!currentTngNumber || currentTngNumber === OLD_TNG_NUMBER) {
  localStorage.setItem("oden_tng_number", "+601164188797");
}

const currentTngName = localStorage.getItem("oden_tng_name");
if (!currentTngName || currentTngName === OLD_TNG_NAME) {
  localStorage.setItem("oden_tng_name", "Azambek Sattarov XXX");
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

// Base64 Mock receipt screenshot for demonstrations
const MOCK_SLIP = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='400' style='background:%23005baa;font-family:sans-serif;color:white'><rect x='10' y='10' width='280' height='380' fill='%23005baa' rx='10' stroke='white' stroke-width='2'/><text x='150' y='50' font-size='22' font-weight='bold' fill='white' text-anchor='middle'>Touch n Go eWallet</text><circle cx='150' cy='130' r='40' fill='%2300a1e4'/><path d='M135 130 l10 10 l20 -20' stroke='white' stroke-width='5' fill='none'/><text x='150' y='200' font-size='16' font-weight='bold' fill='white' text-anchor='middle'>TRANSFER SUCCESSFUL</text><text x='150' y='230' font-size='24' font-weight='bold' fill='%23fbcf00' text-anchor='middle'>RM11.50</text><text x='30' y='280' font-size='12' fill='%23cccccc'>Merchant: VALHALLA OH-DEN!</text><text x='30' y='300' font-size='12' fill='%23cccccc'>Ref ID: TNG-829304928374</text><text x='30' y='320' font-size='12' fill='%23cccccc'>Date: 2026-05-28 12:00:14</text><text x='150' y='360' font-size='10' fill='white' opacity='0.7' text-anchor='middle'>Receipt generated automatically for OdenPre</text></svg>";

const MOCK_INITIAL_ORDERS = [
  {
    id: "ODN-8294",
    customer_name: "John Doe",
    phone: "+6017-8899234",
    soup_base: "Tom-Yum",
    items: {
      "Cheese Tofu": 3,
      "Fish Ball": 2,
      "Seafood Beancurd Roll": 2
    },
    total_price: 11.50,
    pickup_time: "12:15 PM",
    status: "pending",
    payment_method: "tng",
    payment_ref: "TNG-829304928374",
    payment_slip: MOCK_SLIP,
    created_at: new Date(Date.now() - 30 * 60000).toISOString()
  },
  {
    id: "ODN-1948",
    customer_name: "Sarah Lim",
    phone: "+6012-3456789",
    soup_base: "Kimchi",
    items: {
      "Fish Sandwich": 2,
      "Seafood Tofu": 4,
      "Fish Ball": 1
    },
    total_price: 11.50,
    pickup_time: "12:30 PM",
    status: "preparing",
    payment_method: "cash",
    payment_ref: "",
    payment_slip: null,
    created_at: new Date(Date.now() - 15 * 60000).toISOString()
  },
  {
    id: "ODN-7362",
    customer_name: "Azrul Shah",
    phone: "+6019-3382910",
    soup_base: "Tom-Yum",
    items: {
      "Cheese Tofu": 1,
      "Seafood Beancurd Roll": 3
    },
    total_price: 7.00,
    pickup_time: "12:00 PM",
    status: "ready",
    payment_method: "cash",
    payment_ref: "",
    payment_slip: null,
    created_at: new Date(Date.now() - 45 * 60000).toISOString()
  }
];

if (!localStorage.getItem("oden_orders")) {
  localStorage.setItem("oden_orders", JSON.stringify(MOCK_INITIAL_ORDERS));
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

export function resetMockOrders() {
  localStorage.setItem("oden_orders", JSON.stringify(MOCK_INITIAL_ORDERS));
  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new Event("oden_db_update"));
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
