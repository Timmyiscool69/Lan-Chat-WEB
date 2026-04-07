console.log("Multi-Channel Chat Loaded! V4 Finished test 1");

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
let systemChannel = null;

// ===== LOCK SYSTEM (persists on refresh) =====
let globalLocked = false;
let lockedChannels = new Set();

// Load saved lock state from localStorage
function loadLockState() {
    const savedGlobal = localStorage.getItem('chatGlobalLocked');
    if (savedGlobal !== null) globalLocked = savedGlobal === 'true';

    const savedLocked = localStorage.getItem('chatLockedChannels');
    if (savedLocked) {
        lockedChannels = new Set(JSON.parse(savedLocked));
    }
}

// Save lock state
function saveLockState() {
    localStorage.setItem('chatGlobalLocked', globalLocked);
    localStorage.setItem('chatLockedChannels', JSON.stringify([...lockedChannels]));
}

// Update channel button colours + active state
function updateChannelButtons() {
    document.querySelectorAll('#channels button').forEach(btn => {
        const ch = btn.dataset.channel;
        btn.classList.remove('active', 'locked');

        // Selected = bright blue
        if (ch === currentChannelName) btn.classList.add('active');

        // Locked = grey
        if (lockedChannels.has(ch)) btn.classList.add('locked');
    });
}

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

// ===== NOTIFICATIONS =====
function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }
}

