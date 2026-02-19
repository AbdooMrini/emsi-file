import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useNetwork } from '../context/NetworkContext';
import { clearAllCache, getCacheSize } from '../services/offlineManager';
import { formatSize } from '../constants/fileTypes';
import { APP_NAME, APP_SUBTITLE } from '../constants/config';

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { isConnected } = useNetwork();
  const [cacheSize, setCacheSize] = useState(0);

  useEffect(() => {
    getCacheSize().then(setCacheSize);
  }, []);

  const handleClearCache = () => {
    Alert.alert(
      'Vider le cache',
      'Cela supprimera tous les fichiers téléchargés et les données en cache.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Vider',
          style: 'destructive',
          onPress: async () => {
            await clearAllCache();
            setCacheSize(0);
            Alert.alert('Cache vidé', 'Toutes les données en cache ont été supprimées.');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* App Info */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.appInfo}>
          <Text style={styles.appEmoji}>📚</Text>
          <View>
            <Text style={[styles.appName, { color: colors.text }]}>{APP_NAME}</Text>
            <Text style={[styles.appSub, { color: colors.textSecondary }]}>{APP_SUBTITLE}</Text>
          </View>
        </View>
      </View>

      {/* Network Status */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>État</Text>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Ionicons
              name={isConnected ? 'wifi' : 'cloud-offline'}
              size={22}
              color={isConnected ? colors.success : colors.warning}
            />
            <Text style={[styles.rowText, { color: colors.text }]}>Connexion</Text>
          </View>
          <Text
            style={[
              styles.badge,
              {
                backgroundColor: isConnected ? '#F0FDF4' : '#FFF7ED',
                color: isConnected ? '#16A34A' : '#EA580C',
              },
            ]}
          >
            {isConnected ? 'En ligne' : 'Hors ligne'}
          </Text>
        </View>
      </View>

      {/* Appearance */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Apparence</Text>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity style={styles.row} onPress={toggleTheme}>
          <View style={styles.rowLeft}>
            <Ionicons name={isDark ? 'sunny' : 'moon'} size={22} color={colors.primary} />
            <Text style={[styles.rowText, { color: colors.text }]}>
              {isDark ? 'Mode clair' : 'Mode sombre'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {/* Storage */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Stockage</Text>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Ionicons name="folder" size={22} color={colors.warning} />
            <Text style={[styles.rowText, { color: colors.text }]}>Cache local</Text>
          </View>
          <Text style={[styles.rowValue, { color: colors.textSecondary }]}>
            {formatSize(cacheSize)}
          </Text>
        </View>
        <View style={[styles.separator, { backgroundColor: colors.border }]} />
        <TouchableOpacity style={styles.row} onPress={handleClearCache}>
          <View style={styles.rowLeft}>
            <Ionicons name="trash" size={22} color={colors.danger} />
            <Text style={[styles.rowText, { color: colors.danger }]}>Vider le cache</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {/* About */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>À propos</Text>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Ionicons name="information-circle" size={22} color={colors.primary} />
            <Text style={[styles.rowText, { color: colors.text }]}>Version</Text>
          </View>
          <Text style={[styles.rowValue, { color: colors.textSecondary }]}>1.0.0</Text>
        </View>
        <View style={[styles.separator, { backgroundColor: colors.border }]} />
        <TouchableOpacity
          style={styles.row}
          onPress={() => Linking.openURL('https://abdomrini.dev')}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="code-slash" size={22} color={colors.primary} />
            <Text style={[styles.rowText, { color: colors.text }]}>Développé par Mrini Abdo</Text>
          </View>
          <Ionicons name="open-outline" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  appInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  appEmoji: {
    fontSize: 40,
  },
  appName: {
    fontSize: 20,
    fontWeight: '700',
  },
  appSub: {
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: {
    fontSize: 16,
  },
  rowValue: {
    fontSize: 14,
  },
  badge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  separator: {
    height: 1,
    marginLeft: 50,
  },
  spacer: {
    height: 40,
  },
});
