# API Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete `src/api/` + `src/hooks/api/` layer (axios calls + React Query hooks) for every endpoint of the Django REST backend described in `docs/superpowers/specs/2026-07-24-api-integration-design.md`, without touching existing mock data or page components.

**Architecture:** One shared `apiClient` (axios, `withCredentials: true`, CSRF header injection) in `src/api/client.ts`. One `src/api/<domain>.ts` module per backend domain with plain async functions, one `src/api/types/<domain>.ts` per domain with request/response types, one `src/hooks/api/use<Domain>.ts` per domain with React Query `useQuery`/`useMutation` wrappers and a `<domain>Keys` query-key object.

**Tech Stack:** axios 1.18, @tanstack/react-query 5.101, TypeScript 5.9 (strict mode), Vite 7.3.

## Global Constraints

- Base URL dev value: `VITE_API_URL=http://127.0.0.1:8000/api/v1/` (`.env` and `.env.example`).
- Every request goes through the shared `apiClient` — no per-domain axios instances.
- `withCredentials: true` on the client; auth is session/cookie based, not Bearer.
- CSRF token + `user_id` from login response are stored in **localStorage** under key `f24_auth`, via `src/api/authStorage.ts` (not written directly by domain modules).
- Non-GET requests get an `X-CSRFToken` header from stored auth state.
- 401 responses clear the stored auth state via the response interceptor.
- Do **not** modify `src/data/*.ts` or any existing page/component — this plan only adds `src/api/` and `src/hooks/api/` files.
- Not implemented (no backend): `/auth/password/change/`, `/profile/`, `/picture/list/`.
- Response shapes not explicitly defined in the source spec are typed as `unknown` (opaque JSON) or a minimal interface using only fields the spec confirms — do not invent fields.
- No test framework is installed in this project; verification per task is `npx tsc --noEmit` (must exit 0) instead of a unit test run.
- **Do not run `git commit` at any step of this plan** — commits happen only when the user explicitly asks for one in the session executing this plan.

---

### Task 1: Env config, shared client, auth storage, common types

**Files:**
- Modify: `.env.example`
- Create: `.env` (if it doesn't already exist with a `VITE_API_URL`)
- Modify: `src/api/client.ts`
- Create: `src/api/authStorage.ts`
- Create: `src/api/types/common.ts`

**Interfaces:**
- Produces: `apiClient` (default axios instance, exported from `src/api/client.ts`, unchanged export name), `getAuthState(): AuthState | null`, `setAuthState(state: AuthState): void`, `clearAuthState(): void` (all from `src/api/authStorage.ts`), `AuthState { csrfToken: string; userId: number }`, `KeyValuePair { reference: string; value: string | number | boolean }` (from `src/api/types/common.ts`).

- [ ] **Step 1: Update `.env.example` and `.env`**

`.env.example`:
```
VITE_API_URL=http://127.0.0.1:8000/api/v1/
```

Create `.env` with the same content if the file does not already exist:
```
VITE_API_URL=http://127.0.0.1:8000/api/v1/
```

- [ ] **Step 2: Create `src/api/authStorage.ts`**

```ts
const STORAGE_KEY = 'f24_auth';

export interface AuthState {
  csrfToken: string;
  userId: number;
}

export function getAuthState(): AuthState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthState;
  } catch {
    return null;
  }
}

export function setAuthState(state: AuthState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearAuthState(): void {
  localStorage.removeItem(STORAGE_KEY);
}
```

- [ ] **Step 3: Rewrite `src/api/client.ts`**

```ts
import axios from 'axios';
import { getAuthState, clearAuthState } from './authStorage';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  timeout: 10_000,
});

apiClient.interceptors.request.use((config) => {
  const method = config.method?.toLowerCase();
  if (method && method !== 'get') {
    const auth = getAuthState();
    if (auth?.csrfToken) {
      config.headers['X-CSRFToken'] = auth.csrfToken;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthState();
    }
    return Promise.reject(error);
  }
);
```

- [ ] **Step 4: Create `src/api/types/common.ts`**

```ts
export interface KeyValuePair {
  reference: string;
  value: string | number | boolean;
}
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: exits 0, no errors referencing `client.ts`, `authStorage.ts`, or `types/common.ts`.

---

### Task 2: Auth module (`auth.ts` + hook)

**Files:**
- Create: `src/api/types/auth.ts`
- Create: `src/api/auth.ts`
- Create: `src/hooks/api/useAuth.ts`

**Interfaces:**
- Consumes: `apiClient` (Task 1), `setAuthState`/`clearAuthState` (Task 1).
- Produces: `login(payload: LoginRequest): Promise<LoginResponse>`, `logout(): Promise<void>` (from `src/api/auth.ts`); `useLogin()`, `useLogout()` mutation hooks (from `src/hooks/api/useAuth.ts`).

- [ ] **Step 1: Create `src/api/types/auth.ts`**

```ts
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  'X-CSRFToken': string;
  user_id: number;
}
```

- [ ] **Step 2: Create `src/api/auth.ts`**

```ts
import { apiClient } from './client';
import { setAuthState, clearAuthState } from './authStorage';
import type { LoginRequest, LoginResponse } from './types/auth';

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login/', payload);
  setAuthState({ csrfToken: data['X-CSRFToken'], userId: data.user_id });
  return data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout/');
  clearAuthState();
}
```

- [ ] **Step 3: Create `src/hooks/api/useAuth.ts`**

```ts
import { useMutation } from '@tanstack/react-query';
import { login, logout } from '@/api/auth';
import type { LoginRequest } from '@/api/types/auth';

