console.log("Multi-Channel Chat Loaded! V3 FIX 2");

// ===== PASSWORDS =====
const channelPasswords = {
    "private-1": "smart456",
    "private-2": "yeah200"
};

// ===== USERNAME =====
let username = localStorage.getItem("username") ||
               "Guest" + Math.floor(Math.random() * 1000);
localStorage.setItem("username", username);

// ===== ABLY =====
const ABLY_KEY = "75TknQ.C5wjCA:__3VQaPjaBwnTHpXhXT67kXBHkESR_2ixoRZJhYXQFg"; // Consider moving to env var later
const ably = new Ably.Realtime(ABLY_KEY);

let currentChannelName = "public-chat";
let channel = null; // Will be set after connection

// ===== CHANNEL LOG STORAGE =====
let channelLogs = {
    "public-chat": [],
    "private-1": [],
    "private-2": []
};

// DOM
const chat = document.getElementById("chat");
const messageInput = document.getElementById("messageInput");
const nameInput = document.getElementById("nameInput");
const sendBtn = document.getElementById("sendBtn");
const nameBtn = document.getElementById("nameBtn");

// Assume you have a status element — add this to index.html if missing:
// <div id="status" style="color: #666; text-align: center; padding: 20px;">Connecting to chat...</div>
const statusEl = document.getElementById("status") || document.createElement("div");

// ===== DISPLAY NAME =====
function getDisplayName() {
    return "WEB | " + username;
}

// ===== RENDER CHAT =====
function renderChannel() {
    chat.innerHTML = "";
    (channelLogs[currentChannelName] || []).forEach(msg => {
        const div = document.createElement("div");
        div.classList.add("message");
        div.textContent = msg;
        chat.appendChild(div);
    });
    chat.scrollTop = chat.scrollHeight;
}

// ===== SUBSCRIBE TO CHANNEL =====
function subscribeToChannel() {
    if (channel) {
        channel.unsubscribe();
    }
    channel = ably.channels.get(currentChannelName);

    channel.subscribe("message", (msg) => {
        const messageText = msg.data;
        if (!channelLogs[currentChannelName].includes(messageText)) {
            channelLogs[currentChannelName].push(messageText);
            renderChannel();
        }
    });

    console.log(`Subscribed to channel: ${currentChannelName}`);
}

// ===== SWITCH CHANNEL =====
window.switchChannel = function(newChannel) {
    if (newChannel === currentChannelName) return;

    // Check password for private channels
    if (channelPasswords[newChannel]) {
        const entered = prompt("Enter password for " + newChannel + ":");
        if (entered !== channelPasswords[newChannel]) {
            alert("Wrong password!");
            return;
        }
    }

    currentChannelName = newChannel;
    subscribeToChannel();
    renderChannel();
    alert("Switched to: " + newChannel);
};

// ===== SEND MESSAGE =====
function sendMessage() {
    if (!channel) {
        alert("Not connected yet — please wait.");
        return;
    }
    const text = messageInput.value.trim();
    if (!text) return;

    const msg = `${getDisplayName()}: ${text}`;
    messageInput.value = "";
    messageInput.focus();

    channel.publish("message", msg)
        .then(() => console.log("Message sent"))
        .catch(err => {
            console.error("Send failed:", err);
            alert("Failed to send message: " + err.message);
        });
}

sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// ===== CHANGE NAME =====
nameBtn.addEventListener("click", () => {
    const newName = nameInput.value.trim();
    if (!newName) return;

    // Simple duplicate check (not perfect, but ok for now)
    for (let ch in channelLogs) {
        if (channelLogs[ch].some(m => m.startsWith("WEB | " + newName + ":"))) {
            alert("That username is already in use in some channel!");
            return;
        }
    }

    username = newName;
    localStorage.setItem("username", username);
    alert("Name changed to " + username);
});

// ===== CONNECTION HANDLING =====
ably.connection.on("connected", () => {
    console.log("Ably connected!");
    statusEl.textContent = "Connected!";   // ← if you still have statusEl
    statusEl.style.color = "green";

    // NEW: Hide loading screen and show the actual chat
    document.getElementById("loadingScreen").style.display = "none";
    document.querySelector(".chat-container").style.display = "block";

    // Optional: brief "Connected!" flash (remove if unwanted)
    // setTimeout(() => { document.getElementById("loadingScreen").style.display = "none"; }, 1500);

    subscribeToChannel();
    renderChannel();
});

ably.connection.on("failed", (err) => {
    console.error("Ably connection failed:", err);
    statusEl.textContent = "Connection failed: " + (err.reason?.message || "Unknown error");
    statusEl.style.color = "red";
});

ably.connection.on("disconnected", () => {
    console.log("Ably disconnected");
    statusEl.textContent = "Disconnected — reconnecting...";
    statusEl.style.color = "orange";
});

ably.connection.on("connecting", () => {
    statusEl.textContent = "Connecting...";
    statusEl.style.color = "#666";
});

// Initial state
statusEl.textContent = "Connecting...";
