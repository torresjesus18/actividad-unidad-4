const socket = io();
const elements = {
  attachButton: document.querySelector("#attach-button"),
  avatarStack: document.querySelector("#avatar-stack"),
  characterCount: document.querySelector("#character-count"),
  connectionDot: document.querySelector("#connection-dot"),
  connectionLabel: document.querySelector("#connection-label"),
  headerUserCount: document.querySelector("#header-user-count"),
  joinDialog: document.querySelector("#join-dialog"),
  joinError: document.querySelector("#join-error"),
  joinForm: document.querySelector("#join-form"),
  imageInput: document.querySelector("#image-input"),
  imagePreview: document.querySelector("#image-preview"),
  imagePreviewName: document.querySelector("#image-preview-name"),
  imagePreviewThumbnail: document.querySelector("#image-preview-thumbnail"),
  messageArea: document.querySelector("#message-area"),
  messageForm: document.querySelector("#message-form"),
  messageInput: document.querySelector("#message-input"),
  messages: document.querySelector("#messages"),
  mobileUsers: document.querySelector("#mobile-users"),
  profileAvatar: document.querySelector("#profile-avatar"),
  profileName: document.querySelector("#profile-name"),
  removeImageButton: document.querySelector("#remove-image-button"),
  sendButton: document.querySelector("#send-button"),
  toast: document.querySelector("#toast"),
  typingLine: document.querySelector("#typing-line"),
  userCount: document.querySelector("#user-count"),
  userList: document.querySelector("#user-list"),
  usernameInput: document.querySelector("#username-input"),
  welcomeBlock: document.querySelector("#welcome-block"),
  leaveButton: document.querySelector("#leave-button"),
};
let currentUsername = sessionStorage.getItem("realtime-chat-username") || "";
let toastTimer;
let typingTimer;
let selectedImage = null;
let imagePreviewUrl = null;
const typingUsers = new Set();
const MAX_IMAGE_BYTES = 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function getInitials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove("is-visible"), 3500);
}

function setConnected(isConnected) {
  elements.connectionDot.classList.toggle("is-connected", isConnected);
  elements.connectionDot.classList.toggle("is-disconnected", !isConnected);
  elements.connectionLabel.textContent = isConnected ? "Conectado" : "Desconectado";
  if (!isConnected) {
    elements.messageInput.disabled = true;
    elements.sendButton.disabled = true;
    elements.attachButton.disabled = true;
  }
  if (!isConnected && currentUsername) showToast("Se perdió la conexión. Intentando reconectar...");
}

function renderUsers(users) {
  elements.userCount.textContent = String(users.length);
  elements.headerUserCount.textContent = `${users.length} conectado${users.length === 1 ? "" : "s"}`;
  elements.userList.replaceChildren();
  elements.avatarStack.replaceChildren();
  elements.mobileUsers.replaceChildren();

  users.forEach((username, index) => {
    const item = document.createElement("li");
    item.className = "user-item";
    const avatar = document.createElement("span");
    avatar.className = "avatar";
    avatar.textContent = getInitials(username);
    avatar.setAttribute("aria-hidden", "true");
    const name = document.createElement("span");
    name.className = "user-item-name";
    name.textContent = username === currentUsername ? `${username} (tú)` : username;
    const dot = document.createElement("span");
    dot.className = "online-dot";
    item.append(avatar, name, dot);
    elements.userList.append(item);

    if (index < 4) {
      const stackAvatar = avatar.cloneNode(true);
      stackAvatar.title = username;
      elements.avatarStack.append(stackAvatar);
    }
    if (index < 5) {
      const mobileAvatar = avatar.cloneNode(true);
      mobileAvatar.title = username;
      elements.mobileUsers.append(mobileAvatar);
    }
  });

  if (users.length > 4) {
    const overflow = document.createElement("span");
    overflow.className = "avatar-overflow";
    overflow.textContent = `+${users.length - 4}`;
    elements.avatarStack.append(overflow);
  }
  const mobileLabel = document.createElement("span");
  mobileLabel.textContent = `${users.length} conectado${users.length === 1 ? "" : "s"}`;
  elements.mobileUsers.append(mobileLabel);
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function scrollToLatest() {
  requestAnimationFrame(() => {
    elements.messageArea.scrollTop = elements.messageArea.scrollHeight;
  });
}

function clearSelectedImage() {
  selectedImage = null;
  elements.imageInput.value = "";
  elements.imagePreview.hidden = true;
  elements.imagePreviewThumbnail.removeAttribute("src");
  elements.imagePreviewName.textContent = "";
  if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
  imagePreviewUrl = null;
}

function selectImage(file) {
  if (!file) return;
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    elements.imageInput.value = "";
    showToast("Elige una imagen JPG, PNG o WebP.");
    return;
  }
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    elements.imageInput.value = "";
    showToast("La imagen debe pesar menos de 1 MB.");
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    if (typeof reader.result !== "string") {
      showToast("No se pudo leer la imagen seleccionada.");
      return;
    }
    clearSelectedImage();
    selectedImage = { dataUrl: reader.result, name: file.name };
    imagePreviewUrl = URL.createObjectURL(file);
    elements.imagePreviewThumbnail.src = imagePreviewUrl;
    elements.imagePreviewName.textContent = file.name;
    elements.imagePreview.hidden = false;
  });
  reader.addEventListener("error", () => {
    elements.imageInput.value = "";
    showToast("No se pudo leer la imagen seleccionada.");
  });
  reader.readAsDataURL(file);
}