export function useLogin() {
  return useMutation({
    mutationFn: (payload: LoginRequest) => login(payload),
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: () => logout(),
  });
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: exits 0.

---

### Task 3: Users/admin module (`users.ts` + hook)

**Files:**
- Create: `src/api/types/users.ts`
- Create: `src/api/users.ts`
- Create: `src/hooks/api/useUsers.ts`

**Interfaces:**
- Consumes: `apiClient` (Task 1), `KeyValuePair` (Task 1).
- Produces: `getHistory`, `getSoftwareVersion`, `getUserSettings`, `updateUserSettings`, `getUserList`, `getUser`, `deleteUser`, `updateUserRole`, `updateUserLevel`, `updateUserBlock` (from `src/api/users.ts`); `userKeys` object + `useHistory`, `useSoftwareVersion`, `useUserSettings`, `useUpdateUserSettings`, `useUserList`, `useUser`, `useDeleteUser`, `useUpdateUserRole`, `useUpdateUserLevel`, `useUpdateUserBlock` (from `src/hooks/api/useUsers.ts`).

- [ ] **Step 1: Create `src/api/types/users.ts`**

```ts
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

- [ ] **Step 2: Create `src/api/users.ts`**

```ts
import { apiClient } from './client';
import type { KeyValuePair } from './types/common';
import type { UserSettings, UserRolePayload, UserLevelPayload, UserBlockPayload } from './types/users';

export async function getHistory(startDate: string, endDate: string): Promise<unknown> {
  const { data } = await apiClient.get('/history/', {
    params: { 'start-date': startDate, 'end-date': endDate },
  });
  return data;
}

export async function getSoftwareVersion(): Promise<unknown> {
  const { data } = await apiClient.get('/software/version/');
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

export async function getUserList(): Promise<unknown[]> {
  const { data } = await apiClient.get('/user/list/');
  return data;
}

export async function getUser(userId: number): Promise<unknown> {
  const { data } = await apiClient.get(`/user/${userId}/`);
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

- [ ] **Step 3: Create `src/hooks/api/useUsers.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as usersApi from '@/api/users';
import type { KeyValuePair } from '@/api/types/common';
import type { UserRolePayload, UserLevelPayload, UserBlockPayload } from '@/api/types/users';

export const userKeys = {
  history: (startDate: string, endDate: string) => ['users', 'history', startDate, endDate] as const,
  softwareVersion: () => ['users', 'software-version'] as const,
  settings: (userId: number) => ['users', 'settings', userId] as const,
  list: () => ['users', 'list'] as const,
  detail: (userId: number) => ['users', 'detail', userId] as const,
};

export function useHistory(startDate: string, endDate: string) {
  return useQuery({
    queryKey: userKeys.history(startDate, endDate),
    queryFn: () => usersApi.getHistory(startDate, endDate),
  });
}

export function useSoftwareVersion() {
  return useQuery({
    queryKey: userKeys.softwareVersion(),
    queryFn: () => usersApi.getSoftwareVersion(),
  });
}

export function useUserSettings(userId: number) {
  return useQuery({
    queryKey: userKeys.settings(userId),
    queryFn: () => usersApi.getUserSettings(userId),
  });
}

export function useUpdateUserSettings(userId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (parameters: KeyValuePair[]) => usersApi.updateUserSettings(userId, parameters),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.settings(userId) }),
  });
}

export function useUserList() {
  return useQuery({
    queryKey: userKeys.list(),
    queryFn: () => usersApi.getUserList(),
  });
}

export function useUser(userId: number) {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => usersApi.getUser(userId),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => usersApi.deleteUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.list() }),
  });
}

export function useUpdateUserRole(userId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UserRolePayload) => usersApi.updateUserRole(userId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) }),
  });
}

export function useUpdateUserLevel(userId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UserLevelPayload) => usersApi.updateUserLevel(userId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) }),
  });
}

export function useUpdateUserBlock(userId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UserBlockPayload) => usersApi.updateUserBlock(userId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) }),
  });
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: exits 0.

---

### Task 4: Projects module (`projects.ts` + hook)

**Files:**
- Create: `src/api/types/projects.ts`
- Create: `src/api/projects.ts`
- Create: `src/hooks/api/useProjects.ts`

**Interfaces:**
- Consumes: `apiClient` (Task 1), `KeyValuePair` (Task 1).
- Produces: `createProject`, `getProjectList`, `getProject`, `updateProject`, `deleteProject`, `updateProjectSettings`, `updateProjectComposition`, `updateProjectGeometry`, `updateProjectLoad`, `updateProjectFatigue`, `getProjectState`, `updateProjectState`, `exportProject`, `getProjectLog` (from `src/api/projects.ts`); `projectKeys` + matching `use*` hooks (from `src/hooks/api/useProjects.ts`).

- [ ] **Step 1: Create `src/api/types/projects.ts`**

```ts
import type { KeyValuePair } from './common';

export interface ProjectPayload {
  name: string;
  description?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  [key: string]: unknown;
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

export type ProjectState = 'RUNNING' | 'STOPPED';

export interface ProjectStatePayload {
  state: ProjectState;
}

export interface ProjectLogQuery {
  from?: string;
  limit?: number;
}
```

- [ ] **Step 2: Create `src/api/projects.ts`**

```ts
import { apiClient } from './client';
import type {
  ProjectPayload,
  Project,
  ProjectSettingsPayload,
  ProjectCompositionPayload,
  ProjectGeometryPayload,
  ProjectLoadPayload,
  ProjectFatiguePayload,
  ProjectStatePayload,
  ProjectLogQuery,
} from './types/projects';

export async function createProject(payload: ProjectPayload): Promise<Project> {
  const { data } = await apiClient.post<Project>('/project/', payload);
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

export async function updateProject(projectId: string, payload: ProjectPayload): Promise<Project> {
  const { data } = await apiClient.put<Project>(`/project/${projectId}/`, payload);
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

export async function getProjectLog(projectId: string, query?: ProjectLogQuery): Promise<unknown> {
  const { data } = await apiClient.get(`/project/${projectId}/log/`, { params: query });
  return data;
}
```

- [ ] **Step 3: Create `src/hooks/api/useProjects.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as projectsApi from '@/api/projects';
import type {
  ProjectPayload,
  ProjectSettingsPayload,
  ProjectCompositionPayload,
  ProjectGeometryPayload,
  ProjectLoadPayload,
  ProjectFatiguePayload,
  ProjectStatePayload,
  ProjectLogQuery,
} from '@/api/types/projects';

export const projectKeys = {
  list: () => ['projects', 'list'] as const,
  detail: (projectId: string) => ['projects', 'detail', projectId] as const,
  state: (projectId: string) => ['projects', 'state', projectId] as const,
  log: (projectId: string, query?: ProjectLogQuery) => ['projects', 'log', projectId, query] as const,
};

export function useProjectList() {
  return useQuery({
    queryKey: projectKeys.list(),
    queryFn: () => projectsApi.getProjectList(),
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => projectsApi.getProject(projectId),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProjectPayload) => projectsApi.createProject(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.list() }),
  });
}

export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProjectPayload) => projectsApi.updateProject(projectId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) }),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => projectsApi.deleteProject(projectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.list() }),
  });
}

export function useUpdateProjectSettings(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProjectSettingsPayload) => projectsApi.updateProjectSettings(projectId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) }),
  });
}

export function useUpdateProjectComposition(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProjectCompositionPayload) => projectsApi.updateProjectComposition(projectId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) }),
  });
}

