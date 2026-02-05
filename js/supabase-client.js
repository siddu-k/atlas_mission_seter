// js/supabase-client.js

// Check for existing credentials
const SUPABASE_URL = 'https://tsvffftceybhrrgckzil.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzdmZmZnRjZXliaHJyZ2NremlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyOTkyNTcsImV4cCI6MjA4NTg3NTI1N30.i0JjNGpL-B8mRvbemgmUeEqqIb5e1A9PpdCIFeqnK88';

// Initialize Supabase Client (Global variable from CDN)

// Initialize Supabase Client (Global variable from CDN)
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        persistSession: false, // Fixes "Tracking Prevention blocked access to storage"
        autoRefreshToken: false,
        detectSessionInUrl: false
    }
}) : null;

if (!supabase) {
    console.error("Supabase SDK not loaded!");
}

export const db = {
    async saveMission(name, waypoints) {
        if (!supabase) return;

        // 1. Create Mission
        const { data: mission, error: missionError } = await supabase
            .from('missions')
            .insert({ name, status: 'active' })
            .select()
            .single();

        if (missionError) {
            console.error("Error saving mission:", missionError);
            return null;
        }

        // 2. Save Waypoints
        const waypointsData = waypoints.map((wp, index) => ({
            mission_id: mission.id,
            lat: wp.lat,
            lng: wp.lng,
            sequence_order: index
        }));

        const { error: wpError } = await supabase
            .from('waypoints')
            .insert(waypointsData);

        if (wpError) {
            console.error("Error saving waypoints:", wpError);
        }

        return mission;
    },

    subscribeToTelemetry(callback) {
        if (!supabase) return;

        supabase
            .channel('public:telemetry')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'telemetry' }, payload => {
                callback(payload.new);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'telemetry' }, payload => {
                callback(payload.new);
            })
            .subscribe((status) => {
                console.log("Telemetry Subscription Status:", status);
            });
    },

    // Fetch latest telemetry on load
    async getLatestTelemetry() {
        if (!supabase) return null;

        const { data, error } = await supabase
            .from('telemetry')
            .select('*')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle(); // Fix 406 Error on empty table (returns null choice instead of error)

        if (error) {
            console.error("Telemetry Fetch Error:", error);
            return null;
        }
        return data; // Returns object or null
    }
};
