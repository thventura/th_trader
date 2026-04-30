import { io } from 'socket.io-client';

async function testExecuteLot() {
    console.log("Testing WebSocket execution to PumaBroker...");

    const demoCookie = "TrademasterTempCookieForNode";

    const socket = io('https://node.pumabroker.com', {
        transports: ['websocket'],
        auth: { cookie: demoCookie },
        withCredentials: true,
    });

    socket.on('connect', () => {
        console.log("Connected to WS successfully! ID:", socket.id);
        console.log("Sending add_lot to BTC/USD (ID 91)...");

        const payload = {
            form: {
                trend: 'down',
                lot: 10,
                currency_id: 91,
                binarytime: 60,
                x: 500,
                y: 400
            }
        };

        socket.emit('add_lot', payload);
    });

    socket.on('add_lot_result', (data) => {
        console.log("Got add_lot_result:", data);
        socket.disconnect();
    });

    socket.on('connect_error', (err) => {
        console.error("Connection Error:", err.message);
        socket.disconnect();
    });

    socket.on('error', (err) => {
        console.error("Generic Error:", err);
    });

    setTimeout(() => {
        console.log("Timeout reached.");
        socket.disconnect();
    }, 10000);
}

testExecuteLot();
