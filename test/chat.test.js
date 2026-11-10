const { test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { io: createClient } = require("socket.io-client");
const { createChatServer } = require("../server");

let server;
let address;
let clients = [];

test.beforeEach(async () => {
  ({ server } = createChatServer());
  clients = [];
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  address = `http://127.0.0.1:${server.address().port}`;
});

test.afterEach(async () => {
  for (const client of clients) client.disconnect();
  await new Promise((resolve) => server.close(resolve));
});

function connectClient() {
  const client = createClient(address, { forceNew: true, reconnection: false });
  clients.push(client);
  return once(client, "connect").then(() => client);
}

function nextEvent(client, eventName) {
  return once(client, eventName).then(([payload]) => payload);
}

function nextEventMatching(client, eventName, predicate) {
  return new Promise((resolve) => {
    function onEvent(payload) {
      if (!predicate(payload)) return;
      client.off(eventName, onEvent);
      resolve(payload);
    }
    client.on(eventName, onEvent);
  });
}

test("sirve la interfaz y recursos estáticos", async () => {
  const response = await fetch(address);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /RealTime Chat/);
  const scriptResponse = await fetch(`${address}/js/chat.js`);
  assert.equal(scriptResponse.status, 200);
  assert.match(scriptResponse.headers.get("content-type"), /javascript/);
});

test("valida nombres y rechaza duplicados", async () => {
  const first = await connectClient();
  const joined = nextEvent(first, "user:joined");
  first.emit("user:join", "Ana");
  assert.equal((await joined).username, "Ana");

  const second = await connectClient();
  const duplicateError = nextEvent(second, "user:error");
  second.emit("user:join", "ana");
  assert.match(await duplicateError, /ya está en uso/);

  const invalidError = nextEvent(second, "user:error");
  second.emit("user:join", "x");
  assert.match(await invalidError, /entre 2 y 20 caracteres/);
});

test("retransmite mensajes y el estado de escritura", async () => {
  const first = await connectClient();
  const firstJoined = nextEvent(first, "user:joined");
  first.emit("user:join", "Lucía");
  await firstJoined;

  const second = await connectClient();
  const usersUpdate = nextEvent(first, "users:update");
  const secondJoined = nextEvent(second, "user:joined");
  second.emit("user:join", "Marco");
  await secondJoined;

  assert.deepEqual(await usersUpdate, ["Lucía", "Marco"]);

  const typingUpdate = nextEvent(second, "typing:update");
  first.emit("typing:update", true);
  assert.deepEqual(await typingUpdate, { username: "Lucía", isTyping: true });

  const messageReceived = nextEvent(second, "chat:message");
  first.emit("chat:message", "Hola, equipo");
  const message = await messageReceived;
  assert.equal(message.username, "Lucía");
  assert.equal(message.text, "Hola, equipo");
  assert.equal(message.type, "user");
  assert.ok(message.timestamp);
});

test("retransmite imágenes permitidas y rechaza formatos o tamaños inválidos", async () => {
  const first = await connectClient();
  const firstJoined = nextEvent(first, "user:joined");
  first.emit("user:join", "Rosa");
  await firstJoined;

  const second = await connectClient();
  const secondJoined = nextEvent(second, "user:joined");
  second.emit("user:join", "Luis");
  await secondJoined;

  const invalidImage = {
    type: "image",
    dataUrl: "data:image/svg+xml;base64,PHN2Zy8+",
    caption: "No debe llegar",
  };
  first.emit("chat:message", invalidImage);

  const oversizedPng = Buffer.alloc(1024 * 1024 + 1);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(oversizedPng);
  const validPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=";
  const imageReceived = nextEventMatching(second, "chat:message", (entry) => entry.type === "image");
  first.emit("chat:message", {
    type: "image",
    dataUrl: `data:image/png;base64,${oversizedPng.toString("base64")}`,
    caption: "Tampoco debe llegar",
  });
  first.emit("chat:message", {
    type: "image",
    dataUrl: `data:image/png;base64,${validPng}`,
    caption: "Foto del día",
  });

  const message = await imageReceived;
  assert.equal(message.type, "image");
  assert.equal(message.username, "Rosa");
  assert.equal(message.caption, "Foto del día");
  assert.equal(message.image, `data:image/png;base64,${validPng}`);

  const third = await connectClient();
  const historyResponse = nextEvent(third, "user:joined");
  third.emit("user:join", "Nora");
  const { history } = await historyResponse;
  assert.ok(history.some((entry) => entry.type === "image" && entry.caption === "Foto del día"));
});

test("actualiza participantes cuando alguien se desconecta", async () => {
  const first = await connectClient();
  const firstJoined = nextEvent(first, "user:joined");
  first.emit("user:join", "Sofía");
  await firstJoined;

  const second = await connectClient();
  const joinedUsersUpdate = nextEvent(first, "users:update");
  const secondJoined = nextEvent(second, "user:joined");
  second.emit("user:join", "Diego");
  await secondJoined;
  assert.deepEqual(await joinedUsersUpdate, ["Sofía", "Diego"]);

  const disconnectedUsersUpdate = nextEvent(first, "users:update");
  second.disconnect();
  assert.deepEqual(await disconnectedUsersUpdate, ["Sofía"]);
});
