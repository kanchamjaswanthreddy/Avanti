// Vidyut Mobile — Root Navigator
// Switches between Auth and Main stacks based on session state.

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore }        from '../store/authStore';
import { AuthStack }           from './AuthStack';
import { MainTabNavigator }    from './MainTabNavigator';
import type { RootStackParamList } from './types';

const Root = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const accessToken = useAuthStore(s => s.accessToken);

  return (
    <Root.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {accessToken
        ? <Root.Screen name="Main" component={MainTabNavigator} />
        : <Root.Screen name="Auth" component={AuthStack} />
      }
    </Root.Navigator>
  );
}
