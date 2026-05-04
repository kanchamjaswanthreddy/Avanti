// Avanti Mobile — Student Detail Screen

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getApiClient } from '../../lib/api';
import type { Student } from '@avanti/types';
import { Colors, Typography, Spacing, Radius } from '../../constants/colors';

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, !value && styles.rowEmpty]}>{value ?? '—'}</Text>
    </View>
  );
}

export function StudentDetailScreen({
  route,
  navigation,
}: {
  route: { params: { studentId: string } };
  navigation: { goBack: () => void };
}) {
  const { studentId } = route.params;
  const [student, setStudent] = useState<Student | null>(null);
  const [attPct,  setAttPct]  = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const [s, pct] = await Promise.all([
          getApiClient().getStudent(studentId),
          getApiClient().getStudentAttendancePct(studentId).catch(() => null),
        ]);
        setStudent(s);
        if (pct) setAttPct(pct.percentage);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load student');
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ActivityIndicator style={{ flex: 1 }} color={Colors.brand500} />
      </SafeAreaView>
    );
  }

  if (error || !student) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error ?? 'Student not found.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const initials = (student.firstName[0] ?? '') + (student.lastName[0] ?? '');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TouchableOpacity style={styles.backBtn} onPress={navigation.goBack}>
        <Text style={styles.backText}>‹ Back</Text>
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile header */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials.toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{student.firstName} {student.lastName}</Text>
            <Text style={styles.admNo}>{student.admissionNumber}</Text>
            {student.className && <Text style={styles.className}>{student.className}</Text>}
          </View>
          {attPct !== null && (
            <View style={[
              styles.attPill,
              { backgroundColor: attPct >= 75 ? '#dcfce7' : '#fee2e2' },
            ]}>
              <Text style={[styles.attPct, { color: attPct >= 75 ? '#15803d' : '#b91c1c' }]}>
                {attPct.toFixed(0)}%
              </Text>
              <Text style={styles.attLabel}>Att.</Text>
            </View>
          )}
        </View>

        {/* Personal details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal</Text>
          <Row label="Date of birth" value={student.dateOfBirth} />
          <Row label="Gender"        value={student.gender} />
          <Row label="Phone"         value={student.phone} />
          <Row label="Email"         value={student.email} />
          <Row label="Address"       value={student.address} />
        </View>

        {/* Parent */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parent / Guardian</Text>
          <Row label="Name"  value={student.parentName} />
          <Row label="Phone" value={student.parentPhone} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: Colors.pageBackground },
  backBtn:  { padding: Spacing[4] },
  backText: { fontSize: Typography.sm, color: Colors.brand500 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[4],
    backgroundColor: Colors.white,
    margin: Spacing[4],
    borderRadius: Radius.xl,
    padding: Spacing[5],
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.brand500,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText:  { color: Colors.white, fontWeight: '700', fontSize: Typography.xl },
  name:        { fontSize: Typography.lg, fontWeight: '700', color: Colors.gray900 },
  admNo:       { fontSize: Typography.xs, color: Colors.gray400, marginTop: 2, fontFamily: 'monospace' },
  className:   { fontSize: Typography.sm, color: Colors.brand500, marginTop: 2 },
  attPill: {
    borderRadius: Radius.lg,
    padding: Spacing[3],
    alignItems: 'center',
    flexShrink: 0,
  },
  attPct:   { fontSize: Typography.xl, fontWeight: '700' },
  attLabel: { fontSize: 10, color: Colors.gray400, marginTop: 1 },
  section: {
    backgroundColor: Colors.white,
    margin: Spacing[4],
    marginTop: 0,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: Spacing[5],
  },
  sectionTitle: {
    fontSize: Typography.xs,
    fontWeight: '600',
    color: Colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing[3],
  },
  row: {
    flexDirection: 'row',
    gap: Spacing[3],
    paddingVertical: Spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    alignItems: 'flex-start',
  },
  rowLabel:  { fontSize: Typography.xs, color: Colors.gray400, minWidth: 100, paddingTop: 2 },
  rowValue:  { flex: 1, fontSize: Typography.sm, color: Colors.gray900 },
  rowEmpty:  { color: Colors.gray300 },
  errorBox: {
    margin: Spacing[5],
    padding: Spacing[4],
    backgroundColor: '#fef2f2',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: { color: Colors.error600 },
});
