console.log("Multi-Channel Chat Loaded!");

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
let channel = ably.channels.get(currentChannelName);

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

// ===== ALWAYS USE WEB PREFIX =====
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

    channel.unsubscribe();

    channel.subscribe("message", (msg) => {
        const messageText = msg.data;

        channelLogs[currentChannelName].push(messageText);

        renderChannel();
    });
}

subscribeToChannel();

// ===== SWITCH CHANNEL =====
window.switchChannel = function(newChannel) {

    if (newChannel === currentChannelName) return;

    if (channelPasswords[newChannel]) {
        const entered = prompt("Enter password for this channel:");
        if (entered !== channelPasswords[newChannel]) {
            alert("Wrong password.");
            return;
        }
    }

    currentChannelName = newChannel;
    channel = ably.channels.get(currentChannelName);

    subscribeToChannel();
    renderChannel();

    alert("Switched to: " + newChannel);
};

// ===== SEND MESSAGE =====
function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    const msg = `${getDisplayName()}: ${text}`;

    channel.publish("message", msg)
        .then(() => {
            messageInput.value = "";
        })
        .catch(err => {
            console.error("Send failed:", err);
        });
}

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
