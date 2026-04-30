const https = require('https');

const credentials = {
    email: 'alvescleyton30@gmail.com',
    password: 'cleyton212'
};

async function request(method, url, data = null, cookieStr = '') {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: 443,
            path: urlObj.pathname + (method === 'GET' && data ? '?' + new URLSearchParams(data).toString() : ''),
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookieStr,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'X-Requested-With': 'XMLHttpRequest'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: JSON.parse(body)
                    });
                } catch (e) {
                    resolve({ status: res.statusCode, headers: res.headers, data: body });
                }
            });
        });

        req.on('error', (e) => reject(e));
        if (data && method !== 'GET') {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function debug() {
    console.log('--- LOGGING IN ---');
    const loginResp = await request('POST', 'https://pumabroker.com/api/auth/login', {
        email: credentials.email,
        password: credentials.password
    });

    if (!loginResp.data.success) {
        console.error('Login failed:', loginResp.data.message);
        return;
    }

    const cookies = loginResp.headers['set-cookie'] || [];
    const cookieStr = cookies.map(c => c.split(';')[0]).join('; ');
    console.log('Login success!');

    // --- GET HISTORY ---
    console.log('\n--- FETCHING HISTORY ---');
    const histResp = await request('GET', 'https://pumabroker.com/api/operations/history', null, cookieStr);
    if (histResp.data.success && histResp.data.assets) {
        console.log(`Found ${histResp.data.assets.length} operations.`);
        if (histResp.data.assets.length > 0) {
            console.log('Last operation details:');
            console.log(JSON.stringify(histResp.data.assets[0], null, 2));
        }
    } else {
        console.log('History fetch failed or empty:', JSON.stringify(histResp.data));
    }

    // --- TEST CREATION ---
    const runCreateTest = async (label, payload) => {
        console.log(`\n> TEST: ${label}`);
        console.log('Payload:', JSON.stringify(payload));
        const resp = await request('POST', 'https://pumabroker.com/api/operations/create', payload, cookieStr);
        console.log('Status:', resp.status, '| Response:', JSON.stringify(resp.data));
    };

    // Test 4: PT keys with history values
    await runCreateTest('PT KEYS + HISTORY VALUES', {
        quantidade: 20,
        intervalo: "M1",
        tendência: "SELL",
        asset_id: 91,
        carteira: "DEMO"
    });

    // Test 5: History keys + values
    await runCreateTest('HISTORY KEYS + VALUES', {
        amount: 20,
        interval: "M1",
        trend: "SELL",
        asset_id: 91,
        carteira: "DEMO"
    });

    // Test 6: PT keys but trend in Portuguese (COMPRAR/VENDER) and interval as "M1"
    await runCreateTest('PT KEYS + VENDER + M1', {
        quantidade: 20,
        intervalo: "M1",
        tendência: "VENDER",
        asset_id: 91,
        carteira: "DEMO"
    });
}

debug().catch(console.error);
