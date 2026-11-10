# RealTime Chat — Actividad 4, Unidad 4

Aplicación web de chat grupal en tiempo real hecha con Node.js, el módulo HTTP nativo y Socket.IO. La interfaz permite entrar con un nombre, intercambiar mensajes, consultar quién está conectado y ver indicadores de escritura.

## Requisitos

- Node.js 20 o superior.
- npm (incluido con Node.js).

## Instalación y ejecución

Desde la carpeta del proyecto, ejecuta:

```bash
npm install
npm start
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador. Para probar varios usuarios, abre la dirección en dos ventanas o perfiles diferentes.

Durante el desarrollo puedes usar `npm run dev`, que reinicia el servidor cuando cambia `server.js`. Para cambiar el puerto: `PORT=4000 npm start` (en PowerShell: `$env:PORT=4000; npm start`).

## Organización del código

El proyecto separa las responsabilidades para que sea sencillo ubicar y mantener cada parte:

```text
server.js                 Punto de entrada; compone HTTP y Socket.IO
src/http-server.js        Servidor HTTP y publicación de archivos estáticos
src/chat-events.js        Validación y eventos, participantes e historial
public/index.html         Estructura de la interfaz
public/css/styles.css     Presentación adaptable
public/js/chat.js         Conexión Socket.IO y comportamiento del navegador
test/chat.test.js         Pruebas automatizadas de integración
scripts/benchmark.js      Prueba local reproducible de concurrencia y latencia
docs/INFORME.md           Informe académico
evidencias/README.md      Guía para capturar evidencias reales
```

`server.js` actúa como punto de composición: crea el servidor HTTP, conecta Socket.IO, registra los eventos del chat e inicia el puerto. La lógica de publicación de archivos y las reglas de chat permanecen separadas en `src/`.

## Funcionalidades

- Chat público multidispositivo en tiempo real.
- Nombre de usuario validado y único (no distingue mayúsculas y minúsculas).
- La pestaña recuerda el nombre durante la sesión del navegador y vuelve a entrar automáticamente al recargar.
- Mensajes con hora, diferenciación del usuario propio e historial temporal.
- Lista y contador de participantes conectados.
- Avisos de entrada y salida, e indicador de escritura.
- Diseño adaptable a móvil y escritorio.
- Límite de 500 caracteres por mensaje y rechazo de mensajes vacíos.
- Envío de imágenes JPG, PNG y WebP de hasta 1 MB, opcionalmente con texto.
- Validación del tipo, firma y tamaño de imagen en el servidor.
- Contenido de usuarios insertado con `textContent` para evitar interpretarlo como HTML.

El historial se mantiene únicamente en memoria, durante la sesión del servidor; conserva hasta 100 eventos y un máximo aproximado de 12 MB para limitar el uso de imágenes. El nombre se guarda en `sessionStorage` del navegador para evitar pedirlo de nuevo al recargar esa pestaña; no crea una cuenta permanente. No hay persistencia en base de datos. Las imágenes se envían a todos los participantes de la sala grupal; no se guardan en disco ni se envían en privado.

## Pruebas

Las pruebas automatizadas usan puertos temporales y clientes Socket.IO locales:

```bash
npm test
```

Para una comprobación manual funcional, abre la aplicación en dos ventanas o perfiles distintos; entra con nombres diferentes, intercambia mensajes, observa la lista y el indicador de escritura y cierra una ventana para confirmar el aviso de salida.

### Prueba de carga local

El siguiente comando conecta 10 clientes simultáneos y envía 20 mensajes desde uno de ellos. Espera la entrega de cada mensaje en todos los clientes y reporta entregas por segundo y latencias p50/p95:

```bash
npm run benchmark
```

Se pueden ajustar los parámetros (clientes: 1–100; mensajes: 1–1000):

```bash
npm run benchmark -- --clients=25 --messages=100
```

Registra la salida, la versión de Node.js, el sistema operativo y la configuración usada si incluyes resultados en el informe. La prueba es una medición básica en una sola máquina, no una certificación de capacidad de producción: latencias y rendimiento dependen del equipo, de la carga del sistema y del número de clientes. No se afirman resultados hasta ejecutar el comando en el equipo donde se entrega.

## Evidencias y entrega

Las capturas deben obtenerse ejecutando el proyecto; no se incluyen imágenes simuladas. Consulta [evidencias/README.md](evidencias/README.md) para una lista de capturas sugeridas. Antes de entregar, añade tus datos al informe y toma las capturas requeridas. El ZIP de entrega queda a cargo del estudiante.