function appendMessage(message) {
  elements.welcomeBlock.hidden = true;
  if (message.type === "system") {
    const system = document.createElement("div");
    system.className = "system-message";
    system.textContent = message.text;
    elements.messages.append(system);
  } else {
    const row = document.createElement("article");
    row.className = `message-row${message.username === currentUsername ? " own" : ""}`;
    const avatar = document.createElement("span");
    avatar.className = "avatar";
    avatar.textContent = getInitials(message.username);
    avatar.setAttribute("aria-hidden", "true");
    const content = document.createElement("div");
    content.className = "message-content";
    const meta = document.createElement("div");
    meta.className = "message-meta";
    const author = document.createElement("span");
    author.className = "message-author";
    author.textContent = message.username;
    const time = document.createElement("time");
    time.className = "message-time";
    time.dateTime = message.timestamp;
    time.textContent = formatTime(message.timestamp);
    meta.append(author, time);
    if (message.type === "image" && typeof message.image === "string") {
      const image = document.createElement("img");
      image.className = "message-image";
      image.src = message.image;
      image.alt = `Imagen compartida por ${message.username}`;
      image.loading = "lazy";
      image.addEventListener("load", scrollToLatest, { once: true });
      content.append(meta, image);
      if (message.caption) {
        const caption = document.createElement("p");
        caption.className = "message-text image-caption";
        caption.textContent = message.caption;
        content.append(caption);
      }
    } else {
      const text = document.createElement("p");
      text.className = "message-text";
      text.textContent = message.text;
      content.append(meta, text);
    }
    row.append(avatar, content);
    elements.messages.append(row);
  }
  scrollToLatest();
}

function updateTypingLabel() {
  const names = [...typingUsers];
  if (!names.length) {
    elements.typingLine.textContent = "";
  } else if (names.length === 1) {
    elements.typingLine.textContent = `${names[0]} está escribiendo...`;
  } else {
    elements.typingLine.textContent = "Varias personas están escribiendo...";
  }
}

socket.on("connect", () => {
  setConnected(true);
  if (currentUsername) socket.emit("user:join", currentUsername);
  else if (!elements.joinDialog.open) elements.joinDialog.showModal();
});

socket.on("disconnect", () => setConnected(false));

socket.on("connect_error", () => {
  setConnected(false);
  showToast("No fue posible conectar con el servidor. Comprueba que esté iniciado.");
});

socket.on("user:joined", ({ username, history }) => {
  currentUsername = username;
  sessionStorage.setItem("realtime-chat-username", username);
  elements.profileName.textContent = username;
  elements.profileAvatar.textContent = getInitials(username);
  elements.messageInput.disabled = false;
  elements.sendButton.disabled = false;
  elements.attachButton.disabled = false;
  elements.imageInput.disabled = false;
  elements.joinError.textContent = "";
  if (elements.joinDialog.open) elements.joinDialog.close();
  history.forEach(appendMessage);
  elements.messageInput.focus();
});

socket.on("user:error", (message) => {
  currentUsername = "";
  sessionStorage.removeItem("realtime-chat-username");
  elements.joinError.textContent = message;
  if (!elements.joinDialog.open) elements.joinDialog.showModal();
  elements.usernameInput.focus();
});

socket.on("users:update", renderUsers);
socket.on("chat:message", appendMessage);
socket.on("typing:update", ({ username, isTyping }) => {
  if (username === currentUsername) return;
  if (isTyping) typingUsers.add(username);
  else typingUsers.delete(username);
  updateTypingLabel();
});

elements.joinForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const username = elements.usernameInput.value.trim();
  if (!username) {
    elements.joinError.textContent = "Escribe un nombre para continuar.";
    return;
  }
  socket.emit("user:join", username);
});

elements.messageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = elements.messageInput.value.trim();
  if ((!text && !selectedImage) || !currentUsername || !socket.connected) return;
  if (selectedImage) {
    socket.emit("chat:message", {
      type: "image",
      dataUrl: selectedImage.dataUrl,
      caption: text,
    });
    clearSelectedImage();
  } else {
    socket.emit("chat:message", text);
  }
  elements.messageInput.value = "";
  elements.characterCount.textContent = "0 / 500";
  socket.emit("typing:update", false);
  clearTimeout(typingTimer);
});

elements.attachButton.addEventListener("click", () => elements.imageInput.click());
elements.imageInput.addEventListener("change", () => selectImage(elements.imageInput.files[0]));
elements.removeImageButton.addEventListener("click", clearSelectedImage);

elements.messageInput.addEventListener("input", () => {
  elements.characterCount.textContent = `${elements.messageInput.value.length} / 500`;
  if (!currentUsername || !socket.connected) return;
  socket.emit("typing:update", Boolean(elements.messageInput.value.trim()));
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => socket.emit("typing:update", false), 1400);
});

elements.leaveButton.addEventListener("click", () => {
  if (!currentUsername) return;
  socket.disconnect();
  currentUsername = "";
  sessionStorage.removeItem("realtime-chat-username");
  elements.profileName.textContent = "Invitado";
  elements.profileAvatar.textContent = "?";
  elements.messageInput.disabled = true;
  elements.sendButton.disabled = true;
  elements.attachButton.disabled = true;
  elements.imageInput.disabled = true;
  clearSelectedImage();
  elements.userList.replaceChildren();
  renderUsers([]);
  elements.messages.replaceChildren();
  elements.welcomeBlock.hidden = false;
  elements.joinDialog.showModal();
  socket.connect();
});