function showSystemNotification(messageText) {
    if (document.visibilityState === "visible") return;
    if ("Notification" in window && Notification.permission === "granted") {
        const notification = new Notification("New Message", {
            body: messageText.length > 60 ? messageText.substring(0, 57) + "..." : messageText,
            tag: "chat-message"
        });
        notification.onclick = () => { window.focus(); notification.close(); };
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

// ===== SUBSCRIBE TO NORMAL CHANNEL =====
function subscribeToChannel() {
    if (channel) channel.unsubscribe();
    channel = ably.channels.get(currentChannelName);
    channel.subscribe("message", (msg) => {
        const messageText = msg.data;
        channelLogs[currentChannelName].push(messageText);
        renderChannel();
        showSystemNotification(messageText);
    });
    console.log(`Subscribed to ${currentChannelName}`);
}

// ===== SYSTEM CHANNEL (hidden - for commands) =====
function subscribeToSystem() {
    systemChannel = ably.channels.get("system");
    systemChannel.subscribe("command", (msg) => {
        const data = msg.data;
        applyCommand(data);
    });
    console.log("Subscribed to hidden system channel");
}

// Apply command locally (no re-broadcast)
function applyCommand(data) {
    if (data.type === 'globalLock') {
        globalLocked = true;
        saveLockState();
        updateChannelButtons();
        console.log("🔒 Global chat was locked by another user");
    }
    else if (data.type === 'globalUnlock') {
        globalLocked = false;
        saveLockState();
        updateChannelButtons();
        console.log("🔓 Global chat was unlocked");
    }
    else if (data.type === 'lockChannel') {
        lockedChannels.add(data.channel);
        saveLockState();
        updateChannelButtons();
        console.log(`🔒 Channel ${data.channel} locked`);
        // If we are currently in the locked channel → auto-switch to public
        if (currentChannelName === data.channel) {
            switchChannel("public-chat");
        }
    }
    else if (data.type === 'unlockChannel') {
        lockedChannels.delete(data.channel);
        saveLockState();
        updateChannelButtons();
        console.log(`🔓 Channel ${data.channel} unlocked`);
    }
}

// Broadcast command to everyone via hidden system channel
function broadcastCommand(data) {
    if (systemChannel) {
        systemChannel.publish("command", data);
    }
}

// Handle command string (from chat input or console)
function handleCommand(cmdStr) {
    const cmd = cmdStr.trim().toLowerCase();

    if (cmd === '!cmds') {
        console.log("%c📋 Available commands:\n" +
                    "!lock                → Lock entire chat (everyone)\n" +
                    "!unlock              → Unlock entire chat\n" +
                    "!lockchannel <name>  → Lock a specific channel\n" +
                    "!unlockchannel <name>→ Unlock a specific channel\n" +
                    "!cmds                → Show this list",
                    "color:#3b82f6; font-family:monospace");
        return;
    }

    if (cmd === '!lock') {
        globalLocked = true;
        saveLockState();
        broadcastCommand({type: 'globalLock'});
        updateChannelButtons();
        console.log("🔒 You locked the entire chat");
    }
    else if (cmd === '!unlock') {
        globalLocked = false;
        saveLockState();
        broadcastCommand({type: 'globalUnlock'});
        updateChannelButtons();
        console.log("🔓 You unlocked the entire chat");
    }
    else if (cmd.startsWith('!lockchannel ')) {
        const channelName = cmd.split(' ')[1];
        if (!channelName) return console.error("Usage: !lockchannel private-1");
        lockedChannels.add(channelName);
        saveLockState();
        broadcastCommand({type: 'lockChannel', channel: channelName});
        updateChannelButtons();
        if (currentChannelName === channelName) switchChannel("public-chat");
        console.log(`🔒 You locked channel: ${channelName}`);
    }
    else if (cmd.startsWith('!unlockchannel ')) {
        const channelName = cmd.split(' ')[1];
        if (!channelName) return console.error("Usage: !unlockchannel private-1");
        lockedChannels.delete(channelName);
        saveLockState();
        broadcastCommand({type: 'unlockChannel', channel: channelName});
        updateChannelButtons();
        console.log(`🔓 You unlocked channel: ${channelName}`);
    }
}

// ===== SWITCH CHANNEL =====
function switchChannel(newChannel) {
    if (newChannel === currentChannelName) return;

    // Can't switch to a locked channel (except if global lock is off)
    if (lockedChannels.has(newChannel)) {
        alert("This channel is locked.");
        return;
    }

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
    updateChannelButtons();
}

// ===== SEND MESSAGE =====
function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    // Global lock check
    if (globalLocked) {
        alert("The entire chat is currently locked.");
        messageInput.value = "";
        return;
    }

    // Per-channel lock check
    if (lockedChannels.has(currentChannelName)) {
        alert("This channel is locked.");
        messageInput.value = "";
        return;
    }

    // === COMMAND DETECTION (hidden via system channel) ===
    if (text.startsWith('!')) {
        handleCommand(text);
        messageInput.value = "";
        messageInput.focus();
        return;
    }

    // Normal message
    const msg = `${getDisplayName()}: ${text}`;
    messageInput.value = "";
    messageInput.focus();

    if (channel) channel.publish("message", msg);
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

// ===== CONSOLE COMMAND HELPER (type in F12 console) =====
window.chatCommand = function(command) {
    if (!command || !command.startsWith('!')) {
        console.log("%c❌ Use commands that start with ! (example: chatCommand('!cmds'))", "color:#ef4444");
        return;
    }
    handleCommand(command);
};
console.log("%c✅ Chat commands ready! In the console (F12) type: chatCommand('!cmds')", "color:#3b82f6; font-weight:bold");

// ===== CONNECTION HANDLING =====
ably.connection.on("connected", () => {
    console.log("Ably connected!");
    document.getElementById("loadingScreen").style.display = "none";

    loadLockState();                    // Load persisted lock state
    subscribeToChannel();               // Join public-chat automatically
    subscribeToSystem();                // Hidden system channel for commands
    renderChannel();
    updateChannelButtons();             // Highlight Public + apply any locks
    requestNotificationPermission();

    // If public was locked somehow, stay on it (but can't send)
});

ably.connection.on("failed", (err) => {
    console.error("Connection failed:", err);
});

// Initial state
loadLockState();
document.getElementById("loadingScreen").style.display = "flex";
