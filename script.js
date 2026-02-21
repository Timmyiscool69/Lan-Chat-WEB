console.log("Web Chat Script Loaded");

// Get stored username or generate one
let username = localStorage.getItem("username") || "Guest" + Math.floor(Math.random() * 1000);
localStorage.setItem("username", username);

let showNotifications = true;

// ===== Ably Realtime Client with clientId =====
const ably = new Ably.Realtime({ 
    key: "75TknQ.C5wjCA:__3VQaPjaBwnTHpXhXT67kXBHkESR_2ixoRZJhYXQFg",
    clientId: username
});

const channel = ably.channels.get("chat");

// DOM Elements
const chat = document.getElementById("chat");
const messageInput = document.getElementById("messageInput");
const nameInput = document.getElementById("nameInput");
const sendBtn = document.getElementById("sendBtn");
const nameBtn = document.getElementById("nameBtn");
const onlineCount = document.getElementById("onlineCount");
const typingIndicator = document.getElementById("typingIndicator");
const loadingScreen = document.getElementById("loadingScreen");
const chatContainer = document.querySelector(".chat-container");

let typingUsers = new Set();
let typingTimeout;

// ===== Notifications =====
if ("Notification" in window) {
    Notification.requestPermission().then(permission => {
        if (permission !== "granted") showNotifications = false;
    });
}

// ===== Connection =====
ably.connection.on("connected", async () => {
    console.log("Connected to Ably ✅");
    loadingScreen.style.display = "none";
    chatContainer.style.display = "flex";

    // Enter presence
    try {
        await channel.presence.enter(username);
        updateOnlineCount();
    } catch (err) {
        console.error("Failed to enter presence", err);
    }
});

// ===== Online Count =====
async function updateOnlineCount() {
    try {
        const members = await channel.presence.get();
        onlineCount.textContent = "Online: " + members.length;
    } catch (err) {
        console.warn("Presence not ready yet", err);
    }
}

// Subscribe to presence updates
channel.presence.subscribe(() => {
    updateOnlineCount();
});

// ===== Send Message =====
function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    const msg = `${username}: ${text}`;
    channel.publish("message", msg);
    messageInput.value = "";
}

sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
});

// ===== Receive Messages =====
channel.subscribe("message", (msg) => {
    const div = document.createElement("div");
    div.classList.add("message");
    div.textContent = msg.data;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;

    // Show notification if tab not focused
    if (showNotifications && "Notification" in window && document.hidden) {
        new Notification("New Message", {
            body: msg.data,
            icon: "https://img.icons8.com/color/48/000000/chat--v1.png"
        });
    }
});

// ===== Change Name =====
nameBtn.addEventListener("click", () => {
    const newName = nameInput.value.trim();
    if (!newName) return;

    username = newName;
    localStorage.setItem("username", username);
    alert("Name changed to " + username);

    // Update Ably clientId requires reconnecting
    ably.close();
    window.location.reload();
});

// ===== Typing System =====
messageInput.addEventListener("input", () => {
    channel.publish("typing", username);

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        channel.publish("typing", "");
    }, 2000);
});

channel.subscribe("typing", (msg) => {
    const name = msg.data;

    if (!name) {
        typingUsers.clear();
        updateTypingIndicator();
        return;
    }

    if (name !== username) {
        typingUsers.add(name);

        // Remove after 2s automatically
        setTimeout(() => {
            typingUsers.delete(name);
            updateTypingIndicator();
        }, 2000);

        updateTypingIndicator();
    }
});

function updateTypingIndicator() {
    const count = typingUsers.size;

    if (count === 0) {
        typingIndicator.textContent = "";
    } else if (count === 1) {
        typingIndicator.textContent = "Someone is typing...";
    } else if (count === 2) {
        typingIndicator.textContent = "2 people are typing...";
    } else {
        typingIndicator.textContent = "3+ people are typing...";
    }
}
