import fs from 'fs';
const html = fs.readFileSync('traderoom.html', 'utf-8');
const reqs = [...html.matchAll(/src=["']([^"']+)["']/gi)];
console.log('JS files:');
console.log(reqs.map(r => r[1]).filter(f => f.endsWith('.js') || f.includes('.js?')));
