import { ActivityIndicator, Button, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

export function QueryFallback({
  isError,
  message,
  onRetry,
}: {
  isError: boolean;
  message: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.container}>
      {isError ? (
        <>
          <Text style={styles.message}>{message}</Text>
          <Button title="Retry" onPress={onRetry} />
        </>
      ) : (
        <ActivityIndicator />
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.canvas,
  },
  message: { ...theme.type.body, color: theme.colors.ink },
}));
