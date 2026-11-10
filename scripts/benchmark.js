const { once } = require("node:events");
const { performance } = require("node:perf_hooks");
const { io: createClient } = require("socket.io-client");
const { createChatServer } = require("../server");

function parseArgument(name, defaultValue, maximum) {
  const argument = process.argv.find((value) => value.startsWith(`--${name}=`));
  const value = argument ? Number(argument.split("=")[1]) : defaultValue;
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    throw new Error(`--${name} debe ser un entero entre 1 y ${maximum}.`);
  }
  return value;
}

function waitForUserMessage(client) {
  return new Promise((resolve) => {
    function onMessage(message) {
      if (message.type !== "user") return;
      client.off("chat:message", onMessage);
      resolve(performance.now());
    }
    client.on("chat:message", onMessage);
  });
}

function percentile(values, percentileValue) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil((percentileValue / 100) * sorted.length) - 1];
}

async function runLoadTest() {
  const clientCount = parseArgument("clients", 10, 100);
  const messageCount = parseArgument("messages", 20, 1000);
  const { server, io } = createChatServer();
  const clients = [];

  try {
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = `http://127.0.0.1:${server.address().port}`;

    for (let index = 0; index < clientCount; index += 1) {
      const client = createClient(address, { forceNew: true, reconnection: false });
      clients.push(client);
    }
    await Promise.all(clients.map((client) => once(client, "connect")));

    await Promise.all(clients.map((client, index) => {
      const joined = once(client, "user:joined");
      client.emit("user:join", `Carga ${index + 1}`);
      return joined;
    }));

    const deliveryTimes = [];
    const startedAt = performance.now();
    for (let index = 0; index < messageCount; index += 1) {
      const pendingDeliveries = clients.map(waitForUserMessage);
      const sentAt = performance.now();
      clients[0].emit("chat:message", `Mensaje de prueba ${index + 1}`);
      const receivedAt = await Promise.all(pendingDeliveries);
      deliveryTimes.push(...receivedAt.map((time) => time - sentAt));
    }
    const elapsedSeconds = (performance.now() - startedAt) / 1000;

    console.log("Prueba local de carga — Socket.IO");
    console.log(`Clientes conectados: ${clientCount}`);
    console.log(`Mensajes enviados: ${messageCount}`);
    console.log(`Entregas cliente-mensaje: ${deliveryTimes.length}`);
    console.log(`Duración: ${elapsedSeconds.toFixed(3)} s`);
    console.log(`Entregas por segundo: ${(deliveryTimes.length / elapsedSeconds).toFixed(2)}`);
    console.log(`Latencia de entrega p50: ${percentile(deliveryTimes, 50).toFixed(2)} ms`);
    console.log(`Latencia de entrega p95: ${percentile(deliveryTimes, 95).toFixed(2)} ms`);
  } finally {
    for (const client of clients) client.disconnect();
    await new Promise((resolve) => io.close(resolve));
  }
}

runLoadTest().catch((error) => {
  console.error("La prueba de carga no pudo completarse:", error);
  process.exitCode = 1;
});
