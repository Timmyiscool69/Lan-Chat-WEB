console.log("LanChat Web Loaded!");

// ===== CHANNEL PASSWORDS =====
const channelPasswords = {
    "private-1": "smart456",
    "private-2": "yeah200"
};

// ===== USERNAME =====
let username = localStorage.getItem("username") || "Guest" + Math.floor(Math.random()*1000);
localStorage.setItem("username", username);

// ===== ABLY =====
const ably = new Ably.Realtime('75TknQ.C5wjCA:__3VQaPjaBwnTHpXhXT67kXBHkESR_2ixoRZJhYXQFg');
let currentChannelName = "public-chat";
let channel = ably.channels.get(currentChannelName);

// ===== CHANNEL LOGS =====
let channelLogs = {
    "public-chat": [],
    "private-1": [],
    "private-2": []
};

// DOM
const chat = document.getElementById('chat');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const lockOverlay = document.getElementById('lockOverlay');

// ===== DISPLAY NAME =====
function getDisplayName() {
    return "WEB | " + username;
}

// ===== RENDER CHAT =====
function renderChannel() {
    chat.innerHTML = "";
    channelLogs[currentChannelName].forEach(msg => {
        const div = document.createElement("div");
        div.className = "message";
        div.innerHTML = `<span>${msg}</span><button>X</button>`;
        div.querySelector('button').onclick = () => {
            div.remove();
            channel.publish('delete-message', msg);
        };
        chat.appendChild(div);
    });
    chat.scrollTop = chat.scrollHeight;
}

// ===== SUBSCRIBE =====
function subscribeToChannel() {
    channel.unsubscribe();
    channel.subscribe("message", msg => {
        channelLogs[currentChannelName].push(msg.data);
        renderChannel();
    });
    channel.subscribe("delete-message", msg => {
        const idx = channelLogs[currentChannelName].indexOf(msg.data);
        if(idx !== -1) channelLogs[currentChannelName].splice(idx, 1);
        renderChannel();
    });
    channel.subscribe("lock-web", () => lockOverlay.style.display = "block");
    channel.subscribe("unlock-web", () => lockOverlay.style.display = "none");
}
subscribeToChannel();

// ===== SWITCH CHANNEL =====
function switchChannel(newChannel) {
    if(newChannel === currentChannelName) return;

    if(channelPasswords[newChannel]) {
        const entered = prompt("Enter password:");
        if(entered !== channelPasswords[newChannel]) {
            alert("Wrong password");
            return;
        }
    }

    currentChannelName = newChannel;
    channel = ably.channels.get(currentChannelName);
    subscribeToChannel();
    renderChannel();
    alert("Switched to " + newChannel);
}

// ===== SEND MESSAGE =====
function sendMessage() {
    const text = messageInput.value.trim();
    if(!text) return;
    const msg = `${getDisplayName()}: ${text}`;
    messageInput.value = "";
    messageInput.focus();
    channel.publish("message", msg);
}

sendBtn.onclick = sendMessage;
messageInput.addEventListener("keydown", e => { if(e.key === "Enter") sendMessage(); });

// ===== CHANGE USERNAME =====
window.changeUsername = function(newName) {
    username = newName;
    localStorage.setItem("username", username);
};
