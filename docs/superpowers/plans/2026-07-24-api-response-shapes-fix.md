# API Response-Shape Corrections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct response/request types in the existing `src/api/**` + `src/hooks/api/**` layer to match the backend team's official "Frontend API handoff" document, without adding endpoints or changing routes.

**Architecture:** Each task rewrites 1-2 existing files (a domain's `types/<domain>.ts` and/or `<domain>.ts`) in place. No new files, no hook-file changes are needed except where explicitly noted, since none of the touched hook files import the affected type names directly (verified per-task below).

**Tech Stack:** axios 1.18, @tanstack/react-query 5.101, TypeScript 5.9 (strict mode).

## Global Constraints

- No new endpoints, no route/path changes — only response/request type corrections.
- `src/data/*.ts` and existing pages/components remain untouched.
- Composition, Load groups, Reports, Remote adapter modules are **not touched** in this plan — the handoff gives no concrete shape different from what's already implemented.
- No test framework installed — verification per task is `npx tsc --noEmit` (must exit 0).
- **Do not run `git commit` beyond the one commit per task** — task-level commits are allowed (established in the prior round), no extra/unsolicited commits.

---

### Task 1: Auth — login field correction

**Files:**
- Modify: `src/api/types/auth.ts`

**Interfaces:**
- Produces: `LoginRequest { username: string; password: string }` (field renamed from `email` to `username`). `LoginResponse` unchanged.

- [ ] **Step 1: Rewrite `src/api/types/auth.ts`**

```ts
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  'X-CSRFToken': string;
  user_id: number;
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: exits 0. (`src/api/auth.ts` and `src/hooks/api/useAuth.ts` need no changes — they pass `LoginRequest` through generically without referencing the `email`/`username` field name.)

---

### Task 2: Users — concrete response types

**Files:**
- Modify: `src/api/types/users.ts`
- Modify: `src/api/users.ts`

**Interfaces:**
- Produces: `HistoryEntry { user: string; date: string; operation: string }`, `SoftwareVersion { version: string }`, `User { id: number; username: string; email: string; first_name: string; last_name: string; is_active: boolean; role: string; level: number; company: string }` (from `src/api/types/users.ts`); `getHistory(): Promise<HistoryEntry[]>`, `getSoftwareVersion(): Promise<SoftwareVersion>`, `getUserList(): Promise<User[]>`, `getUser(): Promise<User>` (from `src/api/users.ts`, replacing `unknown`/`unknown[]`).

- [ ] **Step 1: Rewrite `src/api/types/users.ts`**

```ts
export interface HistoryEntry {
  user: string;
  date: string;
  operation: string;
}

export interface SoftwareVersion {
  version: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  role: string;
  level: number;
  company: string;
}

export interface UserSettings {
  parameters: import('./common').KeyValuePair[];
}

export interface UserRolePayload {
  role: string;
}

export interface UserLevelPayload {
  level: number;
}

export interface UserBlockPayload {
  is_active: boolean;
}
```

- [ ] **Step 2: Rewrite `src/api/users.ts`**

```ts
import { apiClient } from './client';
import type { KeyValuePair } from './types/common';
import type {
  UserSettings,
  UserRolePayload,
  UserLevelPayload,
  UserBlockPayload,
  HistoryEntry,
  SoftwareVersion,
  User,
} from './types/users';

export async function getHistory(startDate: string, endDate: string): Promise<HistoryEntry[]> {
  const { data } = await apiClient.get<HistoryEntry[]>('/history/', {
    params: { 'start-date': startDate, 'end-date': endDate },
  });
  return data;
}

export async function getSoftwareVersion(): Promise<SoftwareVersion> {
  const { data } = await apiClient.get<SoftwareVersion>('/software/version/');
  return data;
}

export async function getUserSettings(userId: number): Promise<UserSettings> {
  const { data } = await apiClient.get<UserSettings>(`/settings/${userId}/`);
  return data;
}

export async function updateUserSettings(userId: number, parameters: KeyValuePair[]): Promise<UserSettings> {
  const { data } = await apiClient.put<UserSettings>(`/settings/${userId}/`, { parameters });
  return data;
}

export async function getUserList(): Promise<User[]> {
  const { data } = await apiClient.get<User[]>('/user/list/');
  return data;
}

export async function getUser(userId: number): Promise<User> {
  const { data } = await apiClient.get<User>(`/user/${userId}/`);
  return data;
}

export async function deleteUser(userId: number): Promise<void> {
  await apiClient.delete(`/user/${userId}/`);
}

export async function updateUserRole(userId: number, payload: UserRolePayload): Promise<unknown> {
  const { data } = await apiClient.put(`/user/${userId}/role/`, payload);
  return data;
}

export async function updateUserLevel(userId: number, payload: UserLevelPayload): Promise<unknown> {
  const { data } = await apiClient.put(`/user/${userId}/level/`, payload);
  return data;
}

export async function updateUserBlock(userId: number, payload: UserBlockPayload): Promise<unknown> {
  const { data } = await apiClient.put(`/user/${userId}/block/`, payload);
  return data;
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: exits 0. (`src/hooks/api/useUsers.ts` needs no changes — it doesn't import `HistoryEntry`/`SoftwareVersion`/`User` by name, it just calls through the api functions.)

---

### Task 3: Projects — create response, list/detail shape, log shape

**Files:**
- Modify: `src/api/types/projects.ts`
- Modify: `src/api/projects.ts`

**Interfaces:**
- Produces: `ProjectCreateResponse { uuid: string }`, `Project { uuid: string; name: string; description?: string; state: ProjectState; created_at: string; last_modified: string; user: string }` (replacing the old `id`-based shape), `ProjectLogEntry`, `ProjectLogResponse { log: ProjectLogEntry[] }` (from `src/api/types/projects.ts`); `createProject(): Promise<ProjectCreateResponse>`, `updateProject(): Promise<unknown>`, `getProjectLog(): Promise<ProjectLogResponse>` (from `src/api/projects.ts`).
- Consumes: nothing new — `src/hooks/api/useProjects.ts` does not import `Project` or `ProjectLogResponse` by name (it only takes `projectId: string` as a parameter), so it needs no changes.

- [ ] **Step 1: Rewrite `src/api/types/projects.ts`**

```ts
import type { KeyValuePair } from './common';

export interface ProjectPayload {
  name: string;
  description?: string;
}

export interface ProjectCreateResponse {
  uuid: string;
}

export type ProjectState = 'RUNNING' | 'STOPPED' | (string & {});

export interface Project {
  uuid: string;
  name: string;
  description?: string;
  state: ProjectState;
  created_at: string;
  last_modified: string;
  user: string;
}

export interface ProjectSettingsPayload {
  settings: KeyValuePair[];
}

export interface ProjectCompositionPayload {
  composition: number;
}

export interface ProjectGeometryPayload {
  geometry: number;
}

export interface ProjectLoadPayload {
  load_group: number;
}

export interface ProjectFatiguePayload {
  fatigue_profile: number;
}

export interface ProjectStatePayload {
  state: ProjectState;
}

export interface ProjectLogQuery {
  from?: string;
  limit?: number;
}

export interface ProjectLogEntry {
  level: string;
  logger: string;
  message: string;
  module: string;
  function_name: string;
  line_number: number;
  created: number;
  process: number;
  thread: number;
}

export interface ProjectLogResponse {
  log: ProjectLogEntry[];
}
```

- [ ] **Step 2: Rewrite `src/api/projects.ts`**

```ts
import { apiClient } from './client';
import type {
  ProjectPayload,
  ProjectCreateResponse,
  Project,
  ProjectSettingsPayload,
  ProjectCompositionPayload,
  ProjectGeometryPayload,
  ProjectLoadPayload,
  ProjectFatiguePayload,
  ProjectStatePayload,
  ProjectLogQuery,
  ProjectLogResponse,
} from './types/projects';

export async function createProject(payload: ProjectPayload): Promise<ProjectCreateResponse> {
  const { data } = await apiClient.post<ProjectCreateResponse>('/project/', payload);
  return data;
}

export async function getProjectList(): Promise<Project[]> {
  const { data } = await apiClient.get<Project[]>('/project/list/');
  return data;
}

export async function getProject(projectId: string): Promise<Project> {
  const { data } = await apiClient.get<Project>(`/project/${projectId}/`);
  return data;
}

export async function updateProject(projectId: string, payload: ProjectPayload): Promise<unknown> {
  const { data } = await apiClient.put(`/project/${projectId}/`, payload);
  return data;
}

export async function deleteProject(projectId: string): Promise<void> {
  await apiClient.delete(`/project/${projectId}/`);
}

export async function updateProjectSettings(projectId: string, payload: ProjectSettingsPayload): Promise<unknown> {
  const { data } = await apiClient.put(`/project/${projectId}/settings/`, payload);
  return data;
}

export async function updateProjectComposition(projectId: string, payload: ProjectCompositionPayload): Promise<unknown> {
  const { data } = await apiClient.put(`/project/${projectId}/composition/`, payload);
  return data;
}

export async function updateProjectGeometry(projectId: string, payload: ProjectGeometryPayload): Promise<unknown> {
  const { data } = await apiClient.put(`/project/${projectId}/geometry/`, payload);
  return data;
}

export async function updateProjectLoad(projectId: string, payload: ProjectLoadPayload): Promise<unknown> {
  const { data } = await apiClient.put(`/project/${projectId}/load/`, payload);
  return data;
}

export async function updateProjectFatigue(projectId: string, payload: ProjectFatiguePayload): Promise<unknown> {
  const { data } = await apiClient.put(`/project/${projectId}/fatigue/`, payload);
  return data;
}

export async function getProjectState(projectId: string): Promise<ProjectStatePayload> {
  const { data } = await apiClient.get<ProjectStatePayload>(`/project/${projectId}/state/`);
  return data;
}

export async function updateProjectState(projectId: string, payload: ProjectStatePayload): Promise<ProjectStatePayload> {
  const { data } = await apiClient.put<ProjectStatePayload>(`/project/${projectId}/state/`, payload);
  return data;
}

export async function exportProject(projectId: string): Promise<Blob> {
  const { data } = await apiClient.get(`/project/${projectId}/export/`, { responseType: 'blob' });
  return data;
}

export async function getProjectLog(projectId: string, query?: ProjectLogQuery): Promise<ProjectLogResponse> {
  const { data } = await apiClient.get<ProjectLogResponse>(`/project/${projectId}/log/`, { params: query });
  return data;
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: exits 0.

---

### Task 4: Geometry — create response, list shape, binary previews, profile-generator contract change

**Files:**
- Modify: `src/api/types/geometry.ts`
- Modify: `src/api/geometry.ts`

**Interfaces:**
- Produces: `GeometryCreateResponse { id: number }`, `Geometry { id: number; name: string; user: string; description?: string; created_at: string; last_modified: string; valid: boolean }`, `GeometryTopView`, `ProfileGeneratorPayload { start_position: number; end_position: number; parameters: GeometryProfileParameter[] }` (flat, replacing the old `profile_generator_parameters` wrapper with `profile_count`), `GeneratedProfile`, `ProfileGeneratorResponse { profiles: GeneratedProfile[] }` (from `src/api/types/geometry.ts`); `createGeometry(): Promise<GeometryCreateResponse>`, `getGeometryEdgesPreview(): Promise<Blob>`, `getGeometrySparsPreview(): Promise<Blob>`, `previewGeometryProfile(): Promise<number[][]>`, `getGeometryProfile(): Promise<number[][]>`, `getGeometryTopView(): Promise<GeometryTopView>`, `runProfileGenerator()`/`updateProfileGenerator(): Promise<ProfileGeneratorResponse>` (from `src/api/geometry.ts`).
- Consumes: nothing new — `src/hooks/api/useGeometry.ts` does not import `Geometry`, `GeometryTopView`, or `GeneratedProfile` by name, so it needs no changes. It does import `ProfileGeneratorPayload` by name, but only passes it through opaquely (`{ geometryId, payload }: { geometryId: number; payload: ProfileGeneratorPayload }`) — the shape change doesn't require touching the hook file, callers just need to pass the new flat shape once this is wired into UI later.

- [ ] **Step 1: Rewrite `src/api/types/geometry.ts`**

```ts
import type { KeyValuePair } from './common';

export interface GeometryPayload {
  name: string;
  description?: string;
}

export interface GeometryCreateResponse {
  id: number;
}

export interface Geometry {
  id: number;
  name: string;
  user: string;
  description?: string;
  created_at: string;
  last_modified: string;
  valid: boolean;
}

export interface GeometrySettingsPayload {
  settings: KeyValuePair[];
}

export interface GeometryEdge {
  id: number;
  edge_type: string;
  curve_type: string;
  ymin: number;
  ymax: number;
  curve: number[];
}

export interface GeometryEdgesPayload {
  edges: GeometryEdge[];
}

export interface GeometryProfileParameter {
  reference: string;
  value: number | string;
}

export interface GeometryProfile {
  id: number;
  name: string;
  position: number;
  type: string;
  file: string | null;
  parameters: GeometryProfileParameter[];
}

export interface GeometryProfilesPayload {
  profiles: GeometryProfile[];
}

export interface GeometryProfilePreviewPayload {
  type: string;
  position: number;
  parameters: GeometryProfileParameter[];
}

export interface GeometryProfileQuery {
  resolution?: number;
  standard?: boolean;
}

export interface GeometrySparsPayload {
  twist: boolean;
  parallel: boolean;
  spars: unknown[];
}

export interface GeometryTopView {
  leading_edge: number[][];
  trailing_edge: number[][];
  profiles: unknown[];
  nominal_radius: number;
}

export interface ProfileGeneratorPayload {
  start_position: number;
  end_position: number;
  parameters: GeometryProfileParameter[];
}

export interface GeneratedProfile {
  name: string;
  position: number;
  type: string;
  parameters: GeometryProfileParameter[];
}

export interface ProfileGeneratorResponse {
  profiles: GeneratedProfile[];
}
```

- [ ] **Step 2: Rewrite `src/api/geometry.ts`**

```ts
import { apiClient } from './client';
import type {
  GeometryPayload,
  GeometryCreateResponse,
  Geometry,
  GeometrySettingsPayload,
  GeometryEdgesPayload,
  GeometryProfilesPayload,
  GeometryProfilePreviewPayload,
  GeometryProfileQuery,
  GeometrySparsPayload,
  GeometryTopView,
  ProfileGeneratorPayload,
  ProfileGeneratorResponse,
} from './types/geometry';

export async function createGeometry(payload: GeometryPayload): Promise<GeometryCreateResponse> {
  const { data } = await apiClient.post<GeometryCreateResponse>('/geometry/', payload);
  return data;
}

export async function getGeometryList(): Promise<Geometry[]> {
  const { data } = await apiClient.get<Geometry[]>('/geometry/list/');
  return data;
}

export async function getGeometry(geometryId: number): Promise<Geometry> {
  const { data } = await apiClient.get<Geometry>(`/geometry/${geometryId}/`);
  return data;
}

export async function updateGeometry(geometryId: number, payload: GeometryPayload): Promise<Geometry> {
  const { data } = await apiClient.put<Geometry>(`/geometry/${geometryId}/`, payload);
  return data;
}

export async function deleteGeometry(geometryId: number): Promise<void> {
  await apiClient.delete(`/geometry/${geometryId}/`);
}

export async function updateGeometrySettings(geometryId: number, payload: GeometrySettingsPayload): Promise<unknown> {
  const { data } = await apiClient.put(`/geometry/${geometryId}/settings/`, payload);
  return data;
}

export async function getGeometryEdges(geometryId: number): Promise<GeometryEdgesPayload> {
  const { data } = await apiClient.get<GeometryEdgesPayload>(`/geometry/${geometryId}/edges/`);
  return data;
}

export async function updateGeometryEdges(geometryId: number, payload: GeometryEdgesPayload): Promise<GeometryEdgesPayload> {
  const { data } = await apiClient.put<GeometryEdgesPayload>(`/geometry/${geometryId}/edges/`, payload);
  return data;
}

export async function getGeometryEdgesPreview(geometryId: number, resolution: number): Promise<Blob> {
  const { data } = await apiClient.get(`/geometry/${geometryId}/edges/preview/`, {
    params: { resolution },
    responseType: 'blob',
  });
  return data;
}

export async function getGeometryProfiles(geometryId: number): Promise<GeometryProfilesPayload> {
  const { data } = await apiClient.get<GeometryProfilesPayload>(`/geometry/${geometryId}/profiles/`);
  return data;
}

export async function updateGeometryProfiles(geometryId: number, payload: GeometryProfilesPayload): Promise<GeometryProfilesPayload> {
  const { data } = await apiClient.put<GeometryProfilesPayload>(`/geometry/${geometryId}/profiles/`, payload);
  return data;
}

export async function previewGeometryProfile(geometryId: number, payload: GeometryProfilePreviewPayload): Promise<number[][]> {
  const { data } = await apiClient.post<number[][]>(`/geometry/${geometryId}/profiles/preview/`, payload);
  return data;
}

export async function getGeometryProfile(geometryId: number, profileId: number, query?: GeometryProfileQuery): Promise<number[][]> {
  const { data } = await apiClient.get<number[][]>(`/geometry/${geometryId}/profiles/${profileId}/`, { params: query });
  return data;
}

export async function getGeometryResult(geometryId: number): Promise<Blob> {
  const { data } = await apiClient.get(`/geometry/${geometryId}/result/`, { responseType: 'blob' });
  return data;
}

export async function getGeometrySpars(geometryId: number): Promise<GeometrySparsPayload> {
  const { data } = await apiClient.get<GeometrySparsPayload>(`/geometry/${geometryId}/spars/`);
  return data;
}

export async function updateGeometrySpars(geometryId: number, payload: GeometrySparsPayload): Promise<GeometrySparsPayload> {
  const { data } = await apiClient.put<GeometrySparsPayload>(`/geometry/${geometryId}/spars/`, payload);
  return data;
}

export async function getGeometrySparsPreview(geometryId: number): Promise<Blob> {
  const { data } = await apiClient.get(`/geometry/${geometryId}/spars/preview/`, { responseType: 'blob' });
  return data;
}

export async function getGeometryTopView(geometryId: number): Promise<GeometryTopView> {
  const { data } = await apiClient.get<GeometryTopView>(`/geometry/${geometryId}/top-view/`);
  return data;
}

export async function runProfileGenerator(geometryId: number, payload: ProfileGeneratorPayload): Promise<ProfileGeneratorResponse> {
  const { data } = await apiClient.post<ProfileGeneratorResponse>(`/geometry/${geometryId}/tools/profile-generator/`, payload);
  return data;
}

export async function updateProfileGenerator(geometryId: number, payload: ProfileGeneratorPayload): Promise<ProfileGeneratorResponse> {
  const { data } = await apiClient.put<ProfileGeneratorResponse>(`/geometry/${geometryId}/tools/profile-generator/`, payload);
  return data;
}

export async function exportGeometry(geometryId: number): Promise<Blob> {
  const { data } = await apiClient.get(`/geometry/${geometryId}/export/`, { responseType: 'blob' });
  return data;
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: exits 0.

---

### Task 5: Materials — create response, list shape

**Files:**
- Modify: `src/api/types/materials.ts`
- Modify: `src/api/materials.ts`

**Interfaces:**
- Produces: `MaterialCreateResponse { id: number }`, `Material { id: number; user: string; last_modified: string; name: string; date: string; description?: string; type: string }` (from `src/api/types/materials.ts`); `createMaterial(): Promise<MaterialCreateResponse>` (from `src/api/materials.ts`).
- Consumes: nothing new — `src/hooks/api/useMaterials.ts` does not import `Material` by name, so it needs no changes.

- [ ] **Step 1: Rewrite `src/api/types/materials.ts`**

```ts
import type { KeyValuePair } from './common';

export interface MaterialPayload {
  name: string;
  description?: string;
  mechanical_properties: KeyValuePair[];
  fatigue_properties: KeyValuePair[];
}

export interface MaterialCreateResponse {
  id: number;
}

export interface Material {
  id: number;
  user: string;
  last_modified: string;
  name: string;
  date: string;
  description?: string;
  type: string;
}

export interface MaterialMechanicalPropertiesPayload {
  mechanical_properties: KeyValuePair[];
}

export interface MaterialFatiguePropertiesPayload {
  fatigue_properties: KeyValuePair[];
}
```

- [ ] **Step 2: Rewrite `src/api/materials.ts`**

```ts
import { apiClient } from './client';
import type {
  MaterialPayload,
  MaterialCreateResponse,
  Material,
  MaterialMechanicalPropertiesPayload,
  MaterialFatiguePropertiesPayload,
} from './types/materials';

export async function createMaterial(payload: MaterialPayload): Promise<MaterialCreateResponse> {
  const { data } = await apiClient.post<MaterialCreateResponse>('/material/', payload);
  return data;
}

export async function getMaterialList(): Promise<Material[]> {
  const { data } = await apiClient.get<Material[]>('/material/list/');
  return data;
}

export async function getMaterial(materialId: number): Promise<Material> {
  const { data } = await apiClient.get<Material>(`/material/${materialId}/`);
  return data;
}

export async function updateMaterial(materialId: number, payload: MaterialPayload): Promise<Material> {
  const { data } = await apiClient.put<Material>(`/material/${materialId}/`, payload);
  return data;
}

export async function deleteMaterial(materialId: number): Promise<void> {
  await apiClient.delete(`/material/${materialId}/`);
}

export async function updateMechanicalProperties(materialId: number, payload: MaterialMechanicalPropertiesPayload): Promise<unknown> {
  const { data } = await apiClient.put(`/material/${materialId}/mechanical-properties/`, payload);
  return data;
}

export async function updateFatigueProperties(materialId: number, payload: MaterialFatiguePropertiesPayload): Promise<unknown> {
  const { data } = await apiClient.put(`/material/${materialId}/fatigue-properties/`, payload);
  return data;
}

export async function exportMaterial(materialId: number): Promise<Blob> {
  const { data } = await apiClient.get(`/material/${materialId}/export/`, { responseType: 'blob' });
  return data;
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: exits 0.

---

### Task 6: Files — upload response shape

**Files:**
- Modify: `src/api/types/files.ts`
- Modify: `src/api/files.ts`

**Interfaces:**
- Produces: `FileUploadResponse { uuid: string }` (from `src/api/types/files.ts`); `uploadFile(): Promise<FileUploadResponse>` (from `src/api/files.ts`, replacing the generic `FileRecord`).
- Consumes: nothing new — `src/hooks/api/useFiles.ts` does not import `FileRecord`/`FileUploadResponse` by name, so it needs no changes.

- [ ] **Step 1: Rewrite `src/api/types/files.ts`**

```ts
export interface FileUploadPayload {
  file: File;
  name?: string;
  description?: string;
}

export interface FileUploadResponse {
  uuid: string;
}

export interface FileRecord {
  id: string;
  name?: string;
  description?: string;
  [key: string]: unknown;
}

export interface FileUpdatePayload {
  name?: string;
  description?: string;
}
```

- [ ] **Step 2: Rewrite `src/api/files.ts`**

```ts
import { apiClient } from './client';
import type { FileUploadPayload, FileUploadResponse, FileRecord, FileUpdatePayload } from './types/files';

export async function uploadFile(payload: FileUploadPayload): Promise<FileUploadResponse> {
  const formData = new FormData();
  formData.append('file', payload.file);
  if (payload.name) formData.append('name', payload.name);
  if (payload.description) formData.append('description', payload.description);
  const { data } = await apiClient.post<FileUploadResponse>('/file/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function getFile(fileId: string): Promise<Blob> {
  const { data } = await apiClient.get(`/file/${fileId}/`, { responseType: 'blob' });
  return data;
}

export async function updateFile(fileId: string, payload: FileUpdatePayload): Promise<FileRecord> {
  const { data } = await apiClient.put<FileRecord>(`/file/${fileId}/`, payload);
  return data;
}

export async function deleteFile(fileId: string): Promise<void> {
  await apiClient.delete(`/file/${fileId}/`);
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: exits 0.

---

### Task 7: Full build verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full production build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 2: Confirm no untouched-module drift**

Run: `git status --porcelain src/data src/pages src/components src/api/composition.ts src/api/types/composition.ts src/hooks/api/useComposition.ts src/api/loadGroups.ts src/api/types/loadGroups.ts src/hooks/api/useLoadGroups.ts src/api/reports.ts src/api/types/reports.ts src/hooks/api/useReports.ts src/api/remoteAdapter.ts src/api/types/remoteAdapter.ts src/hooks/api/useRemoteAdapter.ts`
Expected: empty output (composition/loadGroups/reports/remoteAdapter and all mock data/pages/components are out of scope for this plan and must remain untouched).
