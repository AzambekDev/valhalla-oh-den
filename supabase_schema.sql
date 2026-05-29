-- 🍢 OdenPre Database Schema Setup Script
-- Paste this script directly into your Supabase project's SQL Editor and run it.

-- 0. Drop existing table to ensure schema resets with new payment columns
DROP TABLE IF EXISTS public.orders;

-- 1. Create the orders table with Touch 'n Go payment columns
CREATE TABLE public.orders (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    soup_base TEXT NOT NULL,
    items JSONB NOT NULL,
    total_price NUMERIC NOT NULL,
    pickup_time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    payment_method TEXT NOT NULL DEFAULT 'cash',
    payment_ref TEXT NOT NULL DEFAULT '',
    payment_slip TEXT, -- Base64 encoded screenshot success slip image
    ping_count INTEGER NOT NULL DEFAULT 0, -- Counter to trigger remote customer browser audio chimes
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Enable Realtime replication for this table
-- This enables live syncing across customer devices, worker screens, and admin views!
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- Add the table to the replication publication.
-- (If it is already added, PostgreSQL will just throw a harmless duplicate warning, which you can safely ignore).
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- 3. Configure Row-Level Security (RLS)
-- To keep this assignment project completely free and plug-and-play,
-- we will enable RLS and set public policies allowing all anonymous actions (read, write, update, delete).
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" 
ON public.orders FOR SELECT 
USING (true);

CREATE POLICY "Allow public inserts" 
ON public.orders FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public updates" 
ON public.orders FOR UPDATE 
USING (true);

CREATE POLICY "Allow public deletes" 
ON public.orders FOR DELETE 
USING (true);

-- 🍢 Your upgraded OdenPre Real-Time database is now ready!
