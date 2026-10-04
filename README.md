# Inventory App Dafacha

Frontend (panel de administración) del sistema de inventario Dafacha. Su backend es `inventory-server-dafacha`.

**Stack:** Nuxt 3 (SPA, `ssr: false`) · Vuetify 3 · Pinia · Tabler Icons (`@nuxt/icon`) · pnpm.

## Puesta en marcha

```bash
pnpm install
cp .env.example .env   # NUXT_API_BASE apunta al backend (http://localhost:8081)
pnpm dev               # http://localhost:3001 (puerto fijo en nuxt.config.ts)
```

Puertos locales: `inventory-app-dafacha` 3001 / `inventory-server-dafacha` 8081
(`salonspa_app_v2` usa 3000 y `salonspa_server_v2` usa 8080). El backend permite CORS desde `http://localhost:3001` por defecto.

## Estructura (`src/`)

- `pages/`, `layouts/`, `components/` — UI.
- `plugins/vuetify.ts` — tema, defaults e iconos (set híbrido que resuelve a Tabler).
- `constants/appIcons.ts` — fuente única de iconos; referenciar por clave (`APP_ICONS.package`).
- `assets/styles/` — variables, tipografía (DM Sans / Outfit) e iconos.
- Por agregar siguiendo el estándar de `salonspa_app_v2`: `composables/`, `helpers/`, `interfaces/`, `middleware/`, `store/modules/` (Pinia).

## Autenticación

- `pages/login.vue` + `components/LoginForm.vue` → `POST /api/auth/login`, luego `GET /api/auth/me` para cargar el usuario.
- Tokens en cookies (`access_token`, `refresh_token`) vía `composables/useAuthTokens.ts`; el store Pinia (`store/modules/auth.ts`) guarda token, rol y usuario.
- `plugins/api.ts` expone `$api` (adjunta el Bearer y, ante un 401, renueva con `/api/auth/refresh` y reintenta).
- `middleware/auth.global.ts` protege todo salvo `/login`; `middleware/role.ts` restringe páginas por rol (`allowedRoles` en `definePageMeta`).
- `layouts/app.vue` (sidebar + barra superior) envuelve las páginas bajo `/app`; agregar módulos en `components/app/shared/AppSidebar.vue`.

Antes del primer login hay que inicializar el backend una vez con `POST /api/auth/bootstrap` (ver README del backend).

## Pendiente

Las pantallas de cada etapa del backend (productos, almacenes, proveedores...).

## Usuarios, roles y auditoría (etapa 8)

- `pages/app/users/index.vue` — lista, alta, edición y restablecer contraseña (`components/app/users/UserForm.vue`, `UserPasswordDialog.vue`). Solo admins.
- `pages/app/audit/index.vue` — auditoría con filtros por entidad, acción, usuario y fechas. Solo admins.
- Roles (`interfaces/userInterfaces.ts`): `ADMIN_USER`, `WAREHOUSE_USER` (Encargado de almacén), `PURCHASING_USER` (Compras), `VIEWER` (Solo lectura), más `SUPER_ADMIN`.
- `store/modules/auth.ts` expone qué ofrece la interfaz por rol: `canManage`, `canManagePurchases`, `canOperateStock`, `canReceiveGoods`. Ocultar un botón es solo cortesía: el que decide es el backend.
- El rol del store sale de `/api/auth/me` (la base de datos), no del token, que puede tener un día.
- Si un usuario está limitado a ciertos almacenes, la API ya devuelve solo esos: los selectores y tablas salen filtrados sin lógica extra.
