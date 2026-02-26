console.log("Multi-Channel Chat Loaded! V3.6 HOTFIX");

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
const ably = new Ably.Realtime("75TknQ.C5wjCA:__3VQaPjaBwnTHpXhXT67kXBHkESR_2ixoRZJhYXQFg");

let currentChannelName = "public-chat";
let channel = null;  // Start null, set after connect

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

// Fallback status element (won't show unless you add <div id="status"> in HTML)
const statusEl = document.getElementById("status") || document.createElement("div");

// ===== DISPLAY NAME =====
function getDisplayName() {
    return "WEB | " + username;
}

// ===== RENDER CHAT =====
function renderChannel() {
    chat.innerHTML = "";
    channelLogs[currentChannelName].forEach(msg => {
        const div = document.createElement("div");
        div.classList.add("message");
        div.textContent = msg;
        chat.appendChild(div);
    });
    chat.scrollTop = chat.scrollHeight;
}

// ===== SUBSCRIBE =====
function subscribeToChannel() {
    if (channel) channel.unsubscribe();
    channel = ably.channels.get(currentChannelName);
    channel.subscribe("message", (msg) => {
        const messageText = msg.data;
        // Removed includes() check → allows duplicate/repeated messages
        channelLogs[currentChannelName].push(messageText);
        renderChannel();
    });
    console.log(`Subscribed to ${currentChannelName}`);
}

// ===== SWITCH CHANNEL =====
function switchChannel(newChannel) {
    if (newChannel === currentChannelName) return;
    if (channelPasswords[newChannel]) {
        const entered = prompt("Enter password for this channel:");
        if (entered !== channelPasswords[newChannel]) {
            alert("Wrong password.");
            return;
        }
    }
    currentChannelName = newChannel;
    subscribeToChannel();
    renderChannel();
    alert("Switched to: " + newChannel);
}

// ===== SEND MESSAGE =====
function sendMessage() {
    if (!channel) {
        console.warn("Cannot send: not connected yet");
        return;
    }
    const text = messageInput.value.trim();
    if (!text) return;
    const msg = `${getDisplayName()}: ${text}`;
    messageInput.value = "";
    messageInput.focus();
    channel.publish("message", msg);  // No .then/.catch – old Ably version doesn't support it
}

// ===== EVENT LISTENERS =====
sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
});

// ===== CHANGE NAME =====
nameBtn.addEventListener("click", () => {
    const newName = nameInput.value.trim();
    if (!newName) return;
    username = newName;
    localStorage.setItem("username", username);
    alert("Name changed to " + username);
});

// ===== CONNECTION HANDLING – THIS FIXES THE LOADING SCREEN =====
ably.connection.on("connecting", () => {
    statusEl.textContent = "Connecting...";
});

ably.connection.on("connected", () => {
    console.log("Ably connected!");
    // Hide loader, show chat
    document.getElementById("loadingScreen").style.display = "none";
    document.querySelector(".chat-container").style.display = "block";  // or "flex" if your CSS needs it
    subscribeToChannel();
    renderChannel();  // Show any cached messages (though usually empty at start)
});

ably.connection.on("failed", (err) => {
    console.error("Connection failed:", err);
    statusEl.textContent = "Connection failed – check console";
    // Optional: keep loader or show error in UI
});

ably.connection.on("disconnected", () => {
    console.log("Disconnected");
    // Optional: show loader again or status
});

// Initial state
statusEl.textContent = "Connecting...";
