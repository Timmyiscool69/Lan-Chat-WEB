console.log("Script loaded");

const ably = new Ably.Realtime({
    key: "75TknQ.C5wjCA:__3VQaPjaBwnTHpXhXT67kXBHkESR_2ixoRZJhYXQFg",
    clientId: "test-client-" + Math.floor(Math.random() * 1000)
});

ably.connection.on('connected', () => {
    console.log("Connected to Ably ✅");
});

ably.connection.on('failed', (err) => {
    console.error("Connection failed ❌", err);
});

const channel = ably.channels.get("global-chat");

let username = "Guest" + Math.floor(Math.random() * 1000);

function changeName() {
    console.log("Change name clicked");
    const newName = document.getElementById("nameInput").value;
    if (newName) {
        username = newName;
        alert("Name changed to " + username);
    }
}

function sendMessage() {
    console.log("Send clicked");
    const input = document.getElementById("messageInput");
    const message = input.value;

    if (message.trim() !== "") {
        channel.publish("message", {
            name: username,
            text: message
        }).then(() => {
            console.log("Message sent ✅");
        }).catch(err => {
            console.error("Publish failed ❌", err);
        });

        input.value = "";
    }
}

channel.subscribe("message", (msg) => {
    console.log("Message received:", msg.data);
});
