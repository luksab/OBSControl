var sceneListDiv;
var sourceListDiv;
var studioMode = true;
var obsWS;
var ws;
var sliderPos;
var lastTime = Date.now() / 1000;

var padding = 10;

function addButtons(buttons, sceneListDiv) {
    sceneListDiv.innerHTML = "";
    //var sceneListDiv = document.getElementById("site");
    var size = Math.sqrt((sceneListDiv.clientWidth * sceneListDiv.clientHeight) / buttons.length);
    var cols = Math.round(sceneListDiv.clientWidth / size);
    var rows = Math.ceil(buttons.length / cols);
    size = Math.floor(Math.min(sceneListDiv.clientWidth / cols, sceneListDiv.clientHeight / rows)) - padding;
    for (var button of buttons) {
        button.style.width = size + "px";
        button.style.height = size + "px";
        sceneListDiv.appendChild(button);
        button.className = "square";
    }

    window.addEventListener('resize', function () {
        //var sceneListDiv = document.getElementById("site");
        var size = Math.sqrt((sceneListDiv.clientWidth * sceneListDiv.clientHeight) / this.buttons.length);
        var cols = Math.round(sceneListDiv.clientWidth / size);
        var rows = Math.ceil(this.buttons.length / cols);
        size = Math.floor(Math.min(sceneListDiv.clientWidth / cols, sceneListDiv.clientHeight / rows)) - padding;
        for (var button of this.buttons) {
            button.style.width = size + "px";
            button.style.height = size + "px";
            sceneListDiv.appendChild(button);
            button.className = "square";
        }
    }.bind({ buttons: buttons }))
}

function addButton(buttons, text, options) {
    var sceneElement = document.createElement('div');
    sceneElement.name = text;
    if (options.color) {
        sceneElement.style.fill = options.color;
        sceneElement.color = options.color;
    }

    sceneElement.innerHTML = `
        <svg viewBox="0 0 70 18">
            <text x="0" y="15">`+ text + `</text>
        </svg>
        `;
    //sceneElement.textContent = scene.name;
    sceneElement.onclick = options.onclick;
    buttons.push(sceneElement);
}


