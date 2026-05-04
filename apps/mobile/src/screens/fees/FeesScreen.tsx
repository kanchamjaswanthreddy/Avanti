// Vidyut Mobile — Fees Screen

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
import type { FeeStructure, FeeDefaulter } from '@vidyut/types';

// helpers
function fullName(d: FeeDefaulter): string { return `${d.firstName} ${d.lastName}`; }
import { Colors, Typography, Spacing, Radius } from '../../constants/colors';

function rupees(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN');
}

function StatCard({ label, value, color = Colors.gray900 }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

function DefaulterRow({ item }: { item: FeeDefaulter }) {
  const initials = (item.firstName[0] ?? 'S').toUpperCase();
  return (
    <View style={styles.defaulterRow}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.defaulterInfo}>
        <Text style={styles.defaulterName}>{fullName(item)}</Text>
        <Text style={styles.defaulterClass}>{item.className ?? '—'}</Text>
      </View>
      <View style={styles.defaulterBalance}>
        <Text style={styles.balanceAmt}>{rupees(item.balance)}</Text>
        <Text style={styles.balanceLabel}>due</Text>
      </View>
    </View>
  );
}

export function FeesScreen() {
  const [structures,  setStructures]  = useState<FeeStructure[]>([]);
  const [selectedId,  setSelectedId]  = useState<string | null>(null);
  const [defaulters,  setDefaulters]  = useState<FeeDefaulter[]>([]);
  const [collected,   setCollected]   = useState(0);
  const [pending,     setPending]     = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loadingFee,  setLoadingFee]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  // Load fee structures on mount
  useEffect(() => {
    void (async () => {
      try {
        const data = await getApiClient().getFeeStructures();
        setStructures(data);
        if (data.length > 0 && data[0]) setSelectedId(data[0].id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load fee structures');
      }
    })();
  }, []);

  const loadStats = useCallback(async (feeStructureId: string) => {
    setLoadingFee(true);
    setError(null);
    try {
      const [defs, struct] = await Promise.all([
        getApiClient().getFeeDefaulters(feeStructureId),
        getApiClient().getFeeStructure(feeStructureId),
      ]);
      setDefaulters(defs);
      const totalBalance = defs.reduce((s, d) => s + d.balance, 0);
      const total = struct.totalAmount * struct.installments;
      setTotalAmount(total);
      setPending(totalBalance);
      setCollected(total - totalBalance);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fee data');
    } finally {
      setLoadingFee(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) void loadStats(selectedId);
  }, [selectedId, loadStats]);

  const pct = totalAmount > 0 ? Math.round((collected / totalAmount) * 100) : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Fee Collections</Text>
      </View>

      {/* Structure tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        {structures.map(s => (
          <TouchableOpacity
            key={s.id}
            style={[styles.tab, selectedId === s.id && styles.tabActive]}
            onPress={() => setSelectedId(s.id)}
          >
            <Text style={[styles.tabText, selectedId === s.id && styles.tabTextActive]}>
              {s.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loadingFee ? (
        <ActivityIndicator style={{ marginTop: Spacing[8] }} color={Colors.brand500} />
      ) : (
        <>
          {/* Stats row */}
          <View style={styles.statsRow}>
            <StatCard label="Total"     value={rupees(totalAmount)} />
            <StatCard label="Collected" value={rupees(collected)}  color={Colors.success600} />
            <StatCard label="Pending"   value={rupees(pending)}    color={Colors.error600} />
            <StatCard label="Collected" value={`${pct}%`}          color={Colors.brand500} />
          </View>

          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${pct}%` }]} />
            </View>
            <Text style={styles.progressLabel}>{pct}% collected</Text>
          </View>

          {/* Defaulters list */}
          <Text style={styles.sectionTitle}>
            Defaulters ({defaulters.length})
          </Text>
          <FlatList
            data={defaulters}
            keyExtractor={d => d.studentId}
            renderItem={({ item }) => <DefaulterRow item={item} />}
            ItemSeparatorComponent={() => <View style={{ height: Spacing[2] }} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No outstanding defaulters.</Text>
              </View>
            }
            contentContainerStyle={styles.list}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.pageBackground },
  header: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[2],
  },
  title:  { fontSize: Typography['2xl'], fontWeight: '700', color: Colors.gray900 },
  tabBar:        { maxHeight: 48 },
  tabBarContent: { paddingHorizontal: Spacing[5], gap: Spacing[2], paddingVertical: 6 },
  tab: {
    paddingHorizontal: Spacing[4],
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  tabActive:     { backgroundColor: Colors.brand500, borderColor: Colors.brand500 },
  tabText:       { fontSize: Typography.sm, color: Colors.gray700, fontWeight: '500' },
  tabTextActive: { color: Colors.white },
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
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing[5],
    gap: Spacing[3],
    marginTop: Spacing[3],
    marginBottom: Spacing[3],
  },
  statCard: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  statLabel: { fontSize: Typography.xs, fontWeight: '600', color: Colors.gray400, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: Typography.xl, fontWeight: '700', marginTop: Spacing[1] },
  progressContainer: {
    paddingHorizontal: Spacing[5],
    marginBottom: Spacing[4],
    gap: 6,
  },
  progressBg:   { height: 8, backgroundColor: Colors.gray200, borderRadius: Radius.full, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: Colors.success500, borderRadius: Radius.full, width: '0%' },
  progressLabel:{ fontSize: Typography.xs, color: Colors.gray400 },
  sectionTitle: {
    fontSize: Typography.xs,
    fontWeight: '600',
    color: Colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing[5],
    marginBottom: Spacing[2],
  },
  list: { paddingHorizontal: Spacing[5], paddingBottom: Spacing[8] },
  defaulterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText:      { color: Colors.error600, fontWeight: '700', fontSize: Typography.xs },
  defaulterInfo:   { flex: 1 },
  defaulterName:   { fontSize: Typography.sm, fontWeight: '600', color: Colors.gray900 },
  defaulterClass:  { fontSize: 11, color: Colors.gray400, marginTop: 1 },
  defaulterBalance:{ alignItems: 'flex-end' },
  balanceAmt:      { fontSize: Typography.base, fontWeight: '700', color: Colors.error600 },
  balanceLabel:    { fontSize: 10, color: Colors.gray400, marginTop: 1 },
  empty:      { padding: Spacing[10], alignItems: 'center' },
  emptyText:  { color: Colors.gray400, fontSize: Typography.sm },
});
