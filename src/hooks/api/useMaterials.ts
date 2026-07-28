import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as materialsApi from '@/api/materials';
import type {
  MaterialPayload,
  MaterialGeneralPayload,
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
  return useQuery({
    queryKey: materialKeys.detail(materialId),
    queryFn: () => materialsApi.getMaterial(materialId),
    enabled: Number.isFinite(materialId),
    // The edit form must never show a stale cached copy (e.g. reopening right after
    // a previous edit) — always hit the network on mount instead of trusting staleTime.
    staleTime: 0,
    refetchOnMount: 'always',
  });
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
    mutationFn: (payload: MaterialGeneralPayload) => materialsApi.updateMaterial(materialId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: materialKeys.detail(materialId) });
      queryClient.invalidateQueries({ queryKey: materialKeys.list() });
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: materialKeys.detail(materialId) });
      // Also refresh the list — `type` lives on this endpoint and is shown there.
      queryClient.invalidateQueries({ queryKey: materialKeys.list() });
    },
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
