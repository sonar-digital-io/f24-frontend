# API integráció — Django REST backend

**Dátum**: 2026-07-24
**Státusz**: Tervezet

## Cél

Teljes API réteg felépítése a Django REST Framework backendhez, domainenkénti nyers axios
hívásokkal + React Query hookokkal. A meglévő mock adatok (`src/data/*.ts`) és a jelenlegi
page/komponens kód **változatlan** marad — ez a kör csak az `src/api/` és `src/hooks/api/`
réteget építi meg, a komponensekbe kötés külön feladat.

Nem implementált (nincs backend endpoint hozzá): `/auth/password/change/`, `/profile/`,
`/picture/list/`.

## Auth modell

- Session/cookie alapú: minden axios hívás `withCredentials: true`.
- Login válasz body-ból (`X-CSRFToken`, `user_id`) kiolvasva, **localStorage**-ban tárolva
  (`f24_auth` kulcs, JSON: `{ csrfToken: string, userId: number }`).
- Minden nem-GET kérés request interceptora ráteszi a `X-CSRFToken` headert, ha van tárolt token.
- 401 válasznál a response interceptor törli a tárolt auth state-et (`authStorage.clear()`).
- Logout hívás után szintén törlődik a tárolt state.

## Fájlstruktúra

```
src/api/
├── client.ts                # axios instance: baseURL=VITE_API_URL, withCredentials, CSRF interceptor
├── authStorage.ts            # localStorage get/set/clear a { csrfToken, userId } state-hez
├── auth.ts                   # login, logout
├── users.ts                  # history, software version, settings, user list/detail/delete/role/level/block
├── projects.ts               # project CRUD + settings/composition/geometry/load/fatigue/state/export/log
├── geometry.ts                # geometry CRUD + settings/edges/profiles/spars/tools/export/top-view/result
├── composition.ts            # composition CRUD + settings/geometry/layup/mapping/intersections/core-material/preview
├── materials.ts               # material CRUD + mechanical-properties/fatigue-properties/export
├── loadGroups.ts              # load group CRUD + limits/load-cases/fatigue-profiles
├── reports.ts                  # report list/detail/delete/export/file-list
├── files.ts                    # file upload (POST multipart)/get/put/delete
├── remoteAdapter.ts             # remote-adapter list/start/stop/download/upload/log
└── types/
    ├── auth.ts, users.ts, projects.ts, geometry.ts, composition.ts,
    ├── materials.ts, loadGroups.ts, reports.ts, files.ts, remoteAdapter.ts
    # domain DTO típusok — request/response shape-ek, ELKÜLÖNÍTVE a src/types.ts UI-state típusaitól

src/hooks/api/
├── useAuth.ts                 # useLogin, useLogout mutation hookok
├── useUsers.ts
├── useProjects.ts
├── useGeometry.ts
├── useComposition.ts
├── useMaterials.ts
├── useLoadGroups.ts
├── useReports.ts
├── useFiles.ts
└── useRemoteAdapter.ts
```

Minden `use<Domain>.ts` exportál egy `<domain>Keys` query-key konstans objektumot
(pl. `projectKeys.list()`, `projectKeys.detail(id)`) és a hozzá tartozó `useQuery`/`useMutation`
hookokat. Mutation-ök sikeres válasz után a releváns query-ket invalidálják
(`queryClient.invalidateQueries({ queryKey: projectKeys.list() })`).

## Client konfiguráció

`src/api/client.ts`:
- `baseURL: import.meta.env.VITE_API_URL` (dev: `http://127.0.0.1:8000/api/v1/`) — `.env.example`
  frissítve erre.
- `withCredentials: true`
- Request interceptor: `X-CSRFToken` header hozzáadása `authStorage.get()?.csrfToken` alapján,
  ha a metódus nem GET.
- Response interceptor: 401 esetén `authStorage.clear()`, majd az error újra el van dobva
  (a hívó fél dönt a redirect/toast logikáról — ez a kör nem köti be UI-ba).

Minden domain modul ugyanezt az `apiClient`-et importálja, nincs külön axios instance.

## Végpont ↔ modul leképezés

Az összes endpoint pontosan a felhasználó által megadott kontraktus szerint (URL, method, body,
query param) kerül implementálásra `{baseUrl}{endpoint}` formában (a `baseURL` már tartalmazza
az `/api/v1/` prefixet, a domain modulok relatív path-eket hívnak, pl. `apiClient.post('/auth/login/', ...)`).

