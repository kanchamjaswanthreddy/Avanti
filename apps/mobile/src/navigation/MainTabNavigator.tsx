// Vidyut Mobile — Main Bottom Tab Navigator

import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DashboardScreen }  from '../screens/dashboard/DashboardScreen';
import { AttendanceScreen } from '../screens/attendance/AttendanceScreen';
import { FeesScreen }       from '../screens/fees/FeesScreen';
import { StudentsStack }    from './StudentsStack';
import type { MainTabParamList } from './types';
import { Colors, Typography } from '../constants/colors';

const Tab = createBottomTabNavigator<MainTabParamList>();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Dashboard:  '⊞',
    Students:   '🎓',
    Attendance: '✅',
    Fees:       '💳',
  };
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>
      {icons[label] ?? '●'}
    </Text>
  );
}

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
        tabBarActiveTintColor:   Colors.brand500,
        tabBarInactiveTintColor: Colors.gray400,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: Colors.gray200,
          backgroundColor: Colors.white,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: Typography.xs,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen name="Dashboard"  component={DashboardScreen}  options={{ title: 'Home' }} />
      <Tab.Screen name="Students"   component={StudentsStack}     options={{ title: 'Students' }} />
      <Tab.Screen name="Attendance" component={AttendanceScreen}  options={{ title: 'Attendance' }} />
      <Tab.Screen name="Fees"       component={FeesScreen}        options={{ title: 'Fees' }} />
    </Tab.Navigator>
  );
}
