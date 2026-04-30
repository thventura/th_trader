import fetch from 'node-fetch';
import fs from 'fs';

async function fetchHidden() {
    console.log('Fetching jquery-3.72.js...');
    const res = await fetch('https://pumabroker.com/js/lib/jquery-3.72.js');
    const text = await res.text();
    fs.writeFileSync('jquery-3.72.js', text);
    console.log('Saved jquery-3.72.js (Length:', text.length, ')');
}

fetchHidden().catch(console.error);
