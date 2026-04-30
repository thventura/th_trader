import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function debug() {
    console.log("--- Supabase Debug ---");
    console.log("URL:", VITE_SUPABASE_URL);
    
    // Test with Anon Key (what Admin uses in browser)
    const supabaseAnon = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);
    const { data: anonData, error: anonError } = await supabaseAnon.from('operacoes').select('id, user_id, profiles(email)').limit(5);
    
    console.log("\n[Anon Key Results]");
    if (anonError) console.error("Error:", anonError.message);
    else console.log("Found:", anonData.length, "ops");

    // Test with Service Role (if available) - Bypass RLS
    if (SUPABASE_SERVICE_ROLE_KEY) {
        const supabaseAdmin = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: adminData, error: adminError } = await supabaseAdmin.from('operacoes').select('user_id, count').select('user_id', { count: 'exact', head: true });
        
        console.log("\n[Service Role Stats]");
        const { data: stats, error: statsError } = await supabaseAdmin.rpc('get_ops_stats').catch(() => ({ data: null, error: 'RPC not found' }));
        
        // Manual stats
        const { data: allOps, error: allOpsError } = await supabaseAdmin.from('operacoes').select('user_id, profiles(email)');
        if (allOpsError) console.error("All Ops Error:", allOpsError.message);
        else {
            const counts = {};
            allOps.forEach(op => {
                const email = op.profiles?.email || op.user_id;
                counts[email] = (counts[email] || 0) + 1;
            });
            console.log("Operations count per user:", counts);
        }
    } else {
        console.log("\n[Service Role] Key not found in .env");
    }
}

debug();
