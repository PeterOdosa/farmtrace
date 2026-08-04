import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import DashboardScreen from '../screens/DashboardScreen';
import BoundaryMapScreen from '../screens/BoundaryMapScreen';
import FieldDetailScreen from '../screens/FieldDetailScreen';
import RoadTraceScreen from '../screens/RoadTraceScreen';

const Stack = createNativeStackNavigator();

// Loading screen while we check auth
function _SplashScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#1a5632" />
    </View>
  );
}

function AppNavigator() {
  const { user, signOut, setIsCheckingAuth, isCheckingAuth, isAuthenticated } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        await useAuthStore.getState().initialize();
      } catch (e) {
        console.error('Auth check failed:', e);
      }
      if (mounted) {
        setIsCheckingAuth(false);
      }
    }

    checkAuth();
    return () => {
      mounted = false;
    };
  }, [setIsCheckingAuth]);

  if (isCheckingAuth) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1a5632" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={user ? 'Dashboard' : 'Login'}
      screenOptions={{ headerShown: false }}
    >
      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="BoundaryMap" component={BoundaryMapScreen} />
          <Stack.Screen name="FieldDetail" component={FieldDetailScreen} />
          <Stack.Screen name="RoadTrace" component={RoadTraceScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default AppNavigator;
