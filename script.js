// LanChat Web v4.0

const ably = new Ably.Realtime("75TknQ.C5wjCA:__3VQaPjaBwnTHpXhXT67kXBHkESR_2ixoRZJhYXQFg");

let currentChannelName = "public-chat";
let channel = ably.channels.get(currentChannelName);
let systemChannel = ably.channels.get("system");

let username = localStorage.getItem("username") || "Guest" + Math.floor(Math.random() * 1000);
localStorage.setItem("username", username);

// System control states
let isLocked = false;
let hintText = "";
let isUpdating = false;

// Channel message storage
let channelLogs = {
    "public-chat": [],
    "private-1": [],
    "private-2": []
};

// DOM elements
const chatDiv = document.getElementById("chat");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const nameInput = document.getElementById("nameInput");
const nameBtn = document.getElementById("nameBtn");
const hintBar = document.getElementById("hintBar");
const lockOverlay = document.getElementById("lockOverlay");
const updateOverlay = document.getElementById("updateOverlay");
const loadingScreen = document.getElementById("loadingScreen");

// Display name prefix
function getDisplayName() {
    return "WEB | " + username;
}

// Render current channel messages
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

// Subscribe to current main channel
function subscribeMainChannel() {
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

// Process admin system commands
function processSystemCommand(msg) {
    const text = msg.data.trim().toLowerCase();

    if (text === "web-lock") {
        isLocked = true;
    } else if (text === "web-unlock") {
        isLocked = false;
    } else if (text.startsWith("hint:")) {
        hintText = msg.data.substring(5).trim();
    } else if (text === "update") {
        isUpdating = true;
    } else if (text === "update-finish") {
        location.reload();
    }

    updateUIState();
}

// Update UI based on current states
function updateUIState() {
    // Priority: updating > locked > normal
    if (isUpdating) {
        updateOverlay.style.display = "flex";
        messageInput.disabled = true;
        sendBtn.disabled = true;
        nameInput.disabled = true;
        nameBtn.disabled = true;
        return;
    }

    updateOverlay.style.display = "none";

    if (isLocked) {
        lockOverlay.style.display = "flex";
        messageInput.disabled = true;
        sendBtn.disabled = true;
        nameInput.disabled = true;
        nameBtn.disabled = true;
    } else {
        lockOverlay.style.display = "none";
        messageInput.disabled = false;
        sendBtn.disabled = false;
        nameInput.disabled = false;
        nameBtn.disabled = false;
    }

    // Hint bar
    if (hintText) {
        hintBar.textContent = hintText;
        hintBar.style.display = "block";
    } else {
        hintBar.style.display = "none";
    }
}

// Setup system channel (fetch history first → apply state → then subscribe)
systemChannel.attach((err) => {
    if (err) {
        console.error("System attach failed:", err);
        loadingScreen.style.display = "none";
        return;
    }

    systemChannel.history({ limit: 100, direction: "backwards" }, (err, page) => {
        if (err) {
            console.error("System history failed:", err);
        } else {
            // Process oldest to newest
            page.items.reverse().forEach(processSystemCommand);
        }

        loadingScreen.style.display = "none";
        updateUIState();

        // Now listen for new system messages
        systemChannel.subscribe("message", processSystemCommand);

        // Start main chat
        subscribeMainChannel();
        renderChat();
    });
});

// Channel switch
window.switchChannel = function(channelName) {
    if (channelName === currentChannelName) return;

    const passwords = {
        "private-1": "smart456",
        "private-2": "yeah200"
    };

    if (passwords[channelName]) {
        const pw = prompt("Enter password for " + channelName + ":");
        if (pw !== passwords[channelName]) {
            alert("Incorrect password.");
            return;
        }
    }

    currentChannelName = channelName;
    subscribeMainChannel();
    renderChat();
    alert("Now in: " + channelName);
};

// Send message
function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || isLocked || isUpdating) return;

    const fullMsg = getDisplayName() + ": " + text;
    messageInput.value = "";

    channel.publish("message", fullMsg).catch(err => console.error("Publish failed:", err));
}

sendBtn.onclick = sendMessage;
messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});

// Change name
nameBtn.onclick = () => {
    const newName = nameInput.value.trim();
    if (!newName || isLocked || isUpdating) return;

    // Simple duplicate check in current channel
    if (channelLogs[currentChannelName].some(m => m.startsWith("WEB | " + newName + ":"))) {
        alert("That name is already used here.");
        return;
    }

    username = newName;
    localStorage.setItem("username", username);
    alert("Name set to: " + username);
};
