// Vidyut Mobile — Attendance Screen

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getApiClient } from '../../lib/api';
import type {
  SchoolClass,
  AttendanceRosterEntry,
  AttendanceStatus,
  AttendanceRecord,
  ClassAttendanceResponse,
} from '@vidyut/types';
import { Colors, Typography, Spacing, Radius } from '../../constants/colors';

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; bg: string; text: string }> = {
  PRESENT:  { label: 'P', bg: '#dcfce7', text: '#15803d' },
  ABSENT:   { label: 'A', bg: '#fee2e2', text: '#b91c1c' },
  HALF_DAY: { label: 'H', bg: '#fef9c3', text: '#a16207' },
  LATE:     { label: 'L', bg: '#dbeafe', text: '#1d4ed8' },
};

const STATUSES: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'HALF_DAY', 'LATE'];

function StatusToggle({
  value,
  onChange,
}: {
  value: AttendanceStatus | null;
  onChange: (s: AttendanceStatus) => void;
}) {
  return (
    <View style={toggleStyles.row}>
      {STATUSES.map(s => {
        const cfg = STATUS_CONFIG[s];
        const active = value === s;
        return (
          <TouchableOpacity
            key={s}
            style={[
              toggleStyles.btn,
              active
                ? { backgroundColor: cfg.bg, borderColor: cfg.text }
                : toggleStyles.btnInactive,
            ]}
            onPress={() => onChange(s)}
          >
            <Text style={[toggleStyles.label, { color: active ? cfg.text : Colors.gray400 }]}>
              {cfg.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const toggleStyles = StyleSheet.create({
  row:         { flexDirection: 'row', gap: 4 },
  btn:         { width: 32, height: 32, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  btnInactive: { backgroundColor: Colors.gray100, borderColor: Colors.gray200 },
  label:       { fontSize: Typography.xs, fontWeight: '700' },
});

function RosterRow({
  entry,
  status,
  onStatus,
}: {
  entry: AttendanceRosterEntry;
  status: AttendanceStatus | null;
  onStatus: (s: AttendanceStatus) => void;
}) {
  const initials = (entry.firstName[0] ?? '') + (entry.lastName[0] ?? '');
  return (
    <View style={styles.rosterRow}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials.toUpperCase()}</Text>
      </View>
      <View style={styles.rosterInfo}>
        <Text style={styles.rosterName}>{entry.firstName} {entry.lastName}</Text>
        <Text style={styles.rosterAdm}>{entry.admissionNumber}</Text>
      </View>
      <StatusToggle value={status} onChange={onStatus} />
    </View>
  );
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function AttendanceScreen() {
  const [classes,  setClasses]  = useState<SchoolClass[]>([]);
  const [classId,  setClassId]  = useState<string | null>(null);
  const [date,     setDate]     = useState(todayIso());
  const [roster,   setRoster]   = useState<AttendanceRosterEntry[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus | null>>({});
  const [loading,  setLoading]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [saved,    setSaved]    = useState(false);

  // Load class list once
  useEffect(() => {
    void (async () => {
      try {
        const result = await getApiClient().getClasses();
        setClasses(result);
        if (result.length > 0 && result[0]) setClassId(result[0].id);
      } catch {
        setError('Failed to load classes');
      }
    })();
  }, []);

  const loadRoster = useCallback(async (cId: string, d: string) => {
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const data: ClassAttendanceResponse = await getApiClient().getClassAttendance(cId, d);
      setRoster(data.roster);
      const init: Record<string, AttendanceStatus | null> = {};
      for (const e of data.roster) init[e.studentId] = e.status;
      setStatuses(init);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roster');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (classId) void loadRoster(classId, date);
  }, [classId, date, loadRoster]);

  const markAll = (s: AttendanceStatus) => {
    const next: Record<string, AttendanceStatus> = {};
    for (const e of roster) next[e.studentId] = s;
    setStatuses(next);
  };

  const save = async () => {
    if (!classId) return;
    setSaving(true);
    setError(null);
    try {
      const records: AttendanceRecord[] = roster
        .map(e => ({ studentId: e.studentId, status: statuses[e.studentId] ?? ('ABSENT' as AttendanceStatus) }));
      await getApiClient().markAttendance(classId, date, records);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Summary counts
  const counts = { PRESENT: 0, ABSENT: 0, HALF_DAY: 0, LATE: 0 };
  for (const s of Object.values(statuses)) {
    if (s) counts[s]++;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Attendance</Text>
        <Text style={styles.date}>{date}</Text>
      </View>

      {/* Class selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.classBar}
        contentContainerStyle={styles.classBarContent}
      >
        {classes.map(c => (
          <TouchableOpacity
            key={c.id}
            style={[styles.classChip, classId === c.id && styles.classChipActive]}
            onPress={() => setClassId(c.id)}
          >
            <Text style={[styles.classChipText, classId === c.id && styles.classChipTextActive]}>
              {c.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Mark-all buttons */}
      <View style={styles.markAllRow}>
        <Text style={styles.markAllLabel}>Mark all:</Text>
        {STATUSES.map(s => {
          const cfg = STATUS_CONFIG[s];
          return (
            <TouchableOpacity
              key={s}
              style={[styles.markAllBtn, { backgroundColor: cfg.bg }]}
              onPress={() => markAll(s)}
            >
              <Text style={[styles.markAllBtnText, { color: cfg.text }]}>{cfg.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Summary bar */}
      <View style={styles.summaryBar}>
        {(Object.entries(counts) as [AttendanceStatus, number][]).map(([s, n]) => (
          <View key={s} style={styles.summaryItem}>
            <Text style={[styles.summaryCount, { color: STATUS_CONFIG[s].text }]}>{n}</Text>
            <Text style={styles.summaryLabel}>{s === 'HALF_DAY' ? 'Half' : s.charAt(0) + s.slice(1).toLowerCase()}</Text>
          </View>
        ))}
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {saved && (
        <View style={styles.successBox}>
          <Text style={styles.successText}>Attendance saved successfully.</Text>
        </View>
      )}

      {/* Roster */}
      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={Colors.brand500} />
      ) : (
        <FlatList
          data={roster}
          keyExtractor={e => e.studentId}
          renderItem={({ item }) => (
            <RosterRow
              entry={item}
              status={statuses[item.studentId] ?? null}
              onStatus={s => setStatuses(prev => ({ ...prev, [item.studentId]: s }))}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No students in this class.</Text>
            </View>
          }
          contentContainerStyle={styles.list}
        />
      )}

      {/* Save button */}
      {roster.length > 0 && (
        <View style={styles.saveBar}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={() => void save()}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={styles.saveBtnText}>Save Attendance</Text>}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: Colors.pageBackground },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[2],
  },
  title:  { fontSize: Typography['2xl'], fontWeight: '700', color: Colors.gray900 },
  date:   { fontSize: Typography.sm, color: Colors.gray400 },
  classBar:        { maxHeight: 48 },
  classBarContent: { paddingHorizontal: Spacing[5], gap: Spacing[2], paddingVertical: 6 },
  classChip: {
    paddingHorizontal: Spacing[4],
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  classChipActive:     { backgroundColor: Colors.brand500, borderColor: Colors.brand500 },
  classChipText:       { fontSize: Typography.sm, color: Colors.gray700, fontWeight: '500' },
  classChipTextActive: { color: Colors.white },
  markAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[2],
    gap: Spacing[2],
  },
  markAllLabel:    { fontSize: Typography.xs, color: Colors.gray400, marginRight: 4 },
  markAllBtn:      { paddingHorizontal: Spacing[3], paddingVertical: 4, borderRadius: Radius.sm },
  markAllBtnText:  { fontSize: Typography.xs, fontWeight: '700' },
  summaryBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[3],
    gap: Spacing[5],
  },
  summaryItem:  { alignItems: 'center' },
  summaryCount: { fontSize: Typography.xl, fontWeight: '700' },
  summaryLabel: { fontSize: 10, color: Colors.gray400, marginTop: 1 },
  errorBox: {
    marginHorizontal: Spacing[5],
    marginBottom: Spacing[2],
    padding: Spacing[3],
    backgroundColor: '#fef2f2',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: { color: Colors.error600, fontSize: Typography.sm },
  successBox: {
    marginHorizontal: Spacing[5],
    marginBottom: Spacing[2],
    padding: Spacing[3],
    backgroundColor: '#dcfce7',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  successText: { color: '#15803d', fontSize: Typography.sm },
  list:      { paddingHorizontal: Spacing[5], paddingBottom: Spacing[8] },
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    marginBottom: Spacing[2],
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { color: Colors.brand500, fontWeight: '700', fontSize: Typography.xs },
  rosterInfo: { flex: 1 },
  rosterName: { fontSize: Typography.sm, fontWeight: '600', color: Colors.gray900 },
  rosterAdm:  { fontSize: 11, color: Colors.gray400, marginTop: 1, fontFamily: 'monospace' },
  separator:  { height: 0 },
  empty:      { padding: Spacing[10], alignItems: 'center' },
  emptyText:  { color: Colors.gray400, fontSize: Typography.sm },
  saveBar: {
    padding: Spacing[5],
    paddingTop: Spacing[3],
    backgroundColor: Colors.pageBackground,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  saveBtn:         { backgroundColor: Colors.brand500, borderRadius: Radius.lg, padding: Spacing[4], alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText:     { color: Colors.white, fontSize: Typography.base, fontWeight: '700' },
});
