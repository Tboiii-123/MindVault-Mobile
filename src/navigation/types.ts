import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  Forgot: undefined;
};

export type RootStackParamList = {
  Tabs: undefined;
  Container: { id: string; title?: string; icon?: string };
};

export type TabParamList = {
  Home: undefined;
  Search: undefined;
  Profile: undefined;
};

export type RootNav = NativeStackNavigationProp<RootStackParamList>;
export type AuthNav = NativeStackNavigationProp<AuthStackParamList>;
