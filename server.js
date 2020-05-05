"use strict";
const Tradfri = require('ikea-tradfri');
const tradfri = new Tradfri("192.168.2.100", { identity: 'tradfri_1588265367445', psk: 'BOPf31s84zcJZC28' });
let group;
tradfri.connect().then(() => group = tradfri.group("TRADFRI group"));
const fs = require('fs');
require('uWebSockets.js').App({})
    .ws('/*', {
        /* Options */
        compression: 1,
        maxPayloadLength: 16 * 1024 * 1024,
        idleTimeout: 3600000,
        /* Handlers */
        open: (ws, req) => {
            console.log('A WebSocket connected via URL: ' + req.getUrl() + '!');
        },
        message: async (ws, message, isBinary) => {
            if (Buffer.from(message).toString() === "ping")
                return;
            /* Ok is false if backpressure was built up, wait for drain */

            /*console.log(isBinary);
            console.log(bufToStr(message));
            console.log(new Uint8Array(message));*/
            if (!isBinary) {
                message = Buffer.from(message).toString();
                let json = false;
                try {
                    message = JSON.parse(message);
                    json = true;
                } catch (e) {
                    json = false;
                }
                if (json)
                    switch (message["type"]) {
                        case "level":
                            group.setLevel(message["level"]);
                            break;
                        case "switch":
                            group.switch(message["switch"]);
                            break;
                    }
            }
        }, drain: (ws) => {
            console.log('WebSocket backpressure: ' + ws.getBufferedAmount());
        }, close: (ws, code, message) => {
            console.log('WebSocket closed');
        }
    }).any('/*', (res, req) => {
        let data;
        if (req.getUrl() == "/")
            data = fs.readFileSync('./static/index.html');
        else
            try {
                data = fs.readFileSync('./static' + req.getUrl());
                if (req.getUrl().endsWith("css"))
                    res.writeHeader("Content-Type", "text/css");
            } catch (error) {
                data = error.message;
            }
        if (data == null) {
            res.end("nö");
        }
        res.end(data);
        //res.end(global["index"]);
    }).listen(8000, (token) => {
        if (token) {
            console.log('Listening to port ' + 8000);
        } else {
            console.log('Failed to listen to port ' + 8000);
        }
    });