export function useUpdateProjectGeometry(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProjectGeometryPayload) => projectsApi.updateProjectGeometry(projectId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) }),
  });
}

export function useUpdateProjectLoad(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProjectLoadPayload) => projectsApi.updateProjectLoad(projectId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) }),
  });
}

export function useUpdateProjectFatigue(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProjectFatiguePayload) => projectsApi.updateProjectFatigue(projectId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) }),
  });
}

export function useProjectState(projectId: string) {
  return useQuery({
    queryKey: projectKeys.state(projectId),
    queryFn: () => projectsApi.getProjectState(projectId),
  });
}

export function useUpdateProjectState(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProjectStatePayload) => projectsApi.updateProjectState(projectId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.state(projectId) }),
  });
}

export function useExportProject() {
  return useMutation({
    mutationFn: (projectId: string) => projectsApi.exportProject(projectId),
  });
}

export function useProjectLog(projectId: string, query?: ProjectLogQuery) {
  return useQuery({
    queryKey: projectKeys.log(projectId, query),
    queryFn: () => projectsApi.getProjectLog(projectId, query),
  });
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: exits 0.

---

### Task 5: Geometry module (`geometry.ts` + hook)

**Files:**
- Create: `src/api/types/geometry.ts`
- Create: `src/api/geometry.ts`
- Create: `src/hooks/api/useGeometry.ts`

**Interfaces:**
- Consumes: `apiClient` (Task 1).
- Produces: `createGeometry`, `getGeometryList`, `getGeometry`, `updateGeometry`, `deleteGeometry`, `updateGeometrySettings`, `getGeometryEdges`, `updateGeometryEdges`, `getGeometryEdgesPreview`, `getGeometryProfiles`, `updateGeometryProfiles`, `previewGeometryProfile`, `getGeometryProfile`, `getGeometryResult`, `getGeometrySpars`, `updateGeometrySpars`, `getGeometrySparsPreview`, `getGeometryTopView`, `runProfileGenerator`, `updateProfileGenerator`, `exportGeometry` (from `src/api/geometry.ts`); `geometryKeys` + matching `use*` hooks (from `src/hooks/api/useGeometry.ts`).

- [ ] **Step 1: Create `src/api/types/geometry.ts`**

```ts
import type { KeyValuePair } from './common';

export interface GeometryPayload {
  name: string;
  description?: string;
}

export interface Geometry {
  id: number;
  name: string;
  description?: string;
  [key: string]: unknown;
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

export interface ProfileGeneratorParameters {
  start_position: number;
  end_position: number;
  profile_count: number;
}

export interface ProfileGeneratorPayload {
  profile_generator_parameters: ProfileGeneratorParameters;
}
```

- [ ] **Step 2: Create `src/api/geometry.ts`**

```ts
import { apiClient } from './client';
import type {
  GeometryPayload,
  Geometry,
  GeometrySettingsPayload,
  GeometryEdgesPayload,
  GeometryProfilesPayload,
  GeometryProfilePreviewPayload,
  GeometryProfileQuery,
  GeometrySparsPayload,
  ProfileGeneratorPayload,
} from './types/geometry';

export async function createGeometry(payload: GeometryPayload): Promise<Geometry> {
  const { data } = await apiClient.post<Geometry>('/geometry/', payload);
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

export async function getGeometryEdgesPreview(geometryId: number, resolution: number): Promise<unknown> {
  const { data } = await apiClient.get(`/geometry/${geometryId}/edges/preview/`, {
    params: { resolution },
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

export async function previewGeometryProfile(geometryId: number, payload: GeometryProfilePreviewPayload): Promise<unknown> {
  const { data } = await apiClient.post(`/geometry/${geometryId}/profiles/preview/`, payload);
  return data;
}

export async function getGeometryProfile(geometryId: number, profileId: number, query?: GeometryProfileQuery): Promise<unknown> {
  const { data } = await apiClient.get(`/geometry/${geometryId}/profiles/${profileId}/`, { params: query });
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

export async function getGeometrySparsPreview(geometryId: number): Promise<unknown> {
  const { data } = await apiClient.get(`/geometry/${geometryId}/spars/preview/`);
  return data;
}

export async function getGeometryTopView(geometryId: number): Promise<unknown> {
  const { data } = await apiClient.get(`/geometry/${geometryId}/top-view/`);
  return data;
}

export async function runProfileGenerator(geometryId: number, payload: ProfileGeneratorPayload): Promise<unknown> {
  const { data } = await apiClient.post(`/geometry/${geometryId}/tools/profile-generator/`, payload);
  return data;
}

export async function updateProfileGenerator(geometryId: number, payload: ProfileGeneratorPayload): Promise<unknown> {
  const { data } = await apiClient.put(`/geometry/${geometryId}/tools/profile-generator/`, payload);
  return data;
}

export async function exportGeometry(geometryId: number): Promise<Blob> {
  const { data } = await apiClient.get(`/geometry/${geometryId}/export/`, { responseType: 'blob' });
  return data;
}
```

- [ ] **Step 3: Create `src/hooks/api/useGeometry.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as geometryApi from '@/api/geometry';
import type {
  GeometryPayload,
  GeometrySettingsPayload,
  GeometryEdgesPayload,
  GeometryProfilesPayload,
  GeometryProfilePreviewPayload,
  GeometryProfileQuery,
  GeometrySparsPayload,
  ProfileGeneratorPayload,
} from '@/api/types/geometry';

export const geometryKeys = {
  list: () => ['geometry', 'list'] as const,
  detail: (geometryId: number) => ['geometry', 'detail', geometryId] as const,
  edges: (geometryId: number) => ['geometry', 'edges', geometryId] as const,
  edgesPreview: (geometryId: number, resolution: number) => ['geometry', 'edges-preview', geometryId, resolution] as const,
  profiles: (geometryId: number) => ['geometry', 'profiles', geometryId] as const,
  profile: (geometryId: number, profileId: number, query?: GeometryProfileQuery) =>
    ['geometry', 'profile', geometryId, profileId, query] as const,
  spars: (geometryId: number) => ['geometry', 'spars', geometryId] as const,
  sparsPreview: (geometryId: number) => ['geometry', 'spars-preview', geometryId] as const,
  topView: (geometryId: number) => ['geometry', 'top-view', geometryId] as const,
};

export function useGeometryList() {
  return useQuery({ queryKey: geometryKeys.list(), queryFn: () => geometryApi.getGeometryList() });
}

export function useGeometryDetail(geometryId: number) {
  return useQuery({ queryKey: geometryKeys.detail(geometryId), queryFn: () => geometryApi.getGeometry(geometryId) });
}

export function useCreateGeometry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GeometryPayload) => geometryApi.createGeometry(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: geometryKeys.list() }),
  });
}

export function useUpdateGeometry(geometryId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GeometryPayload) => geometryApi.updateGeometry(geometryId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: geometryKeys.detail(geometryId) }),
  });
}

export function useDeleteGeometry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (geometryId: number) => geometryApi.deleteGeometry(geometryId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: geometryKeys.list() }),
  });
}

export function useUpdateGeometrySettings(geometryId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GeometrySettingsPayload) => geometryApi.updateGeometrySettings(geometryId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: geometryKeys.detail(geometryId) }),
  });
}

export function useGeometryEdges(geometryId: number) {
  return useQuery({ queryKey: geometryKeys.edges(geometryId), queryFn: () => geometryApi.getGeometryEdges(geometryId) });
}

export function useUpdateGeometryEdges(geometryId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GeometryEdgesPayload) => geometryApi.updateGeometryEdges(geometryId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: geometryKeys.edges(geometryId) }),
  });
}

export function useGeometryEdgesPreview(geometryId: number, resolution: number) {
  return useQuery({
    queryKey: geometryKeys.edgesPreview(geometryId, resolution),
    queryFn: () => geometryApi.getGeometryEdgesPreview(geometryId, resolution),
  });
}

export function useGeometryProfiles(geometryId: number) {
  return useQuery({ queryKey: geometryKeys.profiles(geometryId), queryFn: () => geometryApi.getGeometryProfiles(geometryId) });
}

export function useUpdateGeometryProfiles(geometryId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GeometryProfilesPayload) => geometryApi.updateGeometryProfiles(geometryId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: geometryKeys.profiles(geometryId) }),
  });
}

export function usePreviewGeometryProfile() {
  return useMutation({
    mutationFn: ({ geometryId, payload }: { geometryId: number; payload: GeometryProfilePreviewPayload }) =>
      geometryApi.previewGeometryProfile(geometryId, payload),
  });
}

export function useGeometryProfile(geometryId: number, profileId: number, query?: GeometryProfileQuery) {
  return useQuery({
    queryKey: geometryKeys.profile(geometryId, profileId, query),
    queryFn: () => geometryApi.getGeometryProfile(geometryId, profileId, query),
  });
}

export function useGeometryResult() {
  return useMutation({
    mutationFn: (geometryId: number) => geometryApi.getGeometryResult(geometryId),
  });
}

export function useGeometrySpars(geometryId: number) {
  return useQuery({ queryKey: geometryKeys.spars(geometryId), queryFn: () => geometryApi.getGeometrySpars(geometryId) });
}

export function useUpdateGeometrySpars(geometryId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GeometrySparsPayload) => geometryApi.updateGeometrySpars(geometryId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: geometryKeys.spars(geometryId) }),
  });
}

export function useGeometrySparsPreview(geometryId: number) {
  return useQuery({ queryKey: geometryKeys.sparsPreview(geometryId), queryFn: () => geometryApi.getGeometrySparsPreview(geometryId) });
}

export function useGeometryTopView(geometryId: number) {
  return useQuery({ queryKey: geometryKeys.topView(geometryId), queryFn: () => geometryApi.getGeometryTopView(geometryId) });
}

export function useRunProfileGenerator() {
  return useMutation({
    mutationFn: ({ geometryId, payload }: { geometryId: number; payload: ProfileGeneratorPayload }) =>
      geometryApi.runProfileGenerator(geometryId, payload),
  });
}

export function useUpdateProfileGenerator() {
  return useMutation({
    mutationFn: ({ geometryId, payload }: { geometryId: number; payload: ProfileGeneratorPayload }) =>
      geometryApi.updateProfileGenerator(geometryId, payload),
  });
}

export function useExportGeometry() {
  return useMutation({
    mutationFn: (geometryId: number) => geometryApi.exportGeometry(geometryId),
  });
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: exits 0.

---

### Task 6: Composition module (`composition.ts` + hook)

**Files:**
- Create: `src/api/types/composition.ts`
- Create: `src/api/composition.ts`
- Create: `src/hooks/api/useComposition.ts`

**Interfaces:**
- Consumes: `apiClient` (Task 1), `KeyValuePair` (Task 1).
- Produces: `createComposition`, `getCompositionList`, `getComposition`, `updateComposition`, `deleteComposition`, `updateCompositionSettings`, `updateCompositionGeometry`, `updateCompositionLayup`, `updateCompositionMappingLongitudinal`, `updateCompositionMappingTransversal`, `getCompositionIntersections`, `updateCompositionCoreMaterial`, `getCompositionPreview` (from `src/api/composition.ts`); `compositionKeys` + matching `use*` hooks (from `src/hooks/api/useComposition.ts`).

- [ ] **Step 1: Create `src/api/types/composition.ts`**

```ts
import type { KeyValuePair } from './common';

export interface CompositionPayload {
  name: string;
  description?: string;
}

export interface Composition {
  id: number;
  name: string;
  description?: string;
  [key: string]: unknown;
}

export interface CompositionSettingsPayload {
  settings: KeyValuePair[];
}

export interface CompositionGeometryPayload {
  geometry: number;
}

export interface CompositionLayer {
  name: string;
  thickness: number;
  orientation: number;
  material: number;
}

export interface CompositionLayup {
  name: string;
  layers: CompositionLayer[];
}

export interface CompositionLayupPayload {
  layups: CompositionLayup[];
}

export interface CompositionCoreMaterialPayload {
  core_material: number;
}
```

- [ ] **Step 2: Create `src/api/composition.ts`**

```ts
import { apiClient } from './client';
import type {
  CompositionPayload,
  Composition,
  CompositionSettingsPayload,
  CompositionGeometryPayload,
  CompositionLayupPayload,
  CompositionCoreMaterialPayload,
} from './types/composition';

export async function createComposition(payload: CompositionPayload): Promise<Composition> {
  const { data } = await apiClient.post<Composition>('/composition/', payload);
  return data;
}

export async function getCompositionList(): Promise<Composition[]> {
  const { data } = await apiClient.get<Composition[]>('/composition/list/');
  return data;
}

export async function getComposition(compositionId: number): Promise<Composition> {
  const { data } = await apiClient.get<Composition>(`/composition/${compositionId}/`);
  return data;
}

export async function updateComposition(compositionId: number, payload: CompositionPayload): Promise<Composition> {
  const { data } = await apiClient.put<Composition>(`/composition/${compositionId}/`, payload);
  return data;
}

export async function deleteComposition(compositionId: number): Promise<void> {
  await apiClient.delete(`/composition/${compositionId}/`);
}

export async function updateCompositionSettings(compositionId: number, payload: CompositionSettingsPayload): Promise<unknown> {
  const { data } = await apiClient.put(`/composition/${compositionId}/settings/`, payload);
  return data;
}

export async function updateCompositionGeometry(compositionId: number, payload: CompositionGeometryPayload): Promise<unknown> {
  const { data } = await apiClient.put(`/composition/${compositionId}/geometry/`, payload);
  return data;
}

export async function updateCompositionLayup(compositionId: number, payload: CompositionLayupPayload): Promise<unknown> {
  const { data } = await apiClient.put(`/composition/${compositionId}/layup/`, payload);
  return data;
}

export async function updateCompositionMappingLongitudinal(compositionId: number, payload: unknown): Promise<unknown> {
  const { data } = await apiClient.put(`/composition/${compositionId}/mapping/longitudinal/`, payload);
  return data;
}

export async function updateCompositionMappingTransversal(compositionId: number, payload: unknown): Promise<unknown> {
  const { data } = await apiClient.put(`/composition/${compositionId}/mapping/transversal/`, payload);
  return data;
}

export async function getCompositionIntersections(compositionId: number): Promise<unknown> {
  const { data } = await apiClient.get(`/composition/${compositionId}/intersections/`);
  return data;
}

export async function updateCompositionCoreMaterial(compositionId: number, payload: CompositionCoreMaterialPayload): Promise<unknown> {
  const { data } = await apiClient.put(`/composition/${compositionId}/core-material/`, payload);
  return data;
}

export async function getCompositionPreview(compositionId: number): Promise<unknown> {
  const { data } = await apiClient.get(`/composition/${compositionId}/preview/`);
  return data;
}
```

- [ ] **Step 3: Create `src/hooks/api/useComposition.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as compositionApi from '@/api/composition';
import type {
  CompositionPayload,
  CompositionSettingsPayload,
  CompositionGeometryPayload,
  CompositionLayupPayload,
  CompositionCoreMaterialPayload,
} from '@/api/types/composition';

export const compositionKeys = {
  list: () => ['composition', 'list'] as const,
  detail: (compositionId: number) => ['composition', 'detail', compositionId] as const,
  intersections: (compositionId: number) => ['composition', 'intersections', compositionId] as const,
  preview: (compositionId: number) => ['composition', 'preview', compositionId] as const,
};

export function useCompositionList() {
  return useQuery({ queryKey: compositionKeys.list(), queryFn: () => compositionApi.getCompositionList() });
}

export function useCompositionDetail(compositionId: number) {
  return useQuery({ queryKey: compositionKeys.detail(compositionId), queryFn: () => compositionApi.getComposition(compositionId) });
}

export function useCreateComposition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CompositionPayload) => compositionApi.createComposition(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: compositionKeys.list() }),
  });
}

