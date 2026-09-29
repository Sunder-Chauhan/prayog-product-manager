import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';

const storefront = process.env.EXPO_PUBLIC_STOREFRONT_URL || 'https://prayog-storefront.vercel.app';
const origin = new URL(storefront).origin;

export default function App() {
  const web = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack || failed) return false;
      web.current?.goBack();
      return true;
    });
    return () => handler.remove();
  }, [canGoBack, failed]);
  function allowNavigation(url: string) {
    if (url === 'about:blank' || url.startsWith(origin + '/') || url === origin) return true;
    if (/^(https:|mailto:|tel:|whatsapp:)/i.test(url)) void Linking.openURL(url).catch(() => {});
    return false;
  }
  return <SafeAreaProvider><SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
    <StatusBar style="dark" />
    {failed ? <View style={styles.message}>
      <Text style={styles.title}>Let’s reconnect</Text>
      <Text style={styles.body}>Check your internet connection and try again.</Text>
      <Pressable accessibilityRole="button" style={styles.button} onPress={() => { setFailed(false); setReload(n => n + 1); }}><Text style={styles.buttonText}>Try again</Text></Pressable>
    </View> : <WebView key={reload} ref={web} source={{ uri: storefront }}
      style={styles.screen} originWhitelist={['https://*', 'mailto:*', 'tel:*', 'whatsapp:*']}
      onShouldStartLoadWithRequest={r => allowNavigation(r.url)}
      onNavigationStateChange={s => setCanGoBack(s.canGoBack)}
      onError={() => setFailed(true)} onHttpError={e => { if (e.nativeEvent.statusCode >= 500) setFailed(true); }}
      onContentProcessDidTerminate={() => web.current?.reload()}
      javaScriptEnabled domStorageEnabled startInLoadingState
      renderLoading={() => <View style={styles.loading}><ActivityIndicator color="#254236" size="large" /></View>}
      setSupportMultipleWindows={false} sharedCookiesEnabled
      allowsBackForwardNavigationGestures allowsInlineMediaPlayback
    />}
  </SafeAreaView></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8f7f2' },
  loading: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f7f2' },
  message: { flex: 1, justifyContent: 'center', padding: 32 },
  title: { fontSize: 26, color: '#254236', fontWeight: '600' },
  body: { fontSize: 16, color: '#63746a', marginTop: 12, lineHeight: 24 },
  button: { backgroundColor: '#254236', borderRadius: 12, padding: 16, marginTop: 24 },
  buttonText: { color: 'white', fontSize: 16, textAlign: 'center', fontWeight: '600' },
});
