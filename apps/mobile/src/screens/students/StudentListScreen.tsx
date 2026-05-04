// Vidyut Mobile — Student List Screen

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getApiClient } from '../../lib/api';
import type { Student } from '@vidyut/types';
import { Colors, Typography, Spacing, Radius } from '../../constants/colors';

function StudentRow({
  student,
  onPress,
}: {
  student: Student;
  onPress: () => void;
}) {
  const initials = (student.firstName[0] ?? '') + (student.lastName[0] ?? '');

  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials.toUpperCase()}</Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{student.firstName} {student.lastName}</Text>
        <Text style={styles.rowSub}>
          {student.admissionNumber}
          {student.className ? `  ·  ${student.className}` : ''}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

export function StudentListScreen({ navigation }: {
  navigation: { navigate: (s: string, p: Record<string, string>) => void };
}) {
  const [students, setStudents] = useState<Student[]>([]);
  const [search,   setSearch]   = useState('');
  const [page,     setPage]     = useState(1);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const load = useCallback(async (q: string, p: number, reset = false) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getApiClient().getStudents({ page: p, limit: 20, ...(q ? { search: q } : {}) });
      setStudents(prev => reset ? result.data : [...prev, ...result.data]);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(search, 1, true);
    setPage(1);
  }, [load, search]);

  const loadMore = () => {
    if (students.length < total && !loading) {
      const next = page + 1;
      setPage(next);
      void load(search, next, false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Students</Text>
        <Text style={styles.count}>{total > 0 ? `${total} total` : ''}</Text>
      </View>

      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or admission number…"
          placeholderTextColor={Colors.gray400}
          clearButtonMode="while-editing"
        />
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={students}
        keyExtractor={s => s.id}
        renderItem={({ item }) => (
          <StudentRow
            student={item}
            onPress={() => navigation.navigate('StudentDetail', { studentId: item.id })}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No students found.</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loading ? <ActivityIndicator style={{ padding: Spacing[4] }} color={Colors.brand500} /> : null
        }
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: Colors.pageBackground },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing[5], paddingBottom: Spacing[3],
  },
  title:  { fontSize: Typography['2xl'], fontWeight: '700', color: Colors.gray900 },
  count:  { fontSize: Typography.sm, color: Colors.gray400 },
  searchBox: {
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[3],
  },
  searchInput: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    fontSize: Typography.base,
    color: Colors.gray900,
  },
  errorBox: {
    margin: Spacing[5],
    padding: Spacing[3],
    backgroundColor: '#fef2f2',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: { color: Colors.error600, fontSize: Typography.sm },
  list: { paddingHorizontal: Spacing[5], paddingBottom: Spacing[8] },
  row: {
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText:  { color: Colors.brand500, fontWeight: '700', fontSize: Typography.sm },
  rowInfo:     { flex: 1 },
  rowName:     { fontSize: Typography.base, fontWeight: '600', color: Colors.gray900 },
  rowSub:      { fontSize: Typography.xs, color: Colors.gray400, marginTop: 2, fontFamily: 'monospace' },
  chevron:     { fontSize: 20, color: Colors.gray300 },
  separator:   { height: 0 },
  empty: { padding: Spacing[10], alignItems: 'center' },
  emptyText:   { color: Colors.gray400, fontSize: Typography.sm },
});
