import { FieldGroup, Host, ListItem } from '@expo/ui';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native-unistyles';
import { QueryFallback } from '@/features/programs/components/query-fallback';
import { useActiveProgram, usePrograms } from '@/features/programs/hooks';

export default function ProgramListScreen() {
  const programs = usePrograms();
  const active = useActiveProgram();

  if (programs.isPending || active.isPending || programs.isError || active.isError) {
    return (
      <QueryFallback
        isError={programs.isError || active.isError}
        message="Couldn't load programmes."
        onRetry={() => {
          programs.refetch();
          active.refetch();
        }}
      />
    );
  }

  const activeId = active.data?.programId ?? null;
  const activeProgram = programs.data.filter((p) => p.id === activeId);
  const rest = programs.data.filter((p) => p.id !== activeId);

  return (
    <Host style={styles.host}>
      <FieldGroup>
        {activeProgram.length > 0 && (
          <FieldGroup.Section title="Your programme">
            {activeProgram.map((program) => (
              <ListItem key={program.id} onPress={() => router.push(`/program/${program.id}`)}>
                {`✓ ${program.name}`}
              </ListItem>
            ))}
          </FieldGroup.Section>
        )}
        {rest.length > 0 && (
          <FieldGroup.Section title="Programmes">
            {rest.map((program) => (
              <ListItem key={program.id} onPress={() => router.push(`/program/${program.id}`)}>
                {program.name}
              </ListItem>
            ))}
          </FieldGroup.Section>
        )}
      </FieldGroup>
    </Host>
  );
}

const styles = StyleSheet.create((theme) => ({
  host: { flex: 1, backgroundColor: theme.colors.bg },
}));