export function useUpdateComposition(compositionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CompositionPayload) => compositionApi.updateComposition(compositionId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: compositionKeys.detail(compositionId) }),
  });
}

export function useDeleteComposition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (compositionId: number) => compositionApi.deleteComposition(compositionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: compositionKeys.list() }),
  });
}

export function useUpdateCompositionSettings(compositionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CompositionSettingsPayload) => compositionApi.updateCompositionSettings(compositionId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: compositionKeys.detail(compositionId) }),
  });
}

export function useUpdateCompositionGeometry(compositionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CompositionGeometryPayload) => compositionApi.updateCompositionGeometry(compositionId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: compositionKeys.detail(compositionId) }),
  });
}

export function useUpdateCompositionLayup(compositionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CompositionLayupPayload) => compositionApi.updateCompositionLayup(compositionId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: compositionKeys.detail(compositionId) }),
  });
}

export function useUpdateCompositionMappingLongitudinal(compositionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: unknown) => compositionApi.updateCompositionMappingLongitudinal(compositionId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: compositionKeys.detail(compositionId) }),
  });
}

export function useUpdateCompositionMappingTransversal(compositionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: unknown) => compositionApi.updateCompositionMappingTransversal(compositionId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: compositionKeys.detail(compositionId) }),
  });
}

export function useCompositionIntersections(compositionId: number) {
  return useQuery({
    queryKey: compositionKeys.intersections(compositionId),
    queryFn: () => compositionApi.getCompositionIntersections(compositionId),
  });
}

