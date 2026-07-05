# Deploy en Railway

Esta guía cubre cómo desplegar este template en [Railway](https://railway.com) como un servicio Node
estándar. `eve deploy` (el comando nativo de Eve) apunta a Vercel — para Railway corremos `eve build` /
`eve start` directamente, que es exactamente lo que hace Railway por default al detectar un `package.json`
con scripts `build` y `start`.

---

## Qué detecta Railway automáticamente

Railway usa **Railpack** como builder por default. Con este repo, sin tocar nada, va a:

- Detectar Node.js por `package.json`
- Detectar **pnpm** por `pnpm-lock.yaml` (instala con `pnpm install`)
- Usar `pnpm run build` (→ `eve build`) como build command
- Usar `pnpm run start` (→ `eve start`) como start command

No hace falta un `Procfile` ni un `railway.json` — los scripts de `package.json` alcanzan.

> **Nota sobre `pnpm-workspace.yaml`**: existe solo para declarar `allowBuilds` (postinstalls aprobados de
> `ngrok`/`esbuild`). No define `packages:`, así que **no es un monorepo real** — Railway no necesita
> `rootDirectory` ni build/start commands especiales por esto.

---

## Prerrequisitos

```bash
railway login
```

Necesitás una cuenta de Railway y tu `OPENAI_API_KEY`.

---

## Paso a paso

### 1. Crear el proyecto y linkearlo

```bash
railway init --name eve-agent-starter
```

Esto crea el proyecto y linkea el directorio actual en un solo paso.

### 2. Pinnear la versión de Node

Railpack puede resolver una versión de Node distinta a la que usás localmente (Node 24). Fijala explícitamente:

```bash
railway variable set RAILPACK_NODE_VERSION=24
```

### 3. Configurar variables de entorno

Railway inyecta las variables directamente en build y runtime — no lee `.env*` (mismo comportamiento
documentado en `EVE.md` para cualquier entorno desplegado).

```bash
railway variable set NODE_ENV=production
railway variable set APP_STAGE=production
railway variable set OPENAI_API_KEY=sk-...
railway variable set OPENAI_ORGANIZATION_ID=org-...   # opcional
railway variable set OPENAI_PROJECT_ID=proj-...       # opcional
```

### 4. Deploy

```bash
railway up --detach -m "deploy inicial a Railway"
```

### 5. Generar dominio público

```bash
railway domain
```

### 6. Verificar

```bash
railway logs --lines 100
curl https://<tu-dominio>.up.railway.app/eve/v1/health
# {"ok":true,"status":"ready",...}
```

---

## Antes de exponerlo de verdad

`agent/channels/eve.ts` trae `placeholderAuth()`, que devuelve **401 en producción** a propósito hasta
que la reemplaces por tu propio proveedor de auth (Auth.js, Clerk, un verificador de API key, etc.). Sin
esto, `/eve/v1/session` va a rechazar requests externos — es intencional, no un bug. Ver
[Auth & route protection](node_modules/eve/docs/guides/auth-and-route-protection.md).

---

## Persistencia

`create_support_ticket` escribe en `data/tickets.json`, en el filesystem del contenedor. En Railway esto:

- Se pierde en cada redeploy (filesystem efímero)
- No se comparte entre réplicas si escalás horizontalmente

Para el ejemplo alcanza así. Para producción real, montá un [Volume de Railway](https://docs.railway.com/reference/volumes)
en `/app/data`, o mejor: reemplazá `LocalFaqRepository`/el storage de tickets por una base de datos real
(ver la sección "Repositorio intercambiable" en `README.md`).

---

## Redeploys y logs

```bash
railway redeploy --yes        # rebuild y deploy desde el mismo source
railway logs --lines 200      # runtime logs
railway logs --build --lines 200   # build logs
```
