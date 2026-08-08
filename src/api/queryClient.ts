import { QueryCache, MutationCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/apiError';

function toastApiError(error: unknown) {
  toast.error(getApiErrorMessage(error));
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: toastApiError }),
  mutationCache: new MutationCache({ onError: toastApiError }),
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});