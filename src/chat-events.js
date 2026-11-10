const MAX_MESSAGE_LENGTH = 500;
const MAX_HISTORY = 100;
const MAX_IMAGE_BYTES = 1024 * 1024;
const MAX_HISTORY_BYTES = 12 * 1024 * 1024;
const USERNAME_PATTERN = /^[\p{L}\p{N}_ -]{2,20}$/u;

function parseImageDataUrl(dataUrl) {
  if (typeof dataUrl !== "string" || dataUrl.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 128) {
    return null;
  }

  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) return null;

  const [, mimeType, encoded] = match;
  const data = Buffer.from(encoded, "base64");
  if (
    data.length === 0
    || data.length > MAX_IMAGE_BYTES
    || data.toString("base64") !== encoded
  ) {
    return null;
  }

  const isPng = mimeType === "image/png"
    && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isJpeg = mimeType === "image/jpeg"
    && data[0] === 255
    && data[1] === 216
    && data[data.length - 2] === 255
    && data[data.length - 1] === 217;
  const isWebp = mimeType === "image/webp"
    && data.toString("ascii", 0, 4) === "RIFF"
    && data.toString("ascii", 8, 12) === "WEBP";

  return isPng || isJpeg || isWebp ? { dataUrl, mimeType, byteLength: data.length } : null;
}

function registerChatEvents(io) {
  const participants = new Map();
  const messages = [];
  let historyBytes = 0;

  function getUsers() {
    return [...participants.values()].map(({ username }) => username);
  }

  function publishUsers() {
    io.emit("users:update", getUsers());
  }

  function storeMessage(message) {
    messages.push(message);
    historyBytes += Buffer.byteLength(JSON.stringify(message));
    while (messages.length > MAX_HISTORY || historyBytes > MAX_HISTORY_BYTES) {
      const removed = messages.shift();
      historyBytes -= Buffer.byteLength(JSON.stringify(removed));
    }
  }

  function publishSystemMessage(text) {
    const message = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: "system",
      text,
      timestamp: new Date().toISOString(),
    };
    storeMessage(message);
    io.emit("chat:message", message);
  }

  io.on("connection", (socket) => {
    socket.on("user:join", (value) => {
      if (participants.has(socket.id)) return;

      const username = typeof value === "string" ? value.trim() : "";
      if (!USERNAME_PATTERN.test(username)) {
        socket.emit("user:error", "El nombre debe tener entre 2 y 20 caracteres (letras, números, espacios, guion o guion bajo).");
        return;
      }

      const isTaken = [...participants.values()].some(
        (participant) => participant.username.toLocaleLowerCase() === username.toLocaleLowerCase(),
      );
      if (isTaken) {
        socket.emit("user:error", "Ese nombre ya está en uso. Elige otro.");
        return;
      }

      participants.set(socket.id, { username });
      socket.emit("user:joined", { username, history: messages });
      publishUsers();
      publishSystemMessage(`${username} se ha unido al chat.`);
    });

    socket.on("chat:message", (value) => {
      const participant = participants.get(socket.id);
      if (!participant) return;

      let message;
      if (typeof value === "string") {
        const text = value.trim();
        if (!text || text.length > MAX_MESSAGE_LENGTH) return;
        message = { type: "user", text };
      } else if (value && typeof value === "object" && value.type === "image") {
        const image = parseImageDataUrl(value.dataUrl);
        const caption = typeof value.caption === "string" ? value.caption.trim() : "";
        if (!image || caption.length > MAX_MESSAGE_LENGTH) return;
        message = { type: "image", image: image.dataUrl, caption };
      } else {
        return;
      }

      const chatMessage = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        username: participant.username,
        timestamp: new Date().toISOString(),
        ...message,
      };
      storeMessage(chatMessage);
      socket.broadcast.emit("typing:update", { username: participant.username, isTyping: false });
      io.emit("chat:message", chatMessage);
    });

    socket.on("typing:update", (isTyping) => {
      const participant = participants.get(socket.id);
      if (!participant || typeof isTyping !== "boolean") return;

      socket.broadcast.emit("typing:update", {
        username: participant.username,
        isTyping,
      });
    });

    socket.on("disconnect", () => {
      const participant = participants.get(socket.id);
      if (!participant) return;

      participants.delete(socket.id);
      socket.broadcast.emit("typing:update", { username: participant.username, isTyping: false });
      publishUsers();
      publishSystemMessage(`${participant.username} ha salido del chat.`);
    });
  });
}

module.exports = { registerChatEvents };
