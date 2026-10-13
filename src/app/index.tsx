import { Text, View } from 'react-native';
import { useSession } from '@/lib/auth';

export default function ProgramListScreen() {
  const session = useSession();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Pull Up — signed in as {session.user.id.slice(0, 8)}</Text>
    </View>
  );
}
