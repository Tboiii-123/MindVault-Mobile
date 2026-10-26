import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import ContainerScreen from '../screens/ContainerScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RegisterScreen from '../screens/RegisterScreen';
import SearchScreen from '../screens/SearchScreen';
import { useTheme } from '../theme';
import type { AuthStackParamList, RootStackParamList, TabParamList } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function Tabs() {
  const t = useTheme();
  const icons: Record<keyof TabParamList, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
    Home: ['chatbubbles', 'chatbubbles-outline'],
    Search: ['search', 'search-outline'],
    Profile: ['person-circle', 'person-circle-outline'],
  };
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.muted,
        tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.border },
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={icons[route.name][focused ? 0 : 1]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Notes' }} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  const { status } = useAuth();
  const t = useTheme();

  const base = t.dark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: t.bg, card: t.surface, text: t.text, border: t.border, primary: t.accent },
  };

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={t.accent} size="large" />
      </View>
    );
  }

  // TODO(BIG): Deep links. Add a `linking` prop here (prefix "ainotes://" + your https domain) so that
  //   - the password-reset email link opens the Forgot screen with uid + token filled in
  //     (backend: set FRONTEND_URL to a universal link, see apps/users/views.py password_reset_request)
  //   - a public share link (/share/<id>) opens inside the app.
  //   iOS needs an apple-app-site-association file, Android needs assetlinks.json on your domain.
  // TODO(BIG): Push notifications ("your lecture finished transcribing"). Needs `expo-notifications`,
  //   a backend `DeviceToken` model + endpoint, and sending a push at the end of the Celery task
  //   `process_entry` (apps/ai/tasks.py).
  return (
    <NavigationContainer theme={navTheme}>
      {status === 'signedIn' ? (
        <RootStack.Navigator>
          <RootStack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
          <RootStack.Screen
            name="Container"
            component={ContainerScreen}
            options={{ headerBackTitle: 'Notes', headerShadowVisible: false }}
          />
        </RootStack.Navigator>
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Register" component={RegisterScreen} />
          <AuthStack.Screen name="Forgot" component={ForgotPasswordScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}
