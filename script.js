console.log("Script loaded");

const ably = new Ably.Realtime({
    key: "75TknQ.C5wjCA:__3VQaPjaBwnTHpXhXT67kXBHkESR_2ixoRZJhYXQFg",
    clientId: "client-" + Math.floor(Math.random() * 1000)
});

ably.connection.on("connected", () => {
    console.log("Connected to Ably ✅");
});

ably.connection.on("failed", (err) => {
    console.error("Connection failed ❌", err);
});

const channel = ably.channels.get("global-chat");

let username = "Guest" + Math.floor(Math.random() * 1000);

const chat = document.getElementById("chat");
const messageInput = document.getElementById("messageInput");
const nameInput = document.getElementById("nameInput");
const sendBtn = document.getElementById("sendBtn");
const nameBtn = document.getElementById("nameBtn");

sendBtn.addEventListener("click", sendMessage);
nameBtn.addEventListener("click", changeName);

messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        sendMessage();
    }
});

function sendMessage() {
    const text = messageInput.value.trim();
    if (text === "") return;

    channel.publish("message", {
        name: username,
        text: text,
        time: new Date().toLocaleTimeString()
    });

    messageInput.value = "";
}

function changeName() {
    const newName = nameInput.value.trim();
    if (newName !== "") {
        username = newName;
        alert("Name changed to " + username);
    }
}

channel.subscribe("message", (msg) => {
    const div = document.createElement("div");
    div.innerText = `[${msg.data.time}] ${msg.data.name}: ${msg.data.text}`;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
});
