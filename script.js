console.log("Multi-Channel Chat Loaded! V4 Attempting final 2");

// ==================== SENSITIVE CONFIG ====================
const ABLY_API_KEY = "75TknQ.C5wjCA:__3VQaPjaBwnTHpXhXT67kXBHkESR_2ixoRZJhYXQFg";

const channelPasswords = {
    "private-1": "smart456",
    "private-2": "yeah200"
};

// ==================== VARIABLES ====================
let username = localStorage.getItem("username") || "Guest" + Math.floor(Math.random() * 1000);
localStorage.setItem("username", username);

let currentChannelName = "public-chat";
let channel = null;
let systemChannel = null;

// Lock state (server-side only)
let globalLocked = false;
let lockedChannels = new Set();
let lockMessage = " ";

// Ably
const ably = new Ably.Realtime(ABLY_API_KEY);

// DOM
const chat = document.getElementById("chat");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const nameInput = document.getElementById("nameInput");
const nameBtn = document.getElementById("nameBtn");

// ==================== SERVER PERSISTENT LOCK ====================
async function saveLockToServer() {
    if (!systemChannel) return;
    const state = {
        globalLocked: globalLocked,
        lockedChannels: Array.from(lockedChannels),
        lockMessage: lockMessage,
        timestamp: Date.now()
    };
    try {
        await systemChannel.publish("lockState", state);
    } catch (e) {
        console.warn("Failed to save lock to server", e);
    }
}

async function loadLockFromServer() {
    if (!systemChannel) return;
    try {
        const history = await systemChannel.history.get({ limit: 1, direction: "backward" });
        if (history.items.length > 0) {
            const latest = history.items[0].data;
            if (latest && typeof latest === "object") {
                globalLocked = !!latest.globalLocked;
                lockedChannels = new Set(latest.lockedChannels || []);
                if (latest.lockMessage) lockMessage = latest.lockMessage;
            }
        }
    } catch (e) {
        console.warn("No previous lock state found on server");
    }
}

// Update UI
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

// ==================== CHAT FUNCTIONS ====================
let channelLogs = {
    "public-chat": [],
    "private-1": [],
    "private-2": []
};

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
        channelLogs[currentChannelName].push(msg.data);
        renderChannel();
        showSystemNotification(msg.data);
    });
}

function subscribeToSystem() {
    systemChannel = ably.channels.get("system");

    // Listen for lock updates
    systemChannel.subscribe("lockUpdate", (msg) => {
        const data = msg.data;
        globalLocked = data.globalLocked;
        lockedChannels = new Set(data.lockedChannels || []);
        if (data.lockMessage) lockMessage = data.lockMessage;
        updateLockUI();
    });

    // Load latest lock state when connecting
    loadLockFromServer().then(() => {
        updateLockUI();
    });
}

function broadcastLockUpdate() {
    if (!systemChannel) return;
    const data = {
        globalLocked: globalLocked,
        lockedChannels: Array.from(lockedChannels),
        lockMessage: lockMessage
    };
    systemChannel.publish("lockUpdate", data);
    saveLockToServer();
}

function handleCommand(cmd) {
    if (cmd === '!cmds') {
        console.log("%c📋 Commands:\n" +
                    "cmd('!cmds')                    → Show this list\n" +
                    "cmd('!lock')                    → Lock entire chat\n" +
                    "cmd('!lockmessage Your text')   → Lock with custom message\n" +
                    "cmd('!unlock')                  → Unlock entire chat\n" +
                    "cmd('!lockchannel private-1')   → Lock specific channel\n" +
                    "cmd('!unlockchannel private-1') → Unlock specific channel",
                    "color:#3b82f6; font-family:monospace");
        return;
    }

    if (cmd === '!lock') {
        globalLocked = true;
        lockMessage = " ";
        broadcastLockUpdate();
        updateLockUI();
        console.log("🔒 Entire chat locked");
    } 
    else if (cmd.startsWith('!lockmessage ')) {
        const customMsg = cmd.substring(13).trim();
        if (customMsg) {
            globalLocked = true;
            lockMessage = customMsg;
            broadcastLockUpdate();
            updateLockUI();
            console.log(`🔒 Chat locked with message: "${customMsg}"`);
        }
    } 
    else if (cmd === '!unlock') {
        globalLocked = false;
        broadcastLockUpdate();
        updateLockUI();
        console.log("🔓 Entire chat unlocked");
    } 
    else if (cmd.startsWith('!lockchannel ')) {
        const ch = cmd.split(' ')[1];
        if (ch) {
            lockedChannels.add(ch);
            broadcastLockUpdate();
            updateChannelButtons();
            if (currentChannelName === ch) switchChannel("public-chat");
            console.log(`🔒 Channel ${ch} locked`);
        }
    } 
    else if (cmd.startsWith('!unlockchannel ')) {
        const ch = cmd.split(' ')[1];
        if (ch) {
            lockedChannels.delete(ch);
            broadcastLockUpdate();
            updateChannelButtons();
            console.log(`🔓 Channel ${ch} unlocked`);
        }
    }
}

window.cmd = function(input) {
    if (typeof input === "string" && input.startsWith('!')) {
        handleCommand(input);
        return;
    }
    console.log("%c❌ Usage: cmd('!cmds')", "color:#ef4444");
};

// Notifications
function showSystemNotification(messageText) {
    if (document.visibilityState === "visible") return;
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification("New Message", {
            body: messageText.length > 60 ? messageText.substring(0, 57) + "..." : messageText,
            tag: "chat-message"
        });
    }
}

// Send & Switch
function sendMessage() {
    if (globalLocked || lockedChannels.has(currentChannelName)) return;

    const text = messageInput.value.trim();
    if (!text) return;

    const msg = `${getDisplayName()}: ${text}`;
    messageInput.value = "";
    messageInput.focus();

    if (channel) channel.publish("message", msg);
}

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

// Event listeners
sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
});

nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") changeName();
});

nameBtn.addEventListener("click", changeName);

function changeName() {
    const newName = nameInput.value.trim();
    if (newName) {
        username = newName;
        localStorage.setItem("username", username);
        alert("Name changed to " + username);
        nameInput.value = "";
    }
}

// Connection
ably.connection.on("connected", () => {
    console.log("Ably connected!");
    document.getElementById("loadingScreen").style.display = "none";

    subscribeToChannel();
    subscribeToSystem();
    renderChannel();
    updateChannelButtons();
    updateLockUI();

});

ably.connection.on("failed", (err) => console.error("Connection failed:", err));

// Initial
document.getElementById("loadingScreen").style.display = "flex";
