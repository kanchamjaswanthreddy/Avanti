// Avanti Mobile — Students Navigation Stack

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StudentListScreen }   from '../screens/students/StudentListScreen';
import { StudentDetailScreen } from '../screens/students/StudentDetailScreen';
import type { StudentsStackParamList } from './types';

const Stack = createNativeStackNavigator<StudentsStackParamList>();

export function StudentsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StudentList"   component={StudentListScreen} />
      <Stack.Screen name="StudentDetail" component={StudentDetailScreen} />
    </Stack.Navigator>
  );
}
