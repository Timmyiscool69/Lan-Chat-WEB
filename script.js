const ably = new Ably.Realtime("75TknQ.C5wjCA:__3VQaPjaBwnTHpXhXT67kXBHkESR_2ixoRZJhYXQFg");
let username = localStorage.getItem("username") || ("Guest" + Math.floor(Math.random()*1000));
localStorage.setItem("username", username);

let channel = ably.channels.get("public-chat");

const chat = document.getElementById("chat");
const hintDiv = document.getElementById("hint");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const nameInput = document.getElementById("nameInput");
const nameBtn = document.getElementById("nameBtn");
const overlay = document.getElementById("overlay");
const overlayText = document.getElementById("overlay-text");

function renderMessage(msgText) {
    const div = document.createElement("div");
    div.textContent = msgText;
    div.className = "message";
    if(msgText.startsWith("SYSTEM |")) div.classList.add("SYSTEM");
    if(msgText.startsWith("HINT |")) div.classList.add("HINT");
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

// Listen for messages
channel.subscribe("message", msg => {
    const text = msg.data;
    if(text.startsWith("HINT |")){
        hintDiv.textContent = text.replace("HINT | ","");
    } else if(text.startsWith("SYSTEM | WEB_LOCK | LOCKED")){
        overlayText.textContent = "Locked by admin!";
        overlay.style.display = "flex";
    } else if(text.startsWith("SYSTEM | WEB_LOCK | UNLOCKED")){
        overlay.style.display = "none";
    } else {
        renderMessage(text);
    }
});

// Send message
function sendMessage(){
    if(overlay.style.display === "flex") return; // locked
    const msg = `WEB | ${username}: ${messageInput.value}`;
    channel.publish("message", msg);
    messageInput.value = "";
}
sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keydown", e => { if(e.key==="Enter") sendMessage(); });

// Change name
nameBtn.addEventListener("click", () => {
    const newName = nameInput.value.trim();
    if(newName){ username=newName; localStorage.setItem("username", username); }
});
