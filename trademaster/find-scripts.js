import fs from 'fs';

const html = fs.readFileSync('traderoom.html', 'utf-8');
const scripts = [...html.matchAll(/<script[\s\S]*?>([\s\S]*?)<\/script>/gi)];

for (let i = 0; i < scripts.length; i++) {
    const content = scripts[i][1];
    if (content.includes('userdata') || content.includes('socket') || content.includes('io(')) {
        console.log(`\n\n--- Script ${i} ---`);
        console.log(content.slice(0, 800));
    }
}
