import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/lib/auth';
import { fetchActiveProgram, fetchProgram, fetchPrograms, selectProgram } from './api';

export function usePrograms() {
  return useQuery({ queryKey: ['programs'], queryFn: fetchPrograms });
}

export function useProgram(id: string) {
  return useQuery({ queryKey: ['programs', id], queryFn: () => fetchProgram(id) });
}

export function useActiveProgram() {
  const session = useSession();
  return useQuery({
    queryKey: ['active-program', session.user.id],
    queryFn: () => fetchActiveProgram(session.user.id),
  });
}

export function useSelectProgram() {
  const session = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ programId }: { programId: string }) => selectProgram(session.user.id, programId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['active-program', session.user.id] }),
  });
}
