console.log("Web Chat Script Loaded");

// Replace with your Ably API key
const ably = new Ably.Realtime("75TknQ.C5wjCA:__3VQaPjaBwnTHpXhXT67kXBHkESR_2ixoRZJhYXQFg");
const channel = ably.channels.get("chat"); // Must match .NET app

let username = localStorage.getItem("username") || "Guest" + Math.floor(Math.random() * 1000);
let showNotifications = true; // default notifications on

const chat = document.getElementById("chat");
const messageInput = document.getElementById("messageInput");
const nameInput = document.getElementById("nameInput");
const sendBtn = document.getElementById("sendBtn");
const nameBtn = document.getElementById("nameBtn");

const loadingScreen = document.getElementById("loadingScreen");
const chatContainer = document.querySelector(".chat-container");

// Request notification permission
if ("Notification" in window) {
    Notification.requestPermission().then(permission => {
        if (permission !== "granted") {
            showNotifications = false;
        }
    });
}

// Wait for Ably connection
ably.connection.on("connected", () => {
    console.log("Connected to Ably ✅");
    loadingScreen.style.display = "none";
    chatContainer.style.display = "flex";
});

// Send message in plain string format so .NET can read
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

// Change username
function changeName() {
    const newName = nameInput.value.trim();
    if (!newName) return;
    username = newName;
    localStorage.setItem("username", username);
    alert("Name changed to " + username);
}

nameBtn.addEventListener("click", changeName);

// Subscribe to messages
channel.subscribe("message", (msg) => {
    const div = document.createElement("div");
    div.classList.add("message");
    div.textContent = msg.data; // plain string for .NET compatibility
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;

    // Web notification for new message
    if (showNotifications && "Notification" in window && document.hidden) {
        new Notification("New Message", {
            body: msg.data,
            icon: "https://img.icons8.com/color/48/000000/chat--v1.png" // optional icon
        });
    }
});
