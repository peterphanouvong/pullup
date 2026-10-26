import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * `pullup://join/K7Q2MX`, from a crew invite: lands on the Crew tab, which
 * asks whether to join. A redirect rather than a screen, so the link never
 * leaves a page of its own on the stack.
 */
export default function JoinLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return <Redirect href={{ pathname: '/crew', params: { join: code } }} />;
}
