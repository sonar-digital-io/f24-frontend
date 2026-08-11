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
