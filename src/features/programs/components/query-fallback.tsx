import { ActivityIndicator, Button, Text, View } from 'react-native';

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
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 }}>
      {isError ? (
        <>
          <Text>{message}</Text>
          <Button title="Retry" onPress={onRetry} />
        </>
      ) : (
        <ActivityIndicator />
      )}
    </View>
  );
}
