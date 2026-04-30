import fetch from 'node-fetch';
import fs from 'fs';

async function analyze() {
    const url = 'https://pumabroker.com/js/account.js';
    const res = await fetch(url);
    const js = await res.text();
    fs.writeFileSync('account.js', js);

    const lines = js.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('userdata =') || lines[i].includes('userdata.') || lines[i].includes('var userdata')) {
            if (lines[i].includes('var userdata =') || lines[i].includes('userdata =')) {
                console.log(`Line ${i}:`, lines[i]);
                console.log('Context:', lines.slice(Math.max(0, i - 10), Math.min(lines.length, i + 10)).join('\n'));
                console.log('---');
            }
        }
    }
}

analyze().catch(console.error);
