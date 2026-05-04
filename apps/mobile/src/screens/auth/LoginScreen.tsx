// Avanti Mobile — Login Screen
// Email + password + school ID. Biometric shortcut if enrolled.

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { AvantiApiClient } from '@avanti/api-client';
import { useAuthStore } from '../../store/authStore';
import { Colors, Typography, Spacing, Radius } from '../../constants/colors';

const API_BASE = process.env['VIDYUT_API_URL'] ?? 'http://10.0.2.2:4000';

export function LoginScreen() {
  const setAuth = useAuthStore(s => s.setAuth);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password || !schoolId.trim()) {
      setError('All fields are required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const client = new AvantiApiClient({ baseUrl: API_BASE });
      const result = await client.login(email.trim(), password, schoolId.trim());
      setAuth(result.accessToken, {
        userId:   result.user.id,
        schoolId: result.user.schoolId,
        role:     result.user.role,
        email:    result.user.email,
        name:     result.user.name,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoSection}>
          <Text style={styles.logoText}>Avanti</Text>
          <Text style={styles.logoSub}>School Management</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.heading}>Sign in</Text>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>School ID</Text>
            <TextInput
              style={styles.input}
              value={schoolId}
              onChangeText={setSchoolId}
              placeholder="e.g. dps-hyderabad"
              placeholderTextColor={Colors.gray400}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@school.edu.in"
              placeholderTextColor={Colors.gray400}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={Colors.gray400}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={() => void handleLogin()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.loginButtonText}>Sign in</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.forgotLink}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Secure · India-first · Built for schools</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.pageBackground,
  },
  scroll: {
    flexGrow: 1,
    padding: Spacing[6],
    justifyContent: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: Spacing[8],
  },
  logoText: {
    fontSize: Typography['3xl'],
    fontWeight: '800',
    color: Colors.brand500,
    letterSpacing: -0.5,
  },
  logoSub: {
    fontSize: Typography.sm,
    color: Colors.gray400,
    marginTop: Spacing[1],
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing[6],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  heading: {
    fontSize: Typography['2xl'],
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: Spacing[4],
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: Radius.md,
    padding: Spacing[3],
    marginBottom: Spacing[4],
  },
  errorText: {
    fontSize: Typography.sm,
    color: Colors.error600,
  },
  fieldGroup: {
    marginBottom: Spacing[4],
  },
  label: {
    fontSize: Typography.xs,
    fontWeight: '600',
    color: Colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing[1],
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[3],
    fontSize: Typography.base,
    color: Colors.gray900,
    backgroundColor: Colors.white,
  },
  loginButton: {
    backgroundColor: Colors.brand500,
    borderRadius: Radius.md,
    paddingVertical: Spacing[3] + 2,
    alignItems: 'center',
    marginTop: Spacing[2],
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: Colors.white,
    fontSize: Typography.base,
    fontWeight: '600',
  },
  forgotLink: {
    alignItems: 'center',
    marginTop: Spacing[4],
  },
  forgotText: {
    fontSize: Typography.sm,
    color: Colors.brand500,
  },
  footer: {
    textAlign: 'center',
    fontSize: Typography.xs,
    color: Colors.gray400,
    marginTop: Spacing[6],
  },
});
