// Connect to Ably
const ably = new Ably.Realtime("75TknQ.C5wjCA:__3VQaPjaBwnTHpXhXT67kXBHkESR_2ixoRZJhYXQFg");
const channel = ably.channels.get("global-chat");

// Load saved username
let username = localStorage.getItem("username") || 
               "Guest" + Math.floor(Math.random() * 1000);

// Ask notification permission
if (Notification.permission !== "granted") {
    Notification.requestPermission();
}

function changeName() {
    const newName = document.getElementById("nameInput").value.trim();
    if (newName) {
        username = newName;
        localStorage.setItem("username", username);
        alert("Name changed to " + username);
    }
}

function sendMessage() {
    const input = document.getElementById("messageInput");
    const message = input.value.trim();

    if (message !== "") {
        channel.publish("message", {
            name: username,
            text: message,
            time: new Date().toLocaleTimeString()
        });

        input.value = "";
    }
}

// Send with Enter key
document.getElementById("messageInput").addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
        sendMessage();
    }
});

// Listen for messages
channel.subscribe("message", (msg) => {
    const chat = document.getElementById("chat");

    const messageDiv = document.createElement("div");
    messageDiv.innerText = `[${msg.data.time}] ${msg.data.name}: ${msg.data.text}`;

    chat.appendChild(messageDiv);
    chat.scrollTop = chat.scrollHeight;

    // Show notification if tab not focused
    if (document.hidden && Notification.permission === "granted") {
        new Notification(msg.data.name, {
            body: msg.data.text
        });
    }
});