- **auth.ts**: `POST /auth/login/`, `POST /auth/logout/`
- **users.ts**: `GET /history/`, `GET /software/version/`, `GET|PUT /settings/:userId/`,
  `GET /user/list/`, `GET|DELETE /user/:userId/`, `PUT /user/:userId/role/`,
  `PUT /user/:userId/level/`, `PUT /user/:userId/block/`
- **projects.ts**: `POST /project/`, `GET /project/list/`, `GET|PUT|DELETE /project/:id/`,
  `PUT /project/:id/settings/`, `PUT /project/:id/composition/`, `PUT /project/:id/geometry/`,
  `PUT /project/:id/load/`, `PUT /project/:id/fatigue/`, `GET|PUT /project/:id/state/`,
  `GET /project/:id/export/` (blob), `GET /project/:id/log/` (optional `from`, `limit` query)
- **geometry.ts**: `POST /geometry/`, `GET /geometry/list/`, `GET|PUT|DELETE /geometry/:id/`,
  `PUT /geometry/:id/settings/`, `GET|PUT /geometry/:id/edges/`,
  `GET /geometry/:id/edges/preview/` (`resolution` query), `GET|PUT /geometry/:id/profiles/`,
  `POST /geometry/:id/profiles/preview/`, `GET /geometry/:id/profiles/:profileId/`
  (`resolution`, `standard` query), `GET /geometry/:id/result/` (blob/STL),
  `GET|PUT /geometry/:id/spars/`, `GET /geometry/:id/spars/preview/`,
  `GET /geometry/:id/top-view/`, `POST|PUT /geometry/:id/tools/profile-generator/`,
  `GET /geometry/:id/export/` (blob)
- **composition.ts**: `POST /composition/`, `GET /composition/list/`,
  `GET|PUT|DELETE /composition/:id/`, `PUT /composition/:id/settings/`,
  `PUT /composition/:id/geometry/`, `PUT /composition/:id/layup/`,
  `PUT /composition/:id/mapping/longitudinal/`, `PUT /composition/:id/mapping/transversal/`,
  `GET /composition/:id/intersections/`, `PUT /composition/:id/core-material/`,
  `GET /composition/:id/preview/`
- **materials.ts**: `POST /material/`, `GET /material/list/`, `GET|PUT|DELETE /material/:id/`,
  `PUT /material/:id/mechanical-properties/`, `PUT /material/:id/fatigue-properties/`,
  `GET /material/:id/export/` (blob)
- **loadGroups.ts**: `POST /load/`, `GET /load/list/`, `GET|PUT|DELETE /load/:id/`,
  `PUT /load/:id/limits/`, `GET|PUT /load/:id/load-cases/`, `GET|PUT /load/:id/fatigue-profiles/`
- **reports.ts**: `GET /report/list/`, `GET|DELETE /report/:id/`, `GET /report/:id/export/` (blob),
  `GET /report/:id/file/list/`
- **files.ts**: `POST /file/` (multipart: file, name?, description?), `GET /file/:id/` (blob),
  `PUT|DELETE /file/:id/`
- **remoteAdapter.ts**: `GET /remote-adapter/list/`, `POST /remote-adapter/:taskId/start/`,
  `POST /remote-adapter/:taskId/stop/`,
  `GET /remote-adapter/:taskId/download/` (`client_id`, `index`, `chunk_size` query, blob),
  `POST /remote-adapter/:taskId/upload/` (multipart: file, metadata JSON string),
  `POST /remote-adapter/:taskId/log/`

## Hiba kezelés

- Nincs globális toast/error UI bekötés ebben a körben (a komponensek nincsenek bekötve).
- A response interceptor csak a 401 → auth-clear logikát végzi; minden más hibát a hívó fél
  (React Query hook consumer) kezel a szokásos `isError`/`error` state-en keresztül.

## Tesztelés

- Nincs jelenlegi teszt-infrastruktúra a projektben (nincs vitest/jest telepítve) — ez a kör nem
  vezet be új tesztelési függőséget. Manuális ellenőrzés: `npm run build` (tsc) sikeres fordítás,
  és egy rövid smoke-check `npm run dev` mellett a böngésző console-ban (auth login hívás ellenőrzése
  a Network tab-on).

## Környezeti változó

`.env.example` és lokális `.env` frissítve:
```
VITE_API_URL=http://127.0.0.1:8000/api/v1/
```
