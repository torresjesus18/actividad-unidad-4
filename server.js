const { Server } = require("socket.io");
const { createStaticServer } = require("./src/http-server");
const { registerChatEvents } = require("./src/chat-events");

const PORT = Number(process.env.PORT) || 3000;

function createChatServer() {
  const server = createStaticServer();
  const io = new Server(server, { maxHttpBufferSize: 1_500_000 });
  registerChatEvents(io);
  return { server, io };
}

if (require.main === module) {
  const { server } = createChatServer();
  server.listen(PORT, () => {
    console.log(`RealTime Chat está disponible en http://localhost:${PORT}`);
  });
  server.on("error", (error) => {
    console.error("No se pudo iniciar el servidor:", error);
    process.exitCode = 1;
  });
}

module.exports = { createChatServer };
