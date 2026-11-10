# Informe — Aplicación de chat en tiempo real

## Portada

**Institución:** [Nombre de la institución]  
**Programa:** [Programa académico]  
**Asignatura:** Programación Distribuida  
**Actividad:** Actividad 4 — Unidad 4  
**Estudiante:** [Nombre completo]  
**Docente:** [Nombre del docente]  
**Fecha:** [Fecha de entrega]

## Introducción

Este proyecto implementa una aplicación web de chat grupal que permite intercambiar mensajes en tiempo real. La comunicación entre el navegador y el servidor se realiza mediante Socket.IO, sin recargar la página. El servidor se construye con el módulo HTTP nativo de Node.js y publica los archivos de la interfaz.

## Objetivos

### Objetivo general

Desarrollar una aplicación de mensajería en tiempo real utilizando Node.js y Socket.IO.

### Objetivos específicos

- Configurar un servidor HTTP y asociarle Socket.IO.
- Implementar el envío y la recepción de mensajes entre varios clientes.
- Mostrar el estado de conexión y los participantes activos.
- Validar los datos recibidos y presentar una interfaz adaptable.

## Tecnologías

- Node.js y npm.
- JavaScript.
- Módulo `http` de Node.js.
- Socket.IO y `socket.io-client`.
- HTML5 y CSS3.
- Módulo de pruebas nativo `node:test`.

## Arquitectura

El navegador carga `public/index.html`, los estilos de `public/css/styles.css` y el comportamiento de `public/js/chat.js`. Socket.IO establece una conexión persistente con el servidor.

El código del servidor se divide por responsabilidad:

- `server.js` es el punto de entrada: crea el servidor HTTP, conecta Socket.IO, registra los eventos e inicia la aplicación.
- `src/http-server.js` atiende HTTP y publica los archivos de `public/`.
- `src/chat-events.js` valida nombres y mensajes, administra participantes e historial temporal y difunde los eventos.

Esta separación permite localizar los cambios de transporte HTTP y las reglas del chat sin mezclar ambas responsabilidades. El historial y los participantes se mantienen en memoria; al detener el proceso se pierden.

## Instalación y ejecución

Requisitos: Node.js 20 o superior y npm. Desde la carpeta raíz del proyecto:

```bash
npm install
npm start
```

Al aparecer el mensaje de que RealTime Chat está disponible, abre `http://localhost:3000`. Para probar el chat, abre la dirección en dos ventanas o perfiles del navegador y entra con nombres diferentes. En PowerShell el puerto puede cambiarse con `$env:PORT=4000; npm start`; en macOS/Linux, con `PORT=4000 npm start`. Detén el servidor con `Ctrl+C`.

Durante desarrollo puede usarse `npm run dev`, que reinicia Node.js al cambiar `server.js`. Las pruebas automatizadas se ejecutan con `npm test`.

## Proceso de desarrollo

1. Se definió la estructura del proyecto y sus dependencias npm.
2. Se creó un servidor HTTP y se integró con Socket.IO.
3. Se implementó el protocolo de entrada de usuarios, mensajes y escritura.
4. Se construyó la interfaz responsive y la representación segura del texto.
5. Se añadieron pruebas de integración para los eventos principales.

## Implementación de Socket.IO

El cliente abre la conexión y solicita entrar con el evento `user:join`. El servidor valida el nombre y devuelve `user:joined` junto con el historial vigente. Los mensajes se envían con `chat:message` y se difunden a todos los participantes. `users:update` mantiene sincronizada la lista de conectados y `typing:update` comunica el estado de escritura. Al desconectarse un cliente, el servidor actualiza la lista y emite una notificación del sistema.

## Funcionalidades implementadas

- Identificación mediante nombre único de 2 a 20 caracteres.
- Recuperación del nombre desde `sessionStorage` de la pestaña para reconectar automáticamente al recargar, sin crear cuentas permanentes.
- Mensajes en tiempo real de hasta 500 caracteres.
- Hora local de cada mensaje e historial temporal de hasta 100 eventos.
- Lista y contador de usuarios conectados.
- Notificaciones de entrada y salida e indicador de escritura.
- Envío de imágenes JPG, PNG y WebP de hasta 1 MB, con texto opcional y vista previa antes del envío.
- Validación de formato, firma y tamaño de las imágenes en el servidor; se rechazan SVG y otros formatos.
- Diseño para pantallas de escritorio y móviles.
- Presentación segura del contenido de usuario con `textContent`.
- Acceso para desconectarse y volver a entrar.

