import { io } from 'socket.io-client';
import fetch from 'node-fetch';

async function testWebSocket() {
    console.log("Testing WebSocket to PumaBroker...");

    // NOTE: This cookie would normally come from the user's logged in browser
    const demoCookie = "TrademasterTempCookieForNode";

    const socket = io('https://node.pumabroker.com', {
        transports: ['websocket'],
        auth: { cookie: demoCookie },
        withCredentials: true,
    });

    socket.on('connect', () => {
        console.log("Connected to WS successfully! ID:", socket.id);
        console.log("Sending get_serverdata map...");
        socket.emit('get_serverdata', { action: 'get_serverdata' });
    });

    socket.on('userdata_result', (data) => {
        console.log("Got userdata_result:", data);
        socket.disconnect();
    });

    socket.on('connect_error', (err) => {
        console.error("Connection Error:", err.message);
        socket.disconnect();
    });

    setTimeout(() => {
        console.log("Timeout reached.");
        socket.disconnect();
    }, 5000);
}

testWebSocket();
