-- Enable PostGIS for geographic coordinates if available (optional, but recommended for advanced queries).
-- We will use simple FLOATs for now to ensure compatibility without complex setup, 
-- but I'll add a comment on how to upgrade.

-- 1. Missions Table
create table missions (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  status text check (status in ('draft', 'active', 'completed', 'archived')) default 'draft',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Waypoints Table (Linked to Missions)
create table waypoints (
  id uuid default uuid_generate_v4() primary key,
  mission_id uuid references missions(id) on delete cascade not null,
  sequence_order integer not null,
  lat double precision not null,
  lng double precision not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Telemetry Table (For Rover Updates)
create table telemetry (
  id uuid default uuid_generate_v4() primary key,
  rover_id text not null, -- Unique identifier for the hardware
  lat double precision,
  lng double precision,
  battery_level integer,
  signal_strength integer,
  heading double precision,
  status text check (status in ('idle', 'moving', 'error', 'charging')) default 'idle',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Realtime needs to be enabled for 'telemetry' so the dashboard updates instantly.
alter publication supabase_realtime add table telemetry;

-- 4. Row Level Security (RLS) Policies
-- For this demo, we will allow public read/write to avoid complex auth setup as requested.
-- WARNING: In production, you MUST enable Authentication.

alter table missions enable row level security;
alter table waypoints enable row level security;
alter table telemetry enable row level security;

-- Allow public access (Anon key)
create policy "Public Missions Access" on missions for all using (true);
create policy "Public Waypoints Access" on waypoints for all using (true);
create policy "Public Telemetry Access" on telemetry for all using (true);
