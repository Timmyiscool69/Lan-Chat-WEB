

console.log("LanChat Web starting... DEBUG MODE ACTIVE!!");

const ably = new Ably.Realtime("75TknQ.C5wjCA:__3VQaPjaBwnTHpXhXT67kXBHkESR_2ixoRZJhYXQFg");

let currentChannelName = "public-chat";
let channel = ably.channels.get(currentChannelName);
let systemChannel = ably.channels.get("system");

let username = localStorage.getItem("username") || "Guest" + Math.floor(Math.random() * 1000);
localStorage.setItem("username", username);

// System states
let isLocked = false;
let hintText = "";
let isUpdating = false;

// Logs
let channelLogs = {
    "public-chat": [],
    "private-1": [],
    "private-2": []
};

// DOM
const chatDiv = document.getElementById("chat");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const nameInput = document.getElementById("nameInput");
const nameBtn = document.getElementById("nameBtn");
const hintBar = document.getElementById("hintBar");
const lockOverlay = document.getElementById("lockOverlay");
const updateOverlay = document.getElementById("updateOverlay");
const loadingScreen = document.getElementById("loadingScreen");

// Force hide loading after 10s as safety net
setTimeout(() => {
    if (loadingScreen.style.display !== "none") {
        console.warn("FORCE HIDING LOADING SCREEN - system channel likely failed");
        loadingScreen.style.display = "none";
        alert("Connection to control system timed out. Chat is loading anyway (admin features like lock/hint may not work). Check console for errors.");
    }
}, 10000);

// Display name
function getDisplayName() {
    return "WEB | " + username;
}

// Render messages
function renderChat() {
    chatDiv.innerHTML = "";
    (channelLogs[currentChannelName] || []).forEach(msg => {
        const div = document.createElement("div");
        div.className = "message";
        div.textContent = msg;
        chatDiv.appendChild(div);
    });
    chatDiv.scrollTop = chatDiv.scrollHeight;
}

// Subscribe main channel
function subscribeMainChannel() {
    console.log("Subscribing to main channel:", currentChannelName);
    if (channel) channel.unsubscribe();
    channel = ably.channels.get(currentChannelName);

    channel.subscribe("message", (msg) => {
        const text = msg.data;
        if (!channelLogs[currentChannelName].includes(text)) {
            channelLogs[currentChannelName].push(text);
            renderChat();
        }
    });
}

// Process admin command
function processSystemCommand(msg) {
    console.log("System message received:", msg.data);
    const text = msg.data.trim().toLowerCase();

    if (text === "web-lock") isLocked = true;
    else if (text === "web-unlock") isLocked = false;
    else if (text.startsWith("hint:")) hintText = msg.data.substring(5).trim();
    else if (text === "update") isUpdating = true;
    else if (text === "update-finish") location.reload();

    updateUIState();
}

// UI update
function updateUIState() {
    if (isUpdating) {
        updateOverlay.style.display = "flex";
        messageInput.disabled = sendBtn.disabled = nameInput.disabled = nameBtn.disabled = true;
        return;
    }
    updateOverlay.style.display = "none";

    if (isLocked) {
        lockOverlay.style.display = "flex";
        messageInput.disabled = sendBtn.disabled = nameInput.disabled = nameBtn.disabled = true;
    } else {
        lockOverlay.style.display = "none";
        messageInput.disabled = sendBtn.disabled = nameInput.disabled = nameBtn.disabled = false;
    }

    hintBar.textContent = hintText;
    hintBar.style.display = hintText ? "block" : "none";
}

// System channel setup with FULL error handling
console.log("Attaching to system channel...");
systemChannel.attach((err) => {
    if (err) {
        console.error("SYSTEM ATTACH FAILED:", err.code, err.message, err);
        alert("Failed to connect to admin control channel: " + (err.message || "Unknown error") + " (code: " + (err.code || "?") + "). Chat loading without admin features.");
        loadingScreen.style.display = "none";
        subscribeMainChannel();
        renderChat();
        return;
    }

    console.log("System channel attached OK");

    systemChannel.history({ limit: 100, direction: "backwards" }, (err, page) => {
        if (err) {
            console.error("SYSTEM HISTORY FAILED:", err.code, err.message, err);
            alert("Couldn't load admin history: " + (err.message || "Unknown") + ". Admin features may be incomplete.");
        } else {
            console.log("History loaded:", page.items.length, "messages");
            page.items.reverse().forEach(processSystemCommand);
        }

        loadingScreen.style.display = "none";
        updateUIState();

        systemChannel.subscribe("message", processSystemCommand);
        console.log("Now listening for new system messages");

        // Start main chat
        subscribeMainChannel();
        renderChat();
    });
});

// Channel switch (unchanged)
window.switchChannel = function(channelName) {
    if (channelName === currentChannelName) return;

    const passwords = { "private-1": "smart456", "private-2": "yeah200" };

    if (passwords[channelName]) {
        const pw = prompt("Password for " + channelName + ":");
        if (pw !== passwords[channelName]) {
            alert("Wrong password.");
            return;
        }
    }

    currentChannelName = channelName;
    subscribeMainChannel();
    renderChat();
    alert("Switched to: " + channelName);
};

// Send
function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || isLocked || isUpdating) return;

    const fullMsg = getDisplayName() + ": " + text;
    messageInput.value = "";

    channel.publish("message", fullMsg).catch(err => console.error("Send failed:", err));
}

sendBtn.onclick = sendMessage;
messageInput.addEventListener("keypress", e => { if (e.key === "Enter") sendMessage(); });

// Name change
nameBtn.onclick = () => {
    const newName = nameInput.value.trim();
    if (!newName || isLocked || isUpdating) return;

    if (channelLogs[currentChannelName].some(m => m.startsWith("WEB | " + newName + ":"))) {
        alert("Name already used here.");
        return;
    }

    username = newName;
    localStorage.setItem("username", username);
    alert("Name set to: " + username);
};
