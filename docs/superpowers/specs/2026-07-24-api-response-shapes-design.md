# API response-shape corrections (backend handoff alignment)

**Dátum**: 2026-07-24
**Státusz**: Elfogadva

## Cél

A backend csapat hivatalos "Frontend API handoff" dokumentuma pontosítja a válasz- (és néhol kérés-) formákat a korábban feltételezett alakokhoz képest. Ez a spec a `src/api/**` és `src/hooks/api/**` rétegben szükséges korrekciókat rögzíti — **nincs új endpoint, nincs útvonalváltozás**, csak típus-/válaszalak-pontosítás, plusz két valódi kérés-body eltérés.

Forrás: a felhasználó által beillesztett handoff dokumentum (2026-07-24).

## Alapelv

Ahol a handoff konkrét választ ad, ott a korábbi `unknown`/generikus típus lecserélődik a pontos alakra. Ahol a handoff nem ad konkrétumot (composition, load groups, reports, remote-adapter — ezekre csak "usually 200 with an object/array" jellegű általános leírás van), **nem változik semmi** — nincs mit spekulatívan hozzáadni.

## Modulonkénti változások

### Auth (`src/api/types/auth.ts`, `src/api/auth.ts`)
- `LoginRequest.email` → `LoginRequest.username` (a backend `username` mezőt vár, nem `email`-t). A `login()` függvény logikája változatlan, csak a payload mező neve.

### Users (`src/api/types/users.ts`, `src/api/users.ts`, `src/hooks/api/useUsers.ts`)
- `getHistory` visszatérési típusa `unknown` helyett `HistoryEntry[]`, ahol `HistoryEntry { user: string; date: string; operation: string }`.
- `getSoftwareVersion` visszatérési típusa `SoftwareVersion { version: string }`.
- `getUserList`/`getUser` visszatérési típusa `User[]`/`User`, ahol `User { id: number; username: string; email: string; first_name: string; last_name: string; is_active: boolean; role: string; level: number; company: string }`.
- role/level/block PUT válaszok: a handoff csak "200"-at ír konkrét body nélkül — ezek maradnak `Promise<unknown>`.

### Projects (`src/api/types/projects.ts`, `src/api/projects.ts`, `src/hooks/api/useProjects.ts`)
- `createProject` visszatérési típusa `{ uuid: string }` (nem `{ id }` — a projekt UUID-t a válasz `uuid` kulcs alatt adja vissza). Új típus: `ProjectCreateResponse { uuid: string }`.
- `Project` interfész konkrét mezőkkel bővül: `uuid, name, description?, state: ProjectState, created_at: string, last_modified: string, user: string` (az `id` mező marad-e vagy `uuid`-ra cserélődik: a lista/detail válasz `uuid` kulcsot használ, tehát a `Project.id: string` mező `Project.uuid: string`-re változik).
- `updateProject` visszatérési típusa `Promise<unknown>`-ra változik (a handoff szerint "usually 200 with empty body", nem a frissített objektum).
- `getProjectLog` visszatérési típusa `{ log: ProjectLogEntry[] }`, ahol `ProjectLogEntry { level: string; logger: string; message: string; module: string; function_name: string; line_number: number; created: number; process: number; thread: number }` (megegyezik a remote-adapter log payload alakjával, de ez egy külön, a projects domainhez tartozó típus marad — nem importáljuk kereszt-domain).

### Geometry (`src/api/types/geometry.ts`, `src/api/geometry.ts`, `src/hooks/api/useGeometry.ts`)
- `createGeometry` visszatérési típusa `{ id: number }` (nem a teljes `Geometry` objektum).
- `Geometry` interfész konkrét mezőkkel bővül (lista alak): `id: number; name: string; user: string; description?: string; created_at: string; last_modified: string; valid: boolean`.
- `getGeometryEdgesPreview` és `getGeometrySparsPreview` visszatérési típusa `Blob`-ra változik, `responseType: 'blob'` hozzáadásával (a handoff szerint ezek SVG bináris fájlt adnak vissza, nem JSON-t — ez korrekció a korábbi hibás feltételezéshez képest).
- `previewGeometryProfile` (POST profiles/preview) és `getGeometryProfile` (GET profiles/:id) visszatérési típusa `number[][]` (pontpárok tömbje), nem becsomagolt objektum.
- **Profile-generator payload alak megváltozik**: a régi `{ profile_generator_parameters: { start_position, end_position, profile_count } }` helyett az új, lapos `{ start_position: number; end_position: number; parameters: GeometryProfileParameter[] }`. A válasz `{ profiles: GeneratedProfile[] }`, ahol `GeneratedProfile { name: string; position: number; type: string; parameters: GeometryProfileParameter[] }` — ez egy új, a `GeometryProfile`-tól különböző típus (nincs `id`/`file` mező, mert ez egy javasolt/generált profil, nem tárolt entitás).
- `getGeometryTopView` visszatérési típusa `GeometryTopView { leading_edge: number[][]; trailing_edge: number[][]; profiles: unknown[]; nominal_radius: number }`.

### Materials (`src/api/types/materials.ts`, `src/api/materials.ts`, `src/hooks/api/useMaterials.ts`)
- `createMaterial` visszatérési típusa `{ id: number }` (nem a teljes `Material` objektum).
- `Material` interfész konkrét mezőkkel bővül (lista alak): `id: number; user: string; last_modified: string; name: string; date: string; description?: string; type: string`.

### Files (`src/api/types/files.ts`, `src/api/files.ts`, `src/hooks/api/useFiles.ts`)
- `uploadFile` visszatérési típusa `{ uuid: string }` (nem az általános `FileRecord`). Új típus: `FileUploadResponse { uuid: string }`.

### Nincs változás
Composition, Load groups, Reports, Remote adapter modulok — a handoff nem ad konkrét, az eddigi implementációtól eltérő alakot ezekre, így ezek a fájlok érintetlenek maradnak ebben a körben.

## Nem implementált (változatlanul)
`/auth/password/change/`, `/profile/`, `/picture/list/` — továbbra sem léteznek a backendben.

## Tesztelés
Ugyanaz a mérce, mint az eredeti tervben: `npx tsc --noEmit` taskonként, `npm run build` a végén. Nincs test framework.
