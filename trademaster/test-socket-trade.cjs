const { io } = require('socket.io-client');
const https = require('https');

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
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
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

async function main() {
    console.log('--- LOGIN ---');
    const loginResp = await request('POST', 'https://pumabroker.com/api/auth/login', {
        email: 'alvescleyton30@gmail.com', password: 'cleyton212'
    });

    if (!loginResp.data.success) {
        console.error('Login failed', loginResp.data);
        return;
    }

    const setCookie = loginResp.headers['set-cookie'] || [];
    const cookieStr = setCookie.map(c => c.split(';')[0]).join('; ');
    console.log('Login success!');

    console.log('--- CONNECTING TO SOCKET.IO ---');
    const match = cookieStr.match(/authentication=([^;]+)/);
    const authCookie = match ? match[1] : undefined;

    console.log('Using auth cookie:', authCookie);

    const socket = io('https://node.pumabroker.com', {
        transports: ['websocket'],
        auth: (cb) => {
            cb({ cookie: authCookie });
        },
        extraHeaders: {
            Cookie: cookieStr
        },
        withCredentials: true,
    });

    socket.on('connect', () => {
        console.log('>> Socket connected:', socket.id);

        socket.emit("get_serverdata", { action: "get_serverdata" });

        setTimeout(() => {
            const payload = {
                form: {
                    trend: "down", // "up" or "down"
                    lot: 20,
                    currency_id: 91, // BTC/USD
                    binarytime: 60,
                    x: 600,
                    y: 400
                }
            };
            console.log('\n>> Emitting add_lot:', payload);
            socket.emit("add_lot", payload);
        }, 1500);
    });

    socket.on('add_lot_result', (data) => {
        console.log('\n<< add_lot_result:', data);
        setTimeout(() => {
            socket.disconnect();
            process.exit(0);
        }, 1000);
    });

    socket.on('serverdata_result', (data) => {
        // console.log('<< serverdata_result received (partially hidden)');
    });

    socket.on('connect_error', (err) => {
        console.error('Socket connect_error:', err.message);
    });

    socket.on('error', (err) => {
        console.error('Socket error:', err);
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected');
    });
}

main().catch(console.error);
