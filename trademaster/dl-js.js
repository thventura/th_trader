import fetch from 'node-fetch';

async function downloadJs() {
    const url = 'https://pumabroker.com/js/account.js';
    console.log(`Fetching ${url}...`);
    const res = await fetch(url);
    const text = await res.text();

    // Find lines with op_container_close
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('op_container_close')) {
            console.log(`Line ${i}:`, lines[i]);
            // print context
            console.log('Context:', lines.slice(Math.max(0, i - 5), Math.min(lines.length, i + 10)).join('\n'));
        }
    }

    // Find any fetch or $.ajax for history
    const historyCalls = [...text.matchAll(/ajax\(\{\s*url\s*:\s*['"]([^'"]+)['"]/g)];
    console.log('Ajax URLs found:');
    console.log([...new Set(historyCalls.map(m => m[1]))].join('\n'));
}

downloadJs().catch(console.error);
