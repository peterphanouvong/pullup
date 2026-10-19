/**
 * app.json plus what depends on the environment. Plain JavaScript on
 * purpose: eas-cli reads this file with its own TypeScript loader, which
 * failed on the .ts version ("Cannot read properties of undefined
 * (reading 'CommonJS')").
 *
 * Google Sign-In's native URL scheme is the iOS client ID reversed. Its
 * config plugin refuses to build without one, so it's only added once
 * EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is set — until then the app builds and
 * the Google button stays hidden (see `googleSignInAvailable`).
 */
module.exports = ({ config }) => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const plugins = [...(config.plugins ?? [])];
  if (iosClientId) {
    const iosUrlScheme = `com.googleusercontent.apps.${iosClientId.replace('.apps.googleusercontent.com', '')}`;
    plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme }]);
  }
  return { ...config, plugins };
};