export function useUpdateCompositionCoreMaterial(compositionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CompositionCoreMaterialPayload) => compositionApi.updateCompositionCoreMaterial(compositionId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: compositionKeys.detail(compositionId) }),
  });
}

export function useCompositionPreview(compositionId: number) {
  return useQuery({ queryKey: compositionKeys.preview(compositionId), queryFn: () => compositionApi.getCompositionPreview(compositionId) });
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: exits 0.

---

### Task 7: Materials module (`materials.ts` + hook)

**Files:**
- Create: `src/api/types/materials.ts`
- Create: `src/api/materials.ts`
- Create: `src/hooks/api/useMaterials.ts`

**Interfaces:**
- Consumes: `apiClient` (Task 1), `KeyValuePair` (Task 1).
- Produces: `createMaterial`, `getMaterialList`, `getMaterial`, `updateMaterial`, `deleteMaterial`, `updateMechanicalProperties`, `updateFatigueProperties`, `exportMaterial` (from `src/api/materials.ts`); `materialKeys` + matching `use*` hooks (from `src/hooks/api/useMaterials.ts`).

- [ ] **Step 1: Create `src/api/types/materials.ts`**

```ts
import type { KeyValuePair } from './common';

export interface MaterialPayload {
  name: string;
  description?: string;
  mechanical_properties: KeyValuePair[];
  fatigue_properties: KeyValuePair[];
}

export interface Material {
  id: number;
  name: string;
  description?: string;
  [key: string]: unknown;
}

export interface MaterialMechanicalPropertiesPayload {
  mechanical_properties: KeyValuePair[];
}

export interface MaterialFatiguePropertiesPayload {
  fatigue_properties: KeyValuePair[];
}
```

- [ ] **Step 2: Create `src/api/materials.ts`**

```ts
import { apiClient } from './client';
import type {
  MaterialPayload,
  Material,
  MaterialMechanicalPropertiesPayload,
  MaterialFatiguePropertiesPayload,
} from './types/materials';

export async function createMaterial(payload: MaterialPayload): Promise<Material> {
  const { data } = await apiClient.post<Material>('/material/', payload);
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

- [ ] **Step 3: Create `src/hooks/api/useMaterials.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as materialsApi from '@/api/materials';
import type {
  MaterialPayload,
  MaterialMechanicalPropertiesPayload,
  MaterialFatiguePropertiesPayload,
} from '@/api/types/materials';

export const materialKeys = {
  list: () => ['materials', 'list'] as const,
  detail: (materialId: number) => ['materials', 'detail', materialId] as const,
};

export function useMaterialList() {
  return useQuery({ queryKey: materialKeys.list(), queryFn: () => materialsApi.getMaterialList() });
}

export function useMaterialDetail(materialId: number) {
  return useQuery({ queryKey: materialKeys.detail(materialId), queryFn: () => materialsApi.getMaterial(materialId) });
}

export function useCreateMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MaterialPayload) => materialsApi.createMaterial(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: materialKeys.list() }),
  });
}