window.onload = function () {
    sceneListDiv = document.getElementById('scene_list');
    sourceListDiv = document.getElementById('source_list');

    document.getElementById('address_button').addEventListener('click', function (e) {
        if (obsWS != null && obsWS.ws.readyState === WebSocket.OPEN) {
            console.log("disconnecting");
            ws.close();
            sceneListDiv.innerHTML = "";
            sourceListDiv.innerHTML = "";
            this.innerHTML = "Connect";
            obsWS.ws.close();
            return;
        }
        console.log("connecting");
        obsWS = new OBSws(document.getElementById('address').value)

        function connect() {
            console.log("asdf");
            if (ws)
                ws.close()
            //ws = null;
            ws = new WebSocket("ws://192.168.2.253:8000/");
            ws.onclose = function (e) {
                if (e.reason !== "") {
                    console.log('Socket is closed. Reconnect will be attempted in 1 second.', e.reason);
                    setTimeout(function () {
                        connect();
                    }, 1000);
                }
            };
        }
        connect();
        //that = this;
        setInterval(function () {
            if (sliderPos !== document.getElementById("lampRange").value && ws.readyState === WebSocket.OPEN) {
                sliderPos = document.getElementById("lampRange").value;
                ws.send(JSON.stringify({ type: "level", level: document.getElementById("lampRange").value }));
            } else if(ws.readyState === WebSocket.CLOSED){
                connect();
            }
        }, 500)

        this.innerHTML = "Disconnect";
        obsWS.on('StudioModeSwitched', function (data) {
            studioMode = data["new-state"];
        })

        obsWS.on('ConnectionOpened', function () {
            var clickFunction = function () {
                if (studioMode)
                    obsWS.send('SetPreviewScene', {
                        'scene-name': this.name
                    });
                else
                    obsWS.send('SetCurrentScene', {
                        'scene-name': this.name
                    });
            };
            obsWS.send('GetSceneList').then(function (data) {
                buttons = [];
                data.scenes.forEach(function (scene) {
                    console.log(scene);
                    if (scene.name === data["current-scene"])
                        addButton(buttons, scene.name, { color: "red", onclick: clickFunction });
                    else
                        addButton(buttons, scene.name, { onclick: clickFunction });
                });

                addButton(buttons, "⇆", {
                    onclick: function () {
                        if (studioMode)
                            obsWS.send('TransitionToProgram');
                    }
                });

                /*addButton(buttons, "StudioMode", {
                    onclick: function () {
                        obsWS.studioMode ? obsWS.send('DisableStudioMode') : obsWS.send('EnableStudioMode');
                    }
                });*/

                addButtons(buttons, sceneListDiv);
            });
            obsWS.send("GetStudioModeStatus").then(function (data) {
                studioMode = data["studio-mode"];
            })
            obsWS.send("GetCurrentScene").then(function (data) {
                buttons = [];
                for (var source of data.sources) {
                    addButton(buttons, source.name, {
                        onclick: function () {
                            var state = false;
                            for (var i in sourceListDiv.childNodes) {
                                if (typeof sourceListDiv.childNodes[i].style === "object") {
                                    var ele = sourceListDiv.childNodes[i];
                                    if (ele.innerText.replace("\n", "") === this.name && ele.color === "red")
                                        state = true;
                                }
                            }
                            obsWS.send('SetSceneItemProperties', { item: this.name, visible: state }).then(function (e) { console.log(e) });
                        }.bind(source), color: source.render ? "green" : "red"
                    });
                }
                addButtons(buttons, sourceListDiv);
            })
        });

        obsWS.on("SwitchScenes", function (data) {
            console.log("scene switched to " + data["scene-name"]);
            for (var i in sceneListDiv.childNodes) {
                if (typeof sceneListDiv.childNodes[i].style === "object") {
                    var ele = sceneListDiv.childNodes[i];
                    console.log(ele);
                    if (ele.color === "red") {
                        ele.style.fill = "#000000";
                        ele.color = "black";
                    }

                    if (ele.innerText.replace("\n", "") === data["scene-name"]) {
                        ele.color = "red";
                        ele.style.fill = "red";
                    }

                }
            }

            buttons = [];
            for (var source of data.sources) {
                addButton(buttons, source.name, {
                    onclick: function () {
                        var state = false;
                        for (var i in sourceListDiv.childNodes) {
                            if (typeof sourceListDiv.childNodes[i].style === "object") {
                                var ele = sourceListDiv.childNodes[i];
                                if (ele.innerText.replace("\n", "") === this.name && ele.color === "red")
                                    state = true;
                            }
                        }
                        obsWS.send('SetSceneItemProperties', { item: this.name, visible: state }).then(function (e) { console.log(e) });
                    }.bind(source), color: source.render ? "green" : "red"
                });
            }
            addButtons(buttons, sourceListDiv);
        })

        obsWS.on("PreviewSceneChanged", function (data) {
            console.log("Preview scene switched");
            for (var i in sceneListDiv.childNodes) {
                if (typeof sceneListDiv.childNodes[i].style === "object") {
                    var ele = sceneListDiv.childNodes[i];
                    if (ele.color === "green") {
                        ele.color = "black";
                        ele.style.fill = "black";
                    }

                    if (ele.innerText.replace("\n", "") === data["scene-name"]) {
                        ele.style.fill = "green";
                        ele.color = "green";
                    }

                }
            }
        })
        obsWS.on("SceneItemVisibilityChanged", function (data) {
            console.log("Preview scene switched");
            for (var i in sourceListDiv.childNodes) {
                if (typeof sourceListDiv.childNodes[i].style === "object") {
                    var ele = sourceListDiv.childNodes[i];
                    if (ele.innerText.replace("\n", "") == data["item-name"]) {
                        ele.style.fill = data["item-visible"] ? "green" : "red";
                        ele.color = data["item-visible"] ? "green" : "red";
                    }

                }
            }
        })
    });
}