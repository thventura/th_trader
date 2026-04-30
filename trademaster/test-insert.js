import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
// If we have service key we can run operations
const supabase = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testInsert() {
    // Get an existing user
    const { data: users, error: errUsers } = await supabase.auth.admin.listUsers();
    if (errUsers || !users || users.users.length === 0) {
        console.error("Could not get users", errUsers);
        return;
    }
    const user = users.users[0];
    console.log("Testing with user:", user.id);

    // Try to insert as admin (should bypass RLS)
    const fakeSub = {
        endpoint: "https://fcm.googleapis.com/fcm/send/fake123",
        keys: { "p256dh": "fake", "auth": "fake" },
        user_id: user.id
    };

    const { data, error } = await supabase.from('push_subscriptions').upsert(fakeSub, { onConflict: 'endpoint' });
    console.log("Upsert result:", { data, error });

    if (error) {
        console.log("Upsert failed:", error.message);
    } else {
        console.log("Upsert success. Deleting...");
        await supabase.from('push_subscriptions').delete().eq('endpoint', fakeSub.endpoint);
    }
}

testInsert();
