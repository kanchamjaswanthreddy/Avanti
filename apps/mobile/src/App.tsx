// Vidyut Mobile — Root App Component

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider }    from 'react-native-safe-area-context';
import { StatusBar }           from 'react-native';
import { RootNavigator }       from './navigation/RootNavigator';
import { Colors }              from './constants/colors';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Colors.pageBackground}
      />
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