export function useUpdateMaterial(materialId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MaterialPayload) => materialsApi.updateMaterial(materialId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: materialKeys.detail(materialId) }),
  });
}

export function useDeleteMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (materialId: number) => materialsApi.deleteMaterial(materialId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: materialKeys.list() }),
  });
}

export function useUpdateMechanicalProperties(materialId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MaterialMechanicalPropertiesPayload) => materialsApi.updateMechanicalProperties(materialId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: materialKeys.detail(materialId) }),
  });
}

export function useUpdateFatigueProperties(materialId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MaterialFatiguePropertiesPayload) => materialsApi.updateFatigueProperties(materialId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: materialKeys.detail(materialId) }),
  });
}

export function useExportMaterial() {
  return useMutation({
    mutationFn: (materialId: number) => materialsApi.exportMaterial(materialId),
  });
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: exits 0.

---

### Task 8: Load groups module (`loadGroups.ts` + hook)

**Files:**
- Create: `src/api/types/loadGroups.ts`
- Create: `src/api/loadGroups.ts`
- Create: `src/hooks/api/useLoadGroups.ts`

**Interfaces:**
- Consumes: `apiClient` (Task 1).
- Produces: `createLoadGroup`, `getLoadGroupList`, `getLoadGroup`, `updateLoadGroup`, `deleteLoadGroup`, `updateLoadGroupLimits`, `getLoadCases`, `updateLoadCases`, `getFatigueProfiles`, `updateFatigueProfiles` (from `src/api/loadGroups.ts`); `loadGroupKeys` + matching `use*` hooks (from `src/hooks/api/useLoadGroups.ts`).

- [ ] **Step 1: Create `src/api/types/loadGroups.ts`**

```ts
export interface LoadGroupPayload {
  name: string;
  description?: string;
}

export interface LoadGroup {
  id: number;
  name: string;
  description?: string;
  [key: string]: unknown;
}

export interface LoadLimitRange {
  x_min: number;
  x_max: number;
  y_min: number;
  y_max: number;
}

export interface LoadGroupLimitsPayload {
  rpm_thrust_limit: LoadLimitRange;
  rpm_torque_limit: LoadLimitRange;
  rpm_power_limit: LoadLimitRange;
}

export interface LoadCase {
  id: number;
  name: string;
  pitch_flag: string;
  pitch_min: number;
  pitch_max: number;
  rpm_flag: string;
  rpm_min: number;
  rpm_max: number;
}

export interface LoadCasesPayload {
  load_cases: LoadCase[];
}
```

- [ ] **Step 2: Create `src/api/loadGroups.ts`**

```ts
import { apiClient } from './client';
import type {
  LoadGroupPayload,
  LoadGroup,
  LoadGroupLimitsPayload,
  LoadCasesPayload,
} from './types/loadGroups';

export async function createLoadGroup(payload: LoadGroupPayload): Promise<LoadGroup> {
  const { data } = await apiClient.post<LoadGroup>('/load/', payload);
  return data;
}

export async function getLoadGroupList(): Promise<LoadGroup[]> {
  const { data } = await apiClient.get<LoadGroup[]>('/load/list/');
  return data;
}

export async function getLoadGroup(loadGroupId: number): Promise<LoadGroup> {
  const { data } = await apiClient.get<LoadGroup>(`/load/${loadGroupId}/`);
  return data;
}

export async function updateLoadGroup(loadGroupId: number, payload: LoadGroupPayload): Promise<LoadGroup> {
  const { data } = await apiClient.put<LoadGroup>(`/load/${loadGroupId}/`, payload);
  return data;
}

export async function deleteLoadGroup(loadGroupId: number): Promise<void> {
  await apiClient.delete(`/load/${loadGroupId}/`);
}

export async function updateLoadGroupLimits(loadGroupId: number, payload: LoadGroupLimitsPayload): Promise<LoadGroupLimitsPayload> {
  const { data } = await apiClient.put<LoadGroupLimitsPayload>(`/load/${loadGroupId}/limits/`, payload);
  return data;
}

export async function getLoadCases(loadGroupId: number): Promise<LoadCasesPayload> {
  const { data } = await apiClient.get<LoadCasesPayload>(`/load/${loadGroupId}/load-cases/`);
  return data;
}

export async function updateLoadCases(loadGroupId: number, payload: LoadCasesPayload): Promise<LoadCasesPayload> {
  const { data } = await apiClient.put<LoadCasesPayload>(`/load/${loadGroupId}/load-cases/`, payload);
  return data;
}

export async function getFatigueProfiles(loadGroupId: number): Promise<unknown> {
  const { data } = await apiClient.get(`/load/${loadGroupId}/fatigue-profiles/`);
  return data;
}

export async function updateFatigueProfiles(loadGroupId: number, payload: unknown): Promise<unknown> {
  const { data } = await apiClient.put(`/load/${loadGroupId}/fatigue-profiles/`, payload);
  return data;
}
```

- [ ] **Step 3: Create `src/hooks/api/useLoadGroups.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as loadGroupsApi from '@/api/loadGroups';
import type { LoadGroupPayload, LoadGroupLimitsPayload, LoadCasesPayload } from '@/api/types/loadGroups';

export const loadGroupKeys = {
  list: () => ['load-groups', 'list'] as const,
  detail: (loadGroupId: number) => ['load-groups', 'detail', loadGroupId] as const,
  loadCases: (loadGroupId: number) => ['load-groups', 'load-cases', loadGroupId] as const,
  fatigueProfiles: (loadGroupId: number) => ['load-groups', 'fatigue-profiles', loadGroupId] as const,
};

export function useLoadGroupList() {
  return useQuery({ queryKey: loadGroupKeys.list(), queryFn: () => loadGroupsApi.getLoadGroupList() });
}

export function useLoadGroupDetail(loadGroupId: number) {
  return useQuery({ queryKey: loadGroupKeys.detail(loadGroupId), queryFn: () => loadGroupsApi.getLoadGroup(loadGroupId) });
}

export function useCreateLoadGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LoadGroupPayload) => loadGroupsApi.createLoadGroup(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: loadGroupKeys.list() }),
  });
}

export function useUpdateLoadGroup(loadGroupId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LoadGroupPayload) => loadGroupsApi.updateLoadGroup(loadGroupId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: loadGroupKeys.detail(loadGroupId) }),
  });
}

export function useDeleteLoadGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (loadGroupId: number) => loadGroupsApi.deleteLoadGroup(loadGroupId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: loadGroupKeys.list() }),
  });
}

export function useUpdateLoadGroupLimits(loadGroupId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LoadGroupLimitsPayload) => loadGroupsApi.updateLoadGroupLimits(loadGroupId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: loadGroupKeys.detail(loadGroupId) }),
  });
}

export function useLoadCases(loadGroupId: number) {
  return useQuery({ queryKey: loadGroupKeys.loadCases(loadGroupId), queryFn: () => loadGroupsApi.getLoadCases(loadGroupId) });
}

export function useUpdateLoadCases(loadGroupId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LoadCasesPayload) => loadGroupsApi.updateLoadCases(loadGroupId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: loadGroupKeys.loadCases(loadGroupId) }),
  });
}

export function useFatigueProfiles(loadGroupId: number) {
  return useQuery({
    queryKey: loadGroupKeys.fatigueProfiles(loadGroupId),
    queryFn: () => loadGroupsApi.getFatigueProfiles(loadGroupId),
  });
}

export function useUpdateFatigueProfiles(loadGroupId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: unknown) => loadGroupsApi.updateFatigueProfiles(loadGroupId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: loadGroupKeys.fatigueProfiles(loadGroupId) }),
  });
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: exits 0.

---

### Task 9: Reports module (`reports.ts` + hook)

**Files:**
- Create: `src/api/types/reports.ts`
- Create: `src/api/reports.ts`
- Create: `src/hooks/api/useReports.ts`

**Interfaces:**
- Consumes: `apiClient` (Task 1).
- Produces: `getReportList`, `getReport`, `deleteReport`, `exportReport`, `getReportFileList` (from `src/api/reports.ts`); `reportKeys` + matching `use*` hooks (from `src/hooks/api/useReports.ts`).

- [ ] **Step 1: Create `src/api/types/reports.ts`**

```ts
export interface Report {
  id: number;
  [key: string]: unknown;
}

export interface ReportFile {
  id: string;
  [key: string]: unknown;
}
```

- [ ] **Step 2: Create `src/api/reports.ts`**

```ts
import { apiClient } from './client';
import type { Report, ReportFile } from './types/reports';

export async function getReportList(): Promise<Report[]> {
  const { data } = await apiClient.get<Report[]>('/report/list/');
  return data;
}

export async function getReport(reportId: number): Promise<Report> {
  const { data } = await apiClient.get<Report>(`/report/${reportId}/`);
  return data;
}

export async function deleteReport(reportId: number): Promise<void> {
  await apiClient.delete(`/report/${reportId}/`);
}

export async function exportReport(reportId: number): Promise<Blob> {
  const { data } = await apiClient.get(`/report/${reportId}/export/`, { responseType: 'blob' });
  return data;
}

export async function getReportFileList(reportId: number): Promise<ReportFile[]> {
  const { data } = await apiClient.get<ReportFile[]>(`/report/${reportId}/file/list/`);
  return data;
}
```

- [ ] **Step 3: Create `src/hooks/api/useReports.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as reportsApi from '@/api/reports';

export const reportKeys = {
  list: () => ['reports', 'list'] as const,
  detail: (reportId: number) => ['reports', 'detail', reportId] as const,
  fileList: (reportId: number) => ['reports', 'file-list', reportId] as const,
};

export function useReportList() {
  return useQuery({ queryKey: reportKeys.list(), queryFn: () => reportsApi.getReportList() });
}

export function useReportDetail(reportId: number) {
  return useQuery({ queryKey: reportKeys.detail(reportId), queryFn: () => reportsApi.getReport(reportId) });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reportId: number) => reportsApi.deleteReport(reportId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reportKeys.list() }),
  });
}

