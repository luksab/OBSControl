function ab2b64(buffer) {
    var binary = '';
    var bytes = new Uint8Array(buffer);
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function str2ab(string, callback) {
    var bb = new BlobBuilder();
    bb.append(string);
    var f = new FileReader();
    f.onload = function (e) {
        callback(e.target.result);
    }
    f.readAsArrayBuffer(bb.getBlob());
}
function str2ab(str) {
    var buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
    var bufView = new Uint16Array(buf);
    for (var i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}


class OBSws {
    constructor(address) {
        this.address = address;

        this.callbacks = {};
        this.sends = {};
        this.currentScene = "";
        this.sceneList = [];
        this.connect();
    }
    connect() {
        this.ws = new WebSocket(this.address);
        var that = this;
        this.ws.onopen = function () {
            if (that.resolve)
                that.resolve();
            that.send("GetAuthRequired").then(function (msg) {
                if (msg.authRequired) {
                    var password = window.prompt("password", "a");

                    var auth = b64_sha256(b64_sha256(password + msg.salt) + msg.challenge)

                    return that.send('Authenticate', { auth: auth }).then(function (msg) {
                        if (msg.status !== "ok")
                            return that.connect();
                        that.send("SetHeartbeat", { "enable": false });
                        that.send("GetSceneList").then(function (msg) {
                            that.currentScene = msg["current-scene"];
                            that.sceneList = msg["scenes"]
                        });
                        if (that.callbacks["ConnectionOpened"])
                            for (var callback of that.callbacks["ConnectionOpened"]) {
                                callback();
                            }
                    });
                }
            })
        }

        this.ws.onclose = function (e) {
            if (e.reason !== "") {
                console.log('Socket is closed. Reconnect will be attempted in 1 second.', e.reason);
                setTimeout(function () {
                    that.connect();
                }, 1000);
            }
        };

        this.ws.onerror = function (err) {
            console.error('Socket encountered error: ', err.message, 'Closing socket');
            ws.close();
        };

        this.ws.onmessage = function (message) {
            var msg = JSON.parse(message.data);
            console.log(msg)
            if (that.callbacks[msg["update-type"]])
                for (var callback of that.callbacks[msg["update-type"]]) {
                    callback(msg);
                }
            else if (that.sends[msg["message-id"]]) {
                that.sends[msg["message-id"]](msg);
            }
        };

        return new Promise(function (resolve, reject) {
            try {
                that.resolve = resolve;
            } catch (e) {
                reject(e);
            }
        })
    }
    on(type, callback) {
        if (this.callbacks[type] == null)
            this.callbacks[type] = [];
        this.callbacks[type].push(callback);
    }
    send(type, options) {
        var that = this;
        if (this.ws.readyState === WebSocket.OPEN)
            return new Promise(function (resolve, reject) {
                try {
                    var mid = Math.random().toString(36).substring(7);
                    console.log("sending", Object.assign({ "request-type": type, "message-id": mid }, options));
                    that.ws.send(JSON.stringify(Object.assign({ "request-type": type, "message-id": mid }, options)));
                    that.sends[mid] = resolve;
                } catch (e) {
                    reject(e);
                }
            })
        else
            return new Promise(function (resolve, reject) {
                that.connect().then(function () {
                    var mid = Math.random().toString(36).substring(7);
                    console.log("sending", Object.assign({ "request-type": type, "message-id": mid }, options));
                    that.ws.send(JSON.stringify(Object.assign({ "request-type": type, "message-id": mid }, options)));
                    that.sends[mid] = resolve;
                });
            })
    }
}