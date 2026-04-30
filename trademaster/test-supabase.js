import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    const { data: users, error: errUsers } = await createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY).auth.admin.listUsers();
    if (errUsers || !users || users.users.length === 0) {
        console.error("Could not get users", errUsers);
        return;
    }
    const user = users.users[0];
    console.log("Testing with user:", user.id);

    // simulate authenticated insert by setting the session or just insert via service role to check data shape?
    // the client is using ANON key. To insert, we need the user's token.
    // Actually, RLS policy for operacoes usually allows insert if user_id == auth.uid().
    // Let's test with service role key to see if the structure itself is accepted.
    const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data, error } = await supabaseAdmin.from('operacoes').upsert({
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // uuid
        user_id: user.id,
        data: '2023-01-01',
        hora: '10:00',
        corretora: 'Puma',
        ativo: 'EUR/USD',
        mercado: 'forex',
        estrategia: 'Auto',
        direcao: 'compra',
        resultado: 'vitoria',
        investido: 100,
        payout: 80,
        lucro: 80,
        timeframe: 'M1',
        confianca: 4
    });
    console.log('Admin upsert result:', data, error?.message);

    if (!error) {
        await supabaseAdmin.from('operacoes').delete().eq('id', 'f47ac10b-58cc-4372-a567-0e02b2c3d479');
    }
}

check();