Las imágenes se difunden a la sala grupal mediante Socket.IO y se conservan solo en el historial temporal de memoria. El historial limita su uso a 100 eventos y aproximadamente 12 MB. No se almacenan archivos en disco ni se implementan cuentas, mensajes privados o persistencia tras reiniciar el servidor.

## Pruebas y resultados

Completar esta sección luego de ejecutar `npm test` y hacer las comprobaciones manuales con dos ventanas del navegador. Registra aquí únicamente los resultados observados:

| Comprobación | Resultado observado |
|---|---|
| Inicio del servidor y carga de la página | [Completar] |
| Ingreso de dos clientes con nombres diferentes | [Completar] |
| Mensajes visibles en ambos clientes | [Completar] |
| Envío y recepción de imagen permitida | [Completar] |
| Rechazo de imagen mayor a 1 MB y formatos no admitidos | [Completar] |
| Actualización de participantes y eventos de conexión | [Completar] |
| Indicador de escritura | [Completar] |
| Validación de nombre duplicado y mensaje vacío | [Completar] |
| Vista móvil | [Completar] |
| Pruebas automatizadas (`npm test`) | 4 aprobadas, 0 fallidas en la verificación técnica del proyecto |

### Prueba de rendimiento básica

Se incluye una prueba de carga local reproducible. Ejecuta:

```bash
npm run benchmark
```

El valor predeterminado conecta 10 clientes y envía 20 mensajes; cada mensaje es esperado por todos los clientes antes de continuar. Para aumentar la concurrencia:

```bash
npm run benchmark -- --clients=25 --messages=100
```

El programa informa número de clientes, mensajes, entregas cliente-mensaje, duración, entregas por segundo y latencia de entrega p50/p95. La latencia se mide desde que el emisor entrega el evento al cliente Socket.IO hasta que cada cliente recibe el mensaje. Para documentar una ejecución, anota fecha, versión de Node.js (`node --version`), sistema operativo, parámetros y salida obtenida. No pegues resultados de ejemplo ni presentes una ejecución de otra máquina como medición propia. Esta prueba es orientativa y local; no representa una prueba de estrés distribuida ni garantiza el comportamiento en producción.

#### Verificación técnica realizada

El 10 de noviembre de 2026 se ejecutaron `npm test` y `npm run benchmark` en el entorno de desarrollo del proyecto (Windows, Node.js v24.15.0). Las cuatro pruebas automatizadas pasaron. La ejecución predeterminada de carga conectó 10 clientes y envió 20 mensajes: 200 entregas cliente-mensaje, 0.016 s de duración, 12 163.30 entregas/s, p50 de 0.62 ms y p95 de 1.49 ms.

Estos datos son una medición local de verificación, no una prueba entre equipos ni un resultado garantizado. Para presentar una medición propia, vuelve a ejecutar el comando en el equipo usado para la entrega y reemplaza los valores según la salida obtenida.

## Problemas encontrados y soluciones

Completa este apartado con dificultades que hayas observado durante la instalación, ejecución o prueba del proyecto y explica cómo se resolvieron. No se registran problemas no comprobados.

## Conclusiones

Completa las conclusiones después de ejecutar y probar la aplicación. Puedes explicar qué aprendiste sobre comunicación bidireccional, eventos y manejo de conexiones con Socket.IO, según tu experiencia.

## Referencias

- Node.js. (s. f.). *HTTP*. https://nodejs.org/api/http.html
- Socket.IO. (s. f.). *Socket.IO Documentation*. https://socket.io/docs/v4/
- MDN Web Docs. (s. f.). *HTML, CSS y JavaScript*. https://developer.mozilla.org/

## Datos pendientes antes de entregar

- Completar los campos de portada.
- Registrar los resultados efectivamente observados en la tabla.
- Ejecutar la prueba de carga y registrar los datos obtenidos, si se van a presentar resultados de rendimiento.
- Redactar las conclusiones y dificultades propias.
- Añadir las capturas auténticas en `evidencias/`.
