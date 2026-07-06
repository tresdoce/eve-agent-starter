# Deploy en Railway

Esta guía cubre cómo desplegar este template en [Railway](https://railway.com) como un servicio Node
estándar. `eve deploy` (el comando nativo de Eve) apunta a Vercel — para Railway corremos `eve build` /
`eve start` directamente, que es exactamente lo que hace Railway por default al detectar un `package.json`
con scripts `build` y `start`.

Este proyecto ya está desplegado y verificado end-to-end en Railway. Esta guía documenta el setup real,
incluyendo dos bugs que solo aparecen en un contenedor Linux genérico (no en tu Mac) y que hay que resolver
antes de que el deploy funcione.

---

## Qué detecta Railway automáticamente

Railway usa **Railpack** como builder por default. Con este repo, sin tocar nada, va a:

- Detectar Node.js por `package.json`
- Detectar **pnpm** por `pnpm-lock.yaml` (instala con `pnpm install`)
- Usar `pnpm run build` (→ `eve build`) como build command
- Usar `pnpm run start` (→ `eve start`) como start command

No hace falta un `Procfile` ni un `railway.json` — los scripts de `package.json` alcanzan. Un Dockerfile
tampoco resuelve nada acá: el problema real (ver más abajo) es que el contenedor no tiene Docker-in-Docker
ni KVM, algo que un Dockerfile propio tampoco te da.

> **`pnpm-workspace.yaml`**: declara `packages: ["."]` (requerido — sin esto pnpm trata el repo como un
> monorepo mal declarado y el install falla con `packages field missing or empty`) y `allowBuilds` para los
> postinstalls aprobados (`esbuild`, `ngrok`, `just-bash` y sus dependencias nativas opcionales). No es un
> monorepo real, así que no hace falta `rootDirectory` ni build/start commands especiales.

> **`packageManager` en `package.json`**: pineado a `pnpm@11.9.0` para que Railway instale la misma versión
> que usás localmente, en vez de que Railpack resuelva una versión distinta a partir del lockfile.

---

## Prerrequisitos

```bash
railway login
```

Necesitás una cuenta de Railway y tu `OPENAI_API_KEY`.

---

## Paso a paso

### 1. Crear el proyecto y el servicio

```bash
railway init --name eve-agent-starter
```

Esto crea el proyecto y linkea el directorio actual en un solo paso. Conectá el servicio al repo de GitHub
desde el dashboard de Railway para que cada push a `main` dispare un deploy automático (así se desplegó
este proyecto) — o usá `railway up` para deployar el directorio local directamente.

### 2. Configurar variables de entorno

Railway inyecta las variables directamente en build y runtime — no lee `.env*` (mismo comportamiento
documentado en `EVE.md` para cualquier entorno desplegado).

```bash
railway variables --set "RAILPACK_NODE_VERSION=24"
railway variables --set "NODE_ENV=production"
railway variables --set "APP_STAGE=production"
railway variables --set "OPENAI_API_KEY=sk-..."
railway variables --set "OPENAI_MODEL=gpt-4o"                # opcional, mismo default
railway variables --set "OPENAI_REASONING_EFFORT=medium"     # opcional, sin setear usa el default de Eve
railway variables --set "ROUTE_AUTH_BASIC_USERNAME=eve-agent"
railway variables --set "ROUTE_AUTH_BASIC_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
```

`RAILPACK_NODE_VERSION=24` es obligatorio: Railpack por default resuelve Node 22, pero Eve requiere Node
≥24. Sin esto, `eve build` falla con `eve requires Node.js >=24. You are running v22.x.x`.

### 3. Deploy

```bash
railway up --detach -m "deploy inicial a Railway"
```

O simplemente `git push` si ya conectaste el servicio al repo de GitHub.

### 4. Generar dominio público

```bash
railway domain
```

### 5. Configurar el healthcheck

No queda seteado por default. Sin esto, Railway marca un deploy como exitoso apenas el contenedor arranca,
aunque la app esté crasheando en loop (nos pasó: un deploy quedó en "SUCCESS" mientras el proceso reiniciaba
sin parar por el bug de `just-bash`). `GET /eve/v1/health` es público y no pasa por el auth walk, así que es
el path correcto:

El CLI de esta versión no expone un flag directo para esto — se setea vía la API de GraphQL (mismo
patrón que `scripts/railway-api.sh` de la skill de Railway):

```bash
# healthcheckPath: "/eve/v1/health", healthcheckTimeout: 30 (segundos)
# mutation serviceInstanceUpdate(environmentId, serviceId, input: { healthcheckPath, healthcheckTimeout })
```

Verificalo contra el servicio (no contra `railway status --json`, que puede mostrar un snapshot viejo del
build):

```bash
railway redeploy --yes   # para que el próximo rollout ya lo valide
```

### 6. Verificar

```bash
railway logs --build   # logs del build más reciente
railway logs           # logs de runtime
curl https://<tu-dominio>.up.railway.app/eve/v1/health
# {"ok":true,"status":"ready",...}
```

---

## Networking

Este template usa un único servicio, sin base de datos ni servicios internos — no hay networking privado
que configurar.

- **Dominio público**: uno solo, generado por `railway domain` (`*.up.railway.app`). Alcanza para este caso
  de uso; agregá un dominio custom con `railway domain tu-dominio.com` si hace falta.
- **Puerto**: `eve start` escucha en `$PORT`, que Railway inyecta automáticamente (`PORT=2000` en las
  variables del servicio). No hace falta fijar `--port` a mano ni exponer otro puerto.
- **`RAILWAY_PRIVATE_DOMAIN`**: existe siempre (DNS interno), pero no lo usamos — solo importa si en algún
  momento este agente necesita hablarle a otro servicio del mismo proyecto (una base de datos, otro backend).
- **Réplicas**: 1 sola (`numReplicas: 1`). Si escalás a más de una, recordá el límite ya documentado en
  "Persistencia" — `data/tickets.json` no se comparte entre réplicas.

---

## El bug que solo aparece en Railway: falta `just-bash`

Eve siempre inicializa un sandbox al arrancar (`eve: initializing 1 sandbox template...`), incluso si
ninguna tool declarada lo usa — las tools de este template (`search_faq`, `create_support_ticket`) son
funciones TS puras y no lo necesitan, pero el harness igual lo levanta para los tools built-in (`bash`,
`read_file`, etc.).

`defaultBackend()` resuelve en este orden: **Vercel Sandbox → Docker → microsandbox → just-bash**. Tu Mac
usa Docker o microsandbox por default, así que nunca ves este problema en local. Un contenedor Linux
genérico como Railway no tiene Docker daemon ni KVM, así que cae al último backend, **just-bash** — que
Eve no bundlea. Sin el paquete, `eve start` crashea en loop con:

```
eve: failed to initialize sandbox template "root" on backend "just-bash": The just-bash sandbox
backend requires the `just-bash` package, which is not bundled with eve.
```

La solución (ya aplicada en este template) es declarar `just-bash` como dependencia real —no
devDependency, se necesita en runtime— en `package.json`. Trae dos dependencias nativas opcionales
(`@mongodb-js/zstd`, `node-liblzma`) que necesitan aprobación de postinstall (`pnpm approve-builds`), ya
resuelta en `pnpm-workspace.yaml`.

**Un Dockerfile no evita esto.** El problema es la falta de Docker-in-Docker/KVM en el contenedor en
runtime, no cómo se construyó la imagen.

Si tu agente en algún momento no necesita `bash`/`read_file`/`write_file`/`glob`/`grep` en absoluto, podés
deshabilitarlos con `disableTool()` (ver [Built-in tools](node_modules/eve/docs/concepts/default-harness.md))
y quitar la dependencia de `just-bash` — pero por default, mantenerlo es la opción robusta.

---

## Autenticación de producción

Este es un deploy self-hosted (no Vercel), así que `agent/channels/eve.ts` usa `httpBasic()` en vez de
`vercelOidc()`/`placeholderAuth()`:

```ts
import { eveChannel } from "eve/channels/eve";
import { httpBasic, localDev } from "eve/channels/auth";

export default eveChannel({
  auth: [
    localDev(), // abierto en localhost para `eve dev`
    httpBasic({
      username: process.env.ROUTE_AUTH_BASIC_USERNAME ?? "",
      password: process.env.ROUTE_AUTH_BASIC_PASSWORD ?? "",
    }),
  ],
});
```

`GET /eve/v1/health` sigue siendo público (no pasa por el walk de auth). `POST /eve/v1/session` y las demás
rutas de sesión exigen HTTP Basic con las credenciales de `ROUTE_AUTH_BASIC_USERNAME`/`ROUTE_AUTH_BASIC_PASSWORD`:

```bash
# Sin credenciales → 401
curl -X POST https://<tu-dominio>.up.railway.app/eve/v1/session \
  -H "Content-Type: application/json" -d '{"message":"hola"}'

# Con credenciales → abre sesión
curl -X POST https://<tu-dominio>.up.railway.app/eve/v1/session \
  -u "eve-agent:<ROUTE_AUTH_BASIC_PASSWORD>" \
  -H "Content-Type: application/json" -d '{"message":"como cambio mi contraseña?"}'
# {"continuationToken":"...","ok":true,"sessionId":"..."}

# Ver la respuesta del agente
curl -N -u "eve-agent:<ROUTE_AUTH_BASIC_PASSWORD>" \
  "https://<tu-dominio>.up.railway.app/eve/v1/session/<SESSION_ID>/stream"
```

Si más adelante este agente tiene un frontend multiusuario real, reemplazá `httpBasic()` por tu propio
`AuthFn` (sesión de app, JWT, OIDC) — ver [Auth & route protection](node_modules/eve/docs/guides/auth-and-route-protection.md).

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
railway redeploy --yes   # rebuild y deploy desde el mismo source
railway logs              # runtime logs de la última deployment
railway logs --build      # build logs de la última deployment
```
