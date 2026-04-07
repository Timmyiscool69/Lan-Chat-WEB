console.log("Multi-Channel Chat Loaded! V4 FIX 2");

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
let channel = null;

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

// Request notification permission once
function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }
}

// Show system notification for new messages (only if tab is not active)
function showSystemNotification(messageText) {
    if (document.visibilityState === "visible") return; // Don't notify if user is already viewing

    if ("Notification" in window && Notification.permission === "granted") {
        const notification = new Notification("New Message", {
            body: messageText.length > 60 ? messageText.substring(0, 57) + "..." : messageText,
            icon: "", // You can add an icon URL here if you want
            tag: "chat-message" // prevents duplicate notifications
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    }
}

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
        channelLogs[currentChannelName].push(messageText);
        renderChannel();
        showSystemNotification(messageText);   // ← System notification
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
    // Optional: highlight active button (you can improve this later)
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

    channel.publish("message", msg);
}

// ===== EVENT LISTENERS =====
sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
});

nameBtn.addEventListener("click", () => {
    const newName = nameInput.value.trim();
    if (!newName) return;
    username = newName;
    localStorage.setItem("username", username);
    alert("Name changed to " + username);
});

// ===== CONNECTION HANDLING =====
ably.connection.on("connected", () => {
    console.log("Ably connected!");
    document.getElementById("loadingScreen").style.display = "none";

    // Auto join public-chat on start
    subscribeToChannel();
    renderChannel();
    requestNotificationPermission();
});

ably.connection.on("failed", (err) => {
    console.error("Connection failed:", err);
});

// Initial state
document.getElementById("loadingScreen").style.display = "flex";
