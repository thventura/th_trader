import fetch from 'node-fetch';
import fs from 'fs';

async function getDashboard() {
    const loginRes = await fetch('https://pumabroker.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'alvescleyton30@gmail.com', password: 'cleyton212' })
    });

    const setCookie = loginRes.headers.raw()['set-cookie'];
    let cookie = '';
    if (setCookie) {
        cookie = setCookie.map(c => c.split(';')[0]).join('; ');
    }

    const res = await fetch('https://pumabroker.com/traderoom', {
        headers: { 'Cookie': cookie }
    });

    const html = await res.text();
    fs.writeFileSync('traderoom.html', html);
    console.log('Saved traderoom.html');
}

getDashboard().catch(console.error);
