console.log("Multi-Channel Chat Loaded");

let username = localStorage.getItem("username") || 
               "Guest" + Math.floor(Math.random() * 1000);
localStorage.setItem("username", username);

// ===== PASSWORDS =====
const channelPasswords = {
    "private-1": "QSTUV",
    "private-2": "BPLOT"
};

// ===== ABLY SETUP =====
const ably = new Ably.Realtime("75TknQ.C5wjCA:__3VQaPjaBwnTHpXhXT67kXBHkESR_2ixoRZJhYXQFg");

let currentChannelName = "public-chat";
let channel = ably.channels.get(currentChannelName);

// DOM
const chat = document.getElementById("chat");
const messageInput = document.getElementById("messageInput");
const nameInput = document.getElementById("nameInput");
const sendBtn = document.getElementById("sendBtn");
const nameBtn = document.getElementById("nameBtn");

// ===== SUBSCRIBE FUNCTION =====
function subscribeToChannel() {
    channel.subscribe("message", (msg) => {
        const div = document.createElement("div");
        div.classList.add("message");
        div.textContent = msg.data;
        chat.appendChild(div);
        chat.scrollTop = chat.scrollHeight;
    });
}

// Initial subscription
subscribeToChannel();

// ===== SWITCH CHANNEL =====
function switchChannel(newChannel) {

    // Check password if needed
    if (channelPasswords[newChannel]) {
        const entered = prompt("Enter password for this channel:");
        if (entered !== channelPasswords[newChannel]) {
            alert("Wrong password.");
            return;
        }
    }

    // Unsubscribe from old channel
    channel.unsubscribe();

    // Clear chat visually
    chat.innerHTML = "";

    // Switch
    currentChannelName = newChannel;
    channel = ably.channels.get(currentChannelName);

    subscribeToChannel();

    alert("Switched to: " + newChannel);
}

// ===== SEND MESSAGE =====
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

// ===== CHANGE NAME =====
nameBtn.addEventListener("click", () => {
    const newName = nameInput.value.trim();
    if (!newName) return;

    username = newName;
    localStorage.setItem("username", username);
    alert("Name changed to " + username);
});