export function useExportReport() {
  return useMutation({
    mutationFn: (reportId: number) => reportsApi.exportReport(reportId),
  });
}

export function useReportFileList(reportId: number) {
  return useQuery({ queryKey: reportKeys.fileList(reportId), queryFn: () => reportsApi.getReportFileList(reportId) });
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: exits 0.

---

### Task 10: Files module (`files.ts` + hook)

**Files:**
- Create: `src/api/types/files.ts`
- Create: `src/api/files.ts`
- Create: `src/hooks/api/useFiles.ts`

**Interfaces:**
- Consumes: `apiClient` (Task 1).
- Produces: `uploadFile`, `getFile`, `updateFile`, `deleteFile` (from `src/api/files.ts`); `fileKeys` + `useUploadFile`, `useFile`, `useUpdateFile`, `useDeleteFile` (from `src/hooks/api/useFiles.ts`).

- [ ] **Step 1: Create `src/api/types/files.ts`**

```ts
export interface FileUploadPayload {
  file: File;
  name?: string;
  description?: string;
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

- [ ] **Step 2: Create `src/api/files.ts`**

```ts
import { apiClient } from './client';
import type { FileUploadPayload, FileRecord, FileUpdatePayload } from './types/files';

export async function uploadFile(payload: FileUploadPayload): Promise<FileRecord> {
  const formData = new FormData();
  formData.append('file', payload.file);
  if (payload.name) formData.append('name', payload.name);
  if (payload.description) formData.append('description', payload.description);
  const { data } = await apiClient.post<FileRecord>('/file/', formData, {
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

- [ ] **Step 3: Create `src/hooks/api/useFiles.ts`**

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as filesApi from '@/api/files';
import type { FileUploadPayload, FileUpdatePayload } from '@/api/types/files';

export const fileKeys = {
  detail: (fileId: string) => ['files', 'detail', fileId] as const,
};

export function useUploadFile() {
  return useMutation({
    mutationFn: (payload: FileUploadPayload) => filesApi.uploadFile(payload),
  });
}

export function useFile() {
  return useMutation({
    mutationFn: (fileId: string) => filesApi.getFile(fileId),
  });
}

export function useUpdateFile(fileId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FileUpdatePayload) => filesApi.updateFile(fileId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: fileKeys.detail(fileId) }),
  });
}

