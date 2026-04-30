import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || VITE_SUPABASE_ANON_KEY);

async function check() {
    const { data, error } = await supabase.from('push_subscriptions').select('*');
    if (error) {
        console.error("Error querying table:", error.message);
    } else {
        console.log("Subscriptions found:", data.length);
        console.log(data);
    }
}

check();
