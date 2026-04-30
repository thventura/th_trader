import { io } from 'socket.io-client';
import fetch from 'node-fetch';

async function testWSHistory() {
    const loginRes = await fetch('https://pumabroker.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'alvescleyton30@gmail.com', password: 'cleyton212' })
    });
    const setCookie = loginRes.headers.raw()['set-cookie'];
    let cookieStr = '';
    if (setCookie) {
        const cookies = setCookie.map(c => c.split(';')[0]);
        cookieStr = cookies.join('; ');
    }

    let authCookie = cookieStr.split('; ').find(c => c.startsWith('authentication='))?.replace('authentication=', '');

    console.log('Got cookie, connecting to socket https://node.pumabroker.com ...');
    const socket = io('https://node.pumabroker.com', {
        transports: ['websocket'],
        auth: (cb) => {
            cb({ cookie: authCookie || cookieStr })
        },
        withCredentials: true,
        extraHeaders: {
            "Origin": "https://pumabroker.com"
        }
    });

    socket.on('connect', () => {
        console.log('Connected to socket id:', socket.id);
        socket.emit("get_serverdata", { action: "get_serverdata" });
    });

    socket.on('userdata_result', (data) => {
        console.log('Received userdata_result!');
        console.log('lots_close length:', data.lots_close?.length);
        if (data.lots_close?.length > 0) {
            console.log('First lot:', JSON.stringify(data.lots_close[0], null, 2));
        }
        socket.disconnect();
        process.exit(0);
    });

    socket.on('connect_error', (err) => {
        console.log('Connection error:', err.message, err.description, err.context);
        process.exit(1);
    });

    socket.on('disconnect', (reason) => {
        console.log('Disconnected:', reason);
    });

    setTimeout(() => {
        console.log('Timeout waiting for userdata_result');
        process.exit(1);
    }, 10000);
}

testWSHistory().catch(console.error);