export function useDeleteFile() {
  return useMutation({
    mutationFn: (fileId: string) => filesApi.deleteFile(fileId),
  });
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: exits 0.

---

### Task 11: Remote adapter module (`remoteAdapter.ts` + hook)

**Files:**
- Create: `src/api/types/remoteAdapter.ts`
- Create: `src/api/remoteAdapter.ts`
- Create: `src/hooks/api/useRemoteAdapter.ts`

**Interfaces:**
- Consumes: `apiClient` (Task 1).
- Produces: `getRemoteAdapterList`, `startRemoteAdapterTask`, `stopRemoteAdapterTask`, `downloadRemoteAdapterChunk`, `uploadRemoteAdapterChunk`, `logRemoteAdapterEvent` (from `src/api/remoteAdapter.ts`); `remoteAdapterKeys` + matching `use*` hooks (from `src/hooks/api/useRemoteAdapter.ts`).

- [ ] **Step 1: Create `src/api/types/remoteAdapter.ts`**

```ts
export interface RemoteAdapterTask {
  id: string;
  [key: string]: unknown;
}

export interface RemoteAdapterStartPayload {
  client_id: string;
}

export interface RemoteAdapterStopPayload {
  client_id: string;
  state: string;
  error_code: number;
  error_message: string;
}

export interface RemoteAdapterDownloadQuery {
  client_id: string;
  index: number;
  chunk_size: number;
}

export interface RemoteAdapterUploadMetadata {
  client_id: string;
  total_count: number;
  total_size: number;
  index: number;
  chunk_size: number;
}

export interface RemoteAdapterLogPayload {
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
```

- [ ] **Step 2: Create `src/api/remoteAdapter.ts`**

```ts
import { apiClient } from './client';
import type {
  RemoteAdapterTask,
  RemoteAdapterStartPayload,
  RemoteAdapterStopPayload,
  RemoteAdapterDownloadQuery,
  RemoteAdapterUploadMetadata,
  RemoteAdapterLogPayload,
} from './types/remoteAdapter';

export async function getRemoteAdapterList(): Promise<RemoteAdapterTask[]> {
  const { data } = await apiClient.get<RemoteAdapterTask[]>('/remote-adapter/list/');
  return data;
}

export async function startRemoteAdapterTask(taskId: string, payload: RemoteAdapterStartPayload): Promise<unknown> {
  const { data } = await apiClient.post(`/remote-adapter/${taskId}/start/`, payload);
  return data;
}

export async function stopRemoteAdapterTask(taskId: string, payload: RemoteAdapterStopPayload): Promise<unknown> {
  const { data } = await apiClient.post(`/remote-adapter/${taskId}/stop/`, payload);
  return data;
}

export async function downloadRemoteAdapterChunk(taskId: string, query: RemoteAdapterDownloadQuery): Promise<Blob> {
  const { data } = await apiClient.get(`/remote-adapter/${taskId}/download/`, {
    params: query,
    responseType: 'blob',
  });
  return data;
}

export async function uploadRemoteAdapterChunk(taskId: string, file: File, metadata: RemoteAdapterUploadMetadata): Promise<unknown> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('metadata', JSON.stringify(metadata));
  const { data } = await apiClient.post(`/remote-adapter/${taskId}/upload/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function logRemoteAdapterEvent(taskId: string, payload: RemoteAdapterLogPayload): Promise<unknown> {
  const { data } = await apiClient.post(`/remote-adapter/${taskId}/log/`, payload);
  return data;
}
```

- [ ] **Step 3: Create `src/hooks/api/useRemoteAdapter.ts`**

```ts
import { useQuery, useMutation } from '@tanstack/react-query';
import * as remoteAdapterApi from '@/api/remoteAdapter';
import type {
  RemoteAdapterStartPayload,
  RemoteAdapterStopPayload,
  RemoteAdapterDownloadQuery,
  RemoteAdapterUploadMetadata,
  RemoteAdapterLogPayload,
} from '@/api/types/remoteAdapter';

export const remoteAdapterKeys = {
  list: () => ['remote-adapter', 'list'] as const,
};

export function useRemoteAdapterList() {
  return useQuery({ queryKey: remoteAdapterKeys.list(), queryFn: () => remoteAdapterApi.getRemoteAdapterList() });
}

export function useStartRemoteAdapterTask() {
  return useMutation({
    mutationFn: ({ taskId, payload }: { taskId: string; payload: RemoteAdapterStartPayload }) =>
      remoteAdapterApi.startRemoteAdapterTask(taskId, payload),
  });
}

export function useStopRemoteAdapterTask() {
  return useMutation({
    mutationFn: ({ taskId, payload }: { taskId: string; payload: RemoteAdapterStopPayload }) =>
      remoteAdapterApi.stopRemoteAdapterTask(taskId, payload),
  });
}

export function useDownloadRemoteAdapterChunk() {
  return useMutation({
    mutationFn: ({ taskId, query }: { taskId: string; query: RemoteAdapterDownloadQuery }) =>
      remoteAdapterApi.downloadRemoteAdapterChunk(taskId, query),
  });
}

export function useUploadRemoteAdapterChunk() {
  return useMutation({
    mutationFn: ({ taskId, file, metadata }: { taskId: string; file: File; metadata: RemoteAdapterUploadMetadata }) =>
      remoteAdapterApi.uploadRemoteAdapterChunk(taskId, file, metadata),
  });
}

export function useLogRemoteAdapterEvent() {
  return useMutation({
    mutationFn: ({ taskId, payload }: { taskId: string; payload: RemoteAdapterLogPayload }) =>
      remoteAdapterApi.logRemoteAdapterEvent(taskId, payload),
  });
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: exits 0.

---

### Task 12: Full build verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full production build**

Run: `npm run build`
Expected: exits 0 (runs `tsc && vite build` per `package.json`), no TypeScript errors across any `src/api/**` or `src/hooks/api/**` file, existing pages/mock data untouched.

- [ ] **Step 2: Confirm mock data untouched**

Run: `git status --porcelain src/data`
Expected: empty output (no changes under `src/data/`).

- [ ] **Step 3: Confirm no existing component modified**

Run: `git status --porcelain src/pages src/components`
Expected: empty output.
