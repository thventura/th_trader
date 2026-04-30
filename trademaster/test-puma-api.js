import { chromium } from 'playwright';

async function traceNetwork() {
    console.log('Starting playwright...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('response', async response => {
        const url = response.url();
        // Exclude noise
        if (url.includes('api.iconify') || url.includes('.png') || url.includes('.css') || url.includes('.woff') || url.includes('js')) return;

        if (url.includes('puma') || url.includes('nxos')) {
            console.log('<< [Res]', response.status(), url);
            if (url.includes('histor') || url.includes('trade') || url.includes('op') || url.includes('clos')) {
                try {
                    const body = await response.text();
                    console.log('   Body preview:', body.slice(0, 300));
                } catch (e) { }
            }
        }
    });

    console.log('Navigating to login...');
    await page.goto('https://pumabroker.com/login');

    try {
        console.log('Waiting for network idle...');
        await page.waitForLoadState('networkidle');

        console.log('Waiting for email input...');
        await page.waitForSelector('input[type="email"]', { timeout: 10000 });

        // Fill credentials
        await page.fill('input[type="email"]', 'alvescleyton30@gmail.com');
        await page.fill('input[type="password"]', 'cleyton212');
        console.log('Filled credentials. Clicking submit...');

        const submit = await page.$('button[type="submit"], form button, .btn-login, button:has-text("Entrar")');
        if (submit) {
            await submit.click();
            console.log('Clicked submit. Waiting for /traderoom to load...');
            await page.waitForURL('**/traderoom**', { timeout: 15000 }).catch(() => console.log('Timeout waiting for traderoom url'));
            await page.waitForTimeout(5000);

            console.log('Looking for history button...');
            try {
                await page.click('text="Histórico"', { timeout: 5000 });
                console.log('Clicked "Histórico" (text match)');
            } catch (e) {
                try {
                    // another attempt
                    await page.click('.history-btn, [class*="history"]', { timeout: 5000 });
                    console.log('Clicked history button (class match)');
                } catch (e2) {
                    console.log('Could not find history button. Dumping html...');
                    const html = await page.content();
                    console.log(html.substring(0, 1000));
                }
            }

            await page.waitForTimeout(5000);
        }
    } catch (err) {
        console.log('Error:', err.message);
    }

    await browser.close();
}

traceNetwork().catch(console.error);
