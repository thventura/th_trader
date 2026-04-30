import fetch from 'node-fetch';

async function testHistory() {
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

    console.log('Fetching /traderoom/lots/close...');
    const res = await fetch('https://pumabroker.com/traderoom/lots/close', {
        method: 'GET',
        headers: { 'Cookie': cookie }
    });

    const text = await res.text();
    console.log('Status', res.status);
    try {
        const json = JSON.parse(text);
        console.log('Result length:', json.length || Object.keys(json).length);
        console.log(JSON.stringify(json.slice(0, 3), null, 2));
    } catch (e) {
        console.log('Result text:', text.slice(0, 500));
    }
}

testHistory().catch(console.error);
