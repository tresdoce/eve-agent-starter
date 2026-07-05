# eve-agent-template

Template base para construir agentes conversacionales con **Vercel Eve**. Trae un ejemplo funcional
completo — un agente de soporte que responde con una base de conocimiento (FAQ) y escala a un ticket
cuando no encuentra respuesta — para que puedas ver el patrón funcionando antes de reemplazarlo por
tu propio caso de uso.

---

## Qué es este template vs. qué es el ejemplo

| Parte                                     | Es del template (mantenela)                     | Es el ejemplo (reemplazala)                      |
| ----------------------------------------- | ----------------------------------------------- | ------------------------------------------------ |
| `agent/agent.ts`, `agent/channels/eve.ts` | Config base del agente y canal HTTP por defecto | —                                                |
| `src/config/`, `src/lib/normalize.ts`     | Env tipado, utilidades genéricas                | —                                                |
| `src/domain/`, `src/repositories/`        | El **patrón** (schema Zod + interfaz + factory) | `faqEntry.ts`, `faqRepository.ts` son el ejemplo |
| `agent/instructions.md`, `agent/skills/*` | —                                               | Contenido y tono del agente "Acme"               |
| `agent/tools/*`                           | El **patrón** de `defineTool`                   | `search_faq`, `create_support_ticket`            |
| `knowledge-base/faqs.json`                | —                                               | Datos de ejemplo                                 |
| `tests/`                                  | El **patrón** de tests con Vitest               | Casos específicos de la FAQ                      |

---

## Stack

| Capa                 | Tecnología                       |
| -------------------- | -------------------------------- |
| Framework de agentes | Vercel Eve                       |
| Modelo de lenguaje   | OpenAI GPT-4o (`@ai-sdk/openai`) |
| Lenguaje             | TypeScript + Node                |
| Validación           | Zod v4                           |
| Tests                | Vitest                           |
| Datos de ejemplo     | JSON local (`knowledge-base/`)   |

Para el detalle del framework (filesystem-first, `defineTool`, `defineChannel`, CLI, etc.) ver `EVE.md`.

---

## Instalación y desarrollo

```bash
pnpm install
cp .env.example .env.local   # completá OPENAI_API_KEY
pnpm dev                     # levanta en http://127.0.0.1:2000
```

Eve usa hot-reload: cualquier cambio en `agent/` se reconstruye automáticamente.

### Probar el ejemplo

```bash
pnpm dev:ui   # TUI interactiva — escribí "¿cómo cambio mi contraseña?"
```

O contra el canal HTTP por defecto (ver auth en `agent/channels/eve.ts`):

```bash
eve info   # confirma que Eve descubrió tools, skill, canal e instrucciones
```

### Scripts disponibles

| Script           | Descripción                                              |
| ---------------- | -------------------------------------------------------- |
| `pnpm dev`       | Servidor de desarrollo en el puerto 2000                 |
| `pnpm dev:ui`    | Igual, con la TUI interactiva de Eve                     |
| `pnpm build`     | Build de producción                                      |
| `pnpm start`     | Corre el build de producción                             |
| `pnpm clean`     | Borra todo lo generado (`.eve`, `.output`, `data`, etc.) |
| `pnpm lint`      | oxlint                                                   |
| `pnpm format`    | Prettier                                                 |
| `pnpm typecheck` | TypeScript                                               |
| `pnpm test`      | Vitest                                                   |

---

## Estructura de archivos

```
agent/
├── agent.ts                    # defineAgent({ model })
├── instructions.md             # System prompt del ejemplo (Acme support)
├── tools/
│   ├── search_faq.ts            # Busca en la FAQ por texto y/o categoría
│   └── create_support_ticket.ts # Escala cuando la FAQ no tiene respuesta
├── skills/
│   └── tone_and_escalation.md   # Skill cargada on-demand
└── channels/
    └── eve.ts                   # Canal HTTP por defecto (auth localDev/vercelOidc/placeholder)

src/
├── domain/
│   └── faqEntry.ts               # FaqEntrySchema (Zod) + tipos
├── repositories/
│   ├── faqRepository.ts          # Interfaz FaqRepository + getRepository()
│   └── localFaqRepository.ts     # Lee knowledge-base/faqs.json
├── lib/
│   └── normalize.ts              # normalizeText() para búsqueda case/accent-insensitive
└── config/
    ├── env.ts                    # Variables de entorno tipadas
    └── index.ts                  # AppConfig validado con Zod

knowledge-base/
└── faqs.json                     # Datos de ejemplo, validados con Zod al iniciar

tests/
└── faqRepository.test.ts

data/                              # Gitignorado — generado en runtime (tickets.json)
```

---

## Cómo adaptar este template a tu propio agente

1. **Reescribí `agent/instructions.md`** con la personalidad, reglas y flujo de tu agente.
2. **Reemplazá el dominio de ejemplo**: creá tu propio schema en `src/domain/`, tu propia interfaz +
   implementación en `src/repositories/` (mismo patrón que `faqRepository.ts` / `localFaqRepository.ts`),
   y tus datos donde corresponda.
3. **Reemplazá las tools** en `agent/tools/` por las que tu agente necesite (`defineTool` de `eve/tools`).
   Cada archivo = una tool, el nombre del archivo es el nombre de la tool.
4. **Agregá skills** en `agent/skills/*.md` para conocimiento que el modelo debe cargar on-demand.
5. **Agregá un canal** si necesitás algo más que HTTP genérico (WhatsApp, Slack, Telegram, etc.):
   `eve channels add`. El canal por defecto (`agent/channels/eve.ts`) alcanza para empezar.
6. **Variables de entorno**: agregá las tuyas a `src/config/env.ts` + `src/config/index.ts`
   (mismo patrón que `OPENAI_*`), y a `.env.example`.
7. **Tests**: seguí el patrón de `tests/faqRepository.test.ts` para tu propia capa de datos.

---

## Configuración

Copiá `.env.example` a `.env.local` y completá:

| Variable                 | Descripción           |
| ------------------------ | --------------------- |
| `OPENAI_API_KEY`         | API key de OpenAI     |
| `OPENAI_ORGANIZATION_ID` | Org ID (opcional)     |
| `OPENAI_PROJECT_ID`      | Project ID (opcional) |

---

## Repositorio intercambiable

`FaqRepository` es una interfaz en `src/repositories/faqRepository.ts`:

```ts
interface FaqRepository {
  search(filters: FaqSearchFilters): Promise<FaqEntry[]>;
  getById(id: string): Promise<FaqEntry | null>;
  listAll(): Promise<FaqEntry[]>;
}
```

Para conectar una base de datos o un CMS: implementá tu propia clase y cambiá `getRepository()`.
Las tools del agente no necesitan modificarse.

---

## Tests

```bash
pnpm test
```

Cubre: carga de la base de conocimiento, validación de schema, y filtros del repositorio.

---

## Limitaciones del ejemplo

| Limitación                         | Impacto                                    | Solución para producción                        |
| ---------------------------------- | ------------------------------------------ | ----------------------------------------------- |
| `knowledge-base/faqs.json` local   | No escala ni se edita desde un panel       | CMS o base de datos detrás de `FaqRepository`   |
| `data/tickets.json` en disco       | No escala a múltiples instancias           | Sistema de tickets real (Zendesk, Linear, etc.) |
| Sin autenticación real en el canal | `placeholderAuth()` no sirve en producción | Auth.js, Clerk, o tu propio proveedor           |
