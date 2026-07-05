# Eve — Referencia del framework

Guía de referencia del framework [Vercel Eve v0.14.0](https://eve.dev/docs) para este proyecto. La documentación completa está en `node_modules/eve/docs/`.

---

## Concepto central: filesystem-first

Eve **no tiene registro manual**. Todo se descubre por la posición del archivo en el filesystem. El nombre del archivo es el nombre del elemento.

```
agent/tools/search_products.ts  →  tool "search_products"
agent/skills/ventas.md          →  skill "ventas"
agent/channels/whatsapp.ts      →  canal "whatsapp"
agent/schedules/reporte.ts      →  schedule "reporte"
```

---

## Estructura de `agent/`

| Ruta                     | Qué es                                           | Notas                                     |
| ------------------------ | ------------------------------------------------ | ----------------------------------------- |
| `agent/agent.ts`         | Config del agente: modelo, reasoning, compaction | Requerido si se cambia el modelo          |
| `agent/instructions.md`  | System prompt base (siempre activo)              | Requerido en el root agent                |
| `agent/tools/*.ts`       | Funciones que el modelo puede llamar             | Solo module-backed (`.ts`)                |
| `agent/skills/*.md`      | Conocimiento cargado on-demand por el modelo     | Markdown plano o module-backed            |
| `agent/channels/*.ts`    | Entrypoints HTTP/mensajería                      | Solo en root agent, no en subagents       |
| `agent/hooks/*.ts`       | Suscriptores a eventos del ciclo de vida         | Directorios anidados soportados           |
| `agent/connections/*.ts` | Conexiones MCP u OpenAPI a servicios externos    | Un archivo por conexión                   |
| `agent/schedules/*.ts`   | Jobs recurrentes (cron)                          | Solo en root agent                        |
| `agent/subagents/<id>/`  | Agentes hijo especializados                      | Cada uno tiene su propio `agent.ts`       |
| `agent/lib/`             | Código auxiliar compartido entre tools/hooks     | Solo imports, no se monta en el workspace |
| `agent/sandbox.ts`       | Config del sandbox de ejecución                  | Opcional                                  |

---

## `agent/agent.ts` — config del agente

```ts
import { defineAgent } from "eve";

export default defineAgent({
  model: "openai/gpt-4o", // modelo via Vercel AI Gateway
  reasoning: "medium", // "none" | "minimal" | "low" | "medium" | "high" | "xhigh"
  compaction: {
    thresholdPercent: 0.75, // compactar contexto al 75% (default: 0.9)
  },
});
```

Para usar un proveedor directo (sin gateway):

```ts
import { openai } from "@ai-sdk/openai";
import { defineAgent } from "eve";

export default defineAgent({ model: openai("gpt-4o") });
```

---

## `agent/tools/*.ts` — tools

```ts
import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description: "Descripción clara para que el modelo sepa cuándo llamar esta tool.",
  inputSchema: z.object({
    query: z.string().describe("Texto de búsqueda"),
  }),
  toModelOutput(output) {
    // opcional: transforma el output antes de devolverlo al modelo
    return { type: "text" as const, value: `Resultado: ${output.count}` };
  },
  async execute(input, ctx) {
    // input está tipado según inputSchema
    // ctx.session.id — ID de la sesión activa
    return { count: 0 };
  },
});
```

---

## `agent/skills/*.md` — skills

Archivos markdown con frontmatter `description:`. El modelo los carga automáticamente con `load_skill` cuando los necesita.

```markdown
---
description: Guía para manejar objeciones de precio
---

Cuando el cliente dice que es caro...
```

---

## `agent/channels/*.ts` — canales

```ts
import { defineChannel, POST, GET } from "eve/channels";

export default defineChannel({
  routes: [
    GET("/webhook", async (req) => {
      // verificación de webhook
      return new Response("OK");
    }),
    POST("/webhook", async (req, { send, waitUntil }) => {
      // waitUntil: procesa async sin bloquear la respuesta HTTP
      waitUntil(
        (async () => {
          const result = await send("mensaje", { continuationToken: "..." });
        })()
      );
      return new Response("OK", { status: 200 });
    }),
  ],
  events: {
    async "message.completed"(data, channel, ctx) {
      // data.message — texto de respuesta del agente
      // data.finishReason — "tool-calls" | "stop" | "length" | ...
      // channel.continuationToken — token de la sesión del canal
      // ctx.session.id — ID de la sesión Eve
    },
    "turn.failed"(data, channel) {
      console.error("Turn failed:", data.message);
    },
  },
});
```

---

## `agent/hooks/*.ts` — hooks

```ts
import { defineHook } from "eve/hooks";

export default defineHook({
  "message.completed"(data, ctx) {
    // igual que en canales, pero global a todos los canales
  },
});
```

---

## `agent/schedules/*.ts` — schedules

```ts
import { defineSchedule } from "eve/schedules";

export default defineSchedule({
  cron: "0 9 * * 1", // lunes a las 9:00 UTC
  prompt: "Enviá el resumen semanal de ventas.",
});
```

O en markdown:

```markdown
---
cron: "0 9 * * 1"
---

Enviá el resumen semanal de ventas.
```

---

## Runtime context (`ctx`)

Disponible en `execute()` de tools, handlers de channels y hooks.

| Campo                | Uso                             |
| -------------------- | ------------------------------- |
| `ctx.session.id`     | ID de la sesión activa          |
| `ctx.session.turn`   | Número de turno actual          |
| `ctx.getSandbox()`   | Handle del sandbox de ejecución |
| `ctx.getSkill(name)` | Handle de una skill por nombre  |

---

## Imports de referencia

| Import              | Contiene                                                 |
| ------------------- | -------------------------------------------------------- |
| `eve`               | `defineAgent`, `defineRemoteAgent`                       |
| `eve/tools`         | `defineTool`, `defineDynamic`, `disableTool`             |
| `eve/channels`      | `defineChannel`, `GET`, `POST`, `PUT`, `PATCH`, `DELETE` |
| `eve/channels/auth` | `localDev`, `vercelOidc`, `placeholderAuth`              |
| `eve/hooks`         | `defineHook`                                             |
| `eve/schedules`     | `defineSchedule`                                         |
| `eve/skills`        | `defineSkill`, `defineDynamic`                           |
| `eve/connections`   | `defineMcpClientConnection`, `defineOpenAPIConnection`   |
| `eve/context`       | `defineState`                                            |
| `eve/evals`         | `defineEval`, `defineEvalConfig`                         |
| `eve/client`        | `Client`, `ClientSession`                                |

---

## CLI

El binario `eve` corre desde el root del proyecto y carga `.env` / `.env.local` antes de ejecutar cualquier comando. Sin comando, ejecuta `eve dev`.

### `eve init [target]`

Scaffoldea un nuevo agente o agrega uno a un proyecto existente.

```bash
eve init             # scaffoldea en el directorio actual
eve init my-agent    # crea un nuevo directorio my-agent/
eve init .           # agrega agent/ a un proyecto existente
```

| Flag                   | Descripción                                                    |
| ---------------------- | -------------------------------------------------------------- |
| `--channel-web-nextjs` | Agrega la app de Web Chat (Next.js). Solo en proyectos nuevos. |

---

### `eve info`

Lista todo lo que Eve descubrió: tools, skills, channels, schedules, subagents, rutas, paths de artifacts y diagnósticos. **Usar primero ante cualquier problema.**

```bash
eve info
eve info --json   # output como JSON
```

| Flag     | Descripción                  |
| -------- | ---------------------------- |
| `--json` | Emite el resultado como JSON |

---

### `eve dev`

Levanta el dev server con hot-reload. Acepta una URL como argumento para conectar la TUI a un server remoto en lugar de arrancar uno local.

```bash
eve dev
eve dev --no-ui
eve dev https://mi-agente.vercel.app   # conecta la TUI a un server remoto
```

| Flag                                | Tipo   | Default               | Descripción                                                                         |
| ----------------------------------- | ------ | --------------------- | ----------------------------------------------------------------------------------- |
| `--host <host>`                     | string | todas las interfaces  | Interfaz de red a usar                                                              |
| `--port <port>`                     | number | `$PORT`, luego 3000   | Puerto a escuchar                                                                   |
| `-u, --url <url>`                   | string | —                     | Conectar a un server existente en lugar de arrancar uno local                       |
| `--no-ui`                           | flag   | UI activa             | Arrancar sin la TUI interactiva                                                     |
| `--name <name>`                     | string | nombre del directorio | Título mostrado en la TUI                                                           |
| `--input <text>`                    | string | —                     | Pre-carga texto en el prompt de la TUI (editable, no se envía solo)                 |
| `--tools <mode>`                    | enum   | `auto-collapsed`      | Render de tool calls: `full` \| `collapsed` \| `auto-collapsed` \| `hidden`         |
| `--reasoning <mode>`                | enum   | `full`                | Render de reasoning: `full` \| `collapsed` \| `auto-collapsed` \| `hidden`          |
| `--subagents <mode>`                | enum   | `auto-collapsed`      | Render de subagents: `full` \| `collapsed` \| `auto-collapsed` \| `hidden`          |
| `--connection-auth <mode>`          | enum   | `full`                | Render de auth de conexiones: `full` \| `collapsed` \| `auto-collapsed` \| `hidden` |
| `--assistant-response-stats <mode>` | enum   | `tokensPerSecond`     | Estadística del header: `tokens` \| `tokensPerSecond`                               |
| `--context-size <tokens>`           | number | —                     | Tamaño del context window, mostrado como porcentaje de uso                          |
| `--logs <mode>`                     | enum   | `stderr`              | Logs a mostrar: `all` \| `stderr` \| `sandbox` \| `none`                            |

> Eve guarda el PID del proceso en `.eve/dev-process.pid`. Si se intenta arrancar un segundo `eve dev` mientras el primero sigue corriendo, sale con un mensaje que indica cómo detenerlo.
>
> Los snapshots de runtime se guardan en `.eve/dev-runtime/snapshots/` para que sesiones en vuelo no rompan con rebuilds. Al arrancar, Eve poda snapshots stale automáticamente. Para limpiar manualmente: borrar `.eve/dev-runtime/snapshots/`.

---

### `eve build`

Compila los artifacts a `.eve/` y genera el output de producción en `.output/`. Sin flags.

```bash
eve build
```

Artifacts generados en `.eve/`:

| Artifact                                       | Descripción                                    |
| ---------------------------------------------- | ---------------------------------------------- |
| `.eve/discovery/agent-discovery-manifest.json` | Lo que Eve encontró en disco                   |
| `.eve/discovery/diagnostics.json`              | Errores y warnings de la forma de los archivos |
| `.eve/compile/compiled-agent-manifest.json`    | Surface serializado que Eve carga en runtime   |
| `.eve/compile/compile-metadata.json`           | Metadata del build y paths                     |
| `.eve/compile/module-map.mjs`                  | Entrypoints de módulos compilados              |

---

### `eve start`

Sirve el output previamente compilado por `eve build`.

```bash
eve start
eve start --port 4000
```

| Flag            | Tipo   | Default              | Descripción            |
| --------------- | ------ | -------------------- | ---------------------- |
| `--host <host>` | string | todas las interfaces | Interfaz de red a usar |
| `--port <port>` | number | `$PORT`, luego 3000  | Puerto a escuchar      |

---

### `eve link`

Vincula el directorio a un proyecto de Vercel y descarga las credenciales del AI Gateway.

```bash
eve link
```

Interactivo: pide equipo y proyecto. Al terminar, escribe el token en `.env.local`. Un `eve dev` corriendo recarga los env files automáticamente — no hace falta reiniciar.

---

### `eve deploy`

Deploy a producción en Vercel (`vercel deploy --prod`). Instala dependencias y descarga env vars antes. Si el directorio no está linkeado, corre `eve link` primero.

```bash
eve deploy
```

---

### `eve eval`

Corre los evals definidos en `evals/`. Sale con código `0` si todos pasaron, `1` si alguno falló, `2` en errores de configuración.

```bash
eve eval                    # corre todos
eve eval weather            # corre los que están bajo evals/weather/
eve eval --list             # lista los evals sin correrlos
eve eval --url https://...  # corre contra un agente remoto
```

| Flag                    | Tipo   | Default | Descripción                                                 |
| ----------------------- | ------ | ------- | ----------------------------------------------------------- |
| `--url <url>`           | string | —       | URL del agente remoto (omite el startup local)              |
| `--tag <tag...>`        | string | —       | Solo los evals con ese tag                                  |
| `--strict`              | flag   | off     | Scores por debajo del umbral también fallan el exit code    |
| `--list`                | flag   | off     | Lista los evals descubiertos sin correrlos                  |
| `--timeout <ms>`        | number | —       | Timeout por eval en milisegundos                            |
| `--max-concurrency <n>` | number | 8       | Máximo de evals corriendo en paralelo                       |
| `--json`                | flag   | off     | Output de resultados como JSON                              |
| `--junit <path>`        | string | —       | Escribe resultados en formato JUnit XML                     |
| `--skip-report`         | flag   | off     | Omite los reporters definidos en los evals (ej: Braintrust) |
| `--verbose`             | flag   | off     | Muestra los `t.log()` de cada eval en stdout                |

---

### `eve channels add`

Scaffoldea un nuevo canal en `agent/channels/`.

```bash
eve channels add          # interactivo
eve channels add slack    # scaffold directo de Slack
eve channels add web      # scaffold directo de Web Chat
```

| Flag          | Descripción                                             |
| ------------- | ------------------------------------------------------- |
| `-f, --force` | Sobreescribe archivos existentes                        |
| `-y, --yes`   | Asume yes en confirmaciones (requiere `kind` explícito) |

---

### `eve channels list`

Lista los canales definidos por el usuario.

```bash
eve channels list
eve channels list --json
```

| Flag     | Descripción      |
| -------- | ---------------- |
| `--json` | Output como JSON |

---

## Variables de entorno

### Prioridad nativa de Eve (solo en `dev`)

De **menor a mayor** prioridad (cada archivo pisa al anterior):

```
1. .env                    ← base, menor prioridad
2. .env.development        ← overrides de desarrollo
3. .env.local              ← overrides personales
4. .env.development.local  ← mayor prioridad local
```

En producción Eve no carga ningún archivo — el host inyecta las vars directamente.

### Convención de entornos con `NODE_ENV`

`NODE_ENV` usa tres valores, seteados por `cross-env` directamente en los scripts de `package.json`
(no en los archivos `.env*`):

| `NODE_ENV`    | Cuándo se usa                                       | Cómo se setea                                      |
| ------------- | --------------------------------------------------- | -------------------------------------------------- |
| `development` | Desarrollo local (`pnpm dev`, `pnpm dev:ui`)        | `cross-env NODE_ENV=development` en el script      |
| `test`        | Correr tests — local o CI/CD (`pnpm test`)          | `cross-env NODE_ENV=test` en `test`/`test:watch`   |
| `production`  | Cualquier entorno desplegado (QA, homo, prod, etc.) | `cross-env NODE_ENV=production` en `build`/`start` |

Todos los entornos desplegados usan `NODE_ENV=production`. Si hace falta distinguir QA de prod dentro de la plataforma, se agrega una variable adicional (ej: `APP_STAGE=qa`) directamente en el dashboard — sin necesidad de archivos extra.

### Archivos de entorno

```
.env          ← valores del desarrollador local, sin NODE_ENV (gitignored)
.env.example  ← template commiteado, sin secretos
```

Los entornos desplegados tienen sus vars configuradas directamente en el dashboard de la plataforma. El `.env.example` sirve de referencia de qué vars configurar.

---

## Archivos generados (no tocar)

| Carpeta           | Qué contiene                                                  |
| ----------------- | ------------------------------------------------------------- |
| `.eve/`           | Artifacts de compilación, snapshots de dev runtime, manifests |
| `.output/`        | Build de producción listo para `eve start` o deploy           |
| `.workflow-data/` | Estado de sesiones del workflow SDK en desarrollo             |

Todos se limpian con `pnpm clean` o `pnpm dev` (el `predev` limpia `.workflow-data` automáticamente).

---

## Flujo de desarrollo recomendado

```bash
pnpm dev          # levanta el server (limpia sesiones y workflow-data antes)
eve info          # si algo no funciona, verificar que Eve descubrió el archivo
pnpm lint         # oxlint
pnpm format       # prettier
pnpm typecheck    # tsc
pnpm test         # vitest
pnpm build        # build de producción (limpia artifacts antes)
```

---

## Debugging: sesiones stale

Si el server arroja `LoadCompiledManifestError` o `ENOENT compiled-agent-manifest.json`, hay sesiones apuntando a snapshots viejos. Solución: reiniciar con `pnpm dev` (el `predev` limpia `.workflow-data` automáticamente).

Si el problema persiste estando el server corriendo, borrar `data/` — Eve lo recrea en la próxima conversación entrante.

---

## Documentación completa

```
node_modules/eve/docs/
├── reference/
│   ├── project-layout.md     ← filesystem-first, slot table completo
│   ├── typescript-api.md     ← todos los define*, imports, ctx
│   └── cli.md                ← todos los flags de cada comando
├── agent-config.md           ← defineAgent en detalle
├── tools/overview.mdx        ← defineTool, HITL, aprobaciones
├── channels/                 ← canales disponibles (Slack, Telegram, Twilio, etc.)
├── concepts/                 ← modelo de ejecución, sesiones, durabilidad
├── guides/                   ← hooks, state, session context, deployment
└── evals/                    ← cómo escribir y correr evaluaciones
```
