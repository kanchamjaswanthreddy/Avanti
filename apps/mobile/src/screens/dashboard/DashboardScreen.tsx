// Vidyut Mobile — Dashboard Screen
// Quick KPI cards + navigation shortcuts.

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { Colors, Typography, Spacing, Radius } from '../../constants/colors';

function KpiCard({ label, value, color = Colors.gray900 }: {
  label: string; value: string; color?: string;
}) {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
    </View>
  );
}

function ActionCard({ label, description, onPress, emoji }: {
  label: string; description: string; onPress: () => void; emoji: string;
}) {
  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress}>
      <Text style={styles.actionEmoji}>{emoji}</Text>
      <View style={styles.actionText}>
        <Text style={styles.actionLabel}>{label}</Text>
        <Text style={styles.actionDesc}>{description}</Text>
      </View>
      <Text style={styles.actionChevron}>›</Text>
    </TouchableOpacity>
  );
}

export function DashboardScreen({ navigation }: { navigation: { navigate: (s: string) => void } }) {
  const user = useAuthStore(s => s.user);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning</Text>
            <Text style={styles.name}>{user?.name ?? 'User'}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.name?.[0] ?? 'V').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* KPI grid */}
        <View style={styles.kpiGrid}>
          <KpiCard label="Students"        value="—" />
          <KpiCard label="Attendance"      value="—"  color={Colors.success600} />
          <KpiCard label="Fees Overdue"    value="—"  color={Colors.error600} />
          <KpiCard label="Classes"         value="—" />
        </View>

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.actions}>
          <ActionCard
            label="Mark Attendance"
            description="Record today's class attendance"
            emoji="✅"
            onPress={() => navigation.navigate('Attendance')}
          />
          <ActionCard
            label="Students"
            description="Search and manage student records"
            emoji="🎓"
            onPress={() => navigation.navigate('Students')}
          />
          <ActionCard
            label="Fee Collections"
            description="Check payments and defaulters"
            emoji="💳"
            onPress={() => navigation.navigate('Fees')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: Colors.pageBackground },
  scroll: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing[5],
    paddingBottom: Spacing[4],
  },
  greeting: { fontSize: Typography.sm, color: Colors.gray400 },
  name:     { fontSize: Typography.xl, fontWeight: '700', color: Colors.gray900, marginTop: 2 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.brand500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Colors.white, fontWeight: '700', fontSize: Typography.base },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing[5],
    gap: Spacing[3],
    marginBottom: Spacing[4],
  },
  kpiCard: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  kpiLabel: { fontSize: Typography.xs, fontWeight: '600', color: Colors.gray400, textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiValue: { fontSize: Typography['2xl'], fontWeight: '700', marginTop: Spacing[1] },
  sectionTitle: {
    fontSize: Typography.xs,
    fontWeight: '600',
    color: Colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: Spacing[5],
    marginBottom: Spacing[2],
  },
  actions: {
    paddingHorizontal: Spacing[5],
    gap: Spacing[3],
    paddingBottom: Spacing[8],
  },
  actionCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: Spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  actionEmoji:  { fontSize: 22 },
  actionText:   { flex: 1 },
  actionLabel:  { fontSize: Typography.base, fontWeight: '600', color: Colors.gray900 },
  actionDesc:   { fontSize: Typography.xs, color: Colors.gray400, marginTop: 2 },
  actionChevron:{ fontSize: 20, color: Colors.gray300 },
});
