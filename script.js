console.log("Multi-Channel Chat Loaded! V4 BETA 7");

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

// ===== LOCK SYSTEM =====
let globalLocked = false;
let lockedChannels = new Set();
let lockMessage = "Under maintenance";

function loadLockState() {
    const savedGlobal = localStorage.getItem('chatGlobalLocked');
    if (savedGlobal !== null) globalLocked = savedGlobal === 'true';

    const savedLocked = localStorage.getItem('chatLockedChannels');
    if (savedLocked) lockedChannels = new Set(JSON.parse(savedLocked));

    const savedMessage = localStorage.getItem('chatLockMessage');
    if (savedMessage) lockMessage = savedMessage;
}

function saveLockState() {
    localStorage.setItem('chatGlobalLocked', globalLocked);
    localStorage.setItem('chatLockedChannels', JSON.stringify([...lockedChannels]));
    localStorage.setItem('chatLockMessage', lockMessage);
}

function updateLockUI() {
    const lockScreen = document.getElementById("lockScreen");
    const chatContainer = document.getElementById("chatContainer");
    const messageEl = lockScreen.querySelector("p");

    if (globalLocked) {
        messageEl.textContent = lockMessage;
        lockScreen.classList.add("show");
        chatContainer.style.display = "none";
    } else {
        lockScreen.classList.remove("show");
        chatContainer.style.display = "flex";
    }
    updateChannelButtons();
}

function updateChannelButtons() {
    document.querySelectorAll('#channels button').forEach(btn => {
        const ch = btn.dataset.channel;
        btn.classList.remove('active', 'locked');

        if (globalLocked || lockedChannels.has(ch)) {
            btn.classList.add('locked');
        } else if (ch === currentChannelName) {
            btn.classList.add('active');
        }
    });
}

// ===== CHANNEL LOGS =====
let channelLogs = {
    "public-chat": [],
    "private-1": [],
    "private-2": []
};

// DOM
const chat = document.getElementById("chat");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const nameInput = document.getElementById("nameInput");
const nameBtn = document.getElementById("nameBtn");

// Notifications
function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }
}

function showSystemNotification(messageText) {
    if (document.visibilityState === "visible") return;
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification("New Message", {
            body: messageText.length > 60 ? messageText.substring(0, 57) + "..." : messageText,
            tag: "chat-message"
        });
    }
}

function getDisplayName() {
    return "WEB | " + username;
}

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

function subscribeToChannel() {
    if (channel) channel.unsubscribe();
    channel = ably.channels.get(currentChannelName);
    channel.subscribe("message", (msg) => {
        const messageText = msg.data;
        channelLogs[currentChannelName].push(messageText);
        renderChannel();
        showSystemNotification(messageText);
    });
}

function subscribeToSystem() {
    systemChannel = ably.channels.get("system");
    systemChannel.subscribe("command", (msg) => {
        const data = msg.data;
        if (data.type === 'globalLock') {
            globalLocked = true;
            if (data.message) lockMessage = data.message;
            saveLockState();
            updateLockUI();
        } else if (data.type === 'globalUnlock') {
            globalLocked = false;
            saveLockState();
            updateLockUI();
        } else if (data.type === 'lockChannel') {
            lockedChannels.add(data.channel);
            saveLockState();
            updateChannelButtons();
            if (currentChannelName === data.channel && !globalLocked) switchChannel("public-chat");
        } else if (data.type === 'unlockChannel') {
            lockedChannels.delete(data.channel);
            saveLockState();
            updateChannelButtons();
        }
    });
}

function broadcastCommand(data) {
    if (systemChannel) systemChannel.publish("command", data);
}

// Command handler
function handleCommand(cmd) {
    if (cmd === '!cmds') {
        console.log("%c📋 Commands - Type like this in console:\n\n" +
                    "!('cmds')                    → Show this list\n" +
                    "!('lock')                    → Lock entire chat\n" +
                    "!('lockmessage Your message here') → Lock with custom message\n" +
                    "!('unlock')                  → Unlock entire chat\n" +
                    "!('lockchannel private-1')   → Lock specific channel\n" +
                    "!('unlockchannel private-1') → Unlock specific channel",
                    "color:#3b82f6; font-family:monospace");
        return;
    }

    if (cmd === '!lock') {
        globalLocked = true;
        lockMessage = "Under maintenance";
        saveLockState();
        broadcastCommand({type: 'globalLock', message: lockMessage});
        updateLockUI();
        console.log("🔒 Entire chat locked");
    } 
    else if (cmd.startsWith('!lockmessage ')) {
        const customMsg = cmd.substring(13).trim();
        if (customMsg) {
            globalLocked = true;
            lockMessage = customMsg;
            saveLockState();
            broadcastCommand({type: 'globalLock', message: lockMessage});
            updateLockUI();
            console.log(`🔒 Chat locked with message: "${customMsg}"`);
        }
    } 
    else if (cmd === '!unlock') {
        globalLocked = false;
        saveLockState();
        broadcastCommand({type: 'globalUnlock'});
        updateLockUI();
        console.log("🔓 Entire chat unlocked");
    } 
    else if (cmd.startsWith('!lockchannel ')) {
        const ch = cmd.split(' ')[1];
        if (ch) {
            lockedChannels.add(ch);
            saveLockState();
            broadcastCommand({type: 'lockChannel', channel: ch});
            updateChannelButtons();
            if (currentChannelName === ch) switchChannel("public-chat");
            console.log(`🔒 Channel ${ch} locked`);
        }
    } 
    else if (cmd.startsWith('!unlockchannel ')) {
        const ch = cmd.split(' ')[1];
        if (ch) {
            lockedChannels.delete(ch);
            saveLockState();
            broadcastCommand({type: 'unlockChannel', channel: ch});
            updateChannelButtons();
            console.log(`🔓 Channel ${ch} unlocked`);
        }
    }
}

// ==================== THE !() FUNCTION YOU WANTED ====================
function !(cmd) {
    if (typeof cmd === "string" && cmd.startsWith('!')) {
        handleCommand(cmd);
    } else {
        console.log("%c❌ Usage example: !('cmds')", "color:#ef4444");
    }
}

// Event listeners
sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
});

nameBtn.addEventListener("click", () => {
    const newName = nameInput.value.trim();
    if (newName) {
        username = newName;
        localStorage.setItem("username", username);
        alert("Name changed to " + username);
    }
});

function switchChannel(newChannel) {
    if (globalLocked) return;
    if (newChannel === currentChannelName) return;
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

function sendMessage() {
    if (globalLocked || lockedChannels.has(currentChannelName)) return;

    const text = messageInput.value.trim();
    if (!text) return;

    const msg = `${getDisplayName()}: ${text}`;
    messageInput.value = "";
    messageInput.focus();

    if (channel) channel.publish("message", msg);
}

// Connection
ably.connection.on("connected", () => {
    console.log("Ably connected!");
    document.getElementById("loadingScreen").style.display = "none";

    loadLockState();
    subscribeToChannel();
    subscribeToSystem();
    renderChannel();
    updateChannelButtons();
    updateLockUI();
    requestNotificationPermission();

    console.log("%c✅ Use !('cmds') in console to see commands", "color:#3b82f6; font-weight:bold");
});

ably.connection.on("failed", (err) => console.error("Connection failed:", err));

// Initial
loadLockState();
document.getElementById("loadingScreen").style.display = "flex";
