import fetch from 'node-fetch';
import fs from 'fs';

async function dls() {
    const files = ['account.js', 'account_balance.js', 'chartbar.js', 'timeopen.js'];
    for (const f of files) {
        const res = await fetch(`https://pumabroker.com/js/${f}`);
        fs.writeFileSync(f, await res.text());
        console.log(`Saved ${f}`);
    }
}
dls().catch(console.error);
