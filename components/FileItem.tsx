import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { R2File } from '../services/s3';
import { getFileType, getExtension, formatSize, formatDate } from '../constants/fileTypes';

interface Props {
  file: R2File;
  isDownloaded?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}

export default function FileItem({ file, isDownloaded, onPress, onLongPress }: Props) {
  const { colors } = useTheme();
  const ext = getExtension(file.name);
  const fileType = getFileType(ext);

  return (
    <TouchableOpacity
      style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrap, { backgroundColor: fileType.bg }]}>
        <Ionicons name={fileType.icon} size={22} color={fileType.color} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {file.name}
        </Text>
        <View style={styles.meta}>
          <Text style={[styles.badge, { backgroundColor: fileType.bg, color: fileType.color }]}>
            {fileType.label}
          </Text>
          <Text style={[styles.size, { color: colors.textSecondary }]}>
            {formatSize(file.size)}
          </Text>
          <Text style={[styles.date, { color: colors.textTertiary }]}>
            {formatDate(file.lastModified)}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        {isDownloaded && (
          <Ionicons
            name="cloud-done"
            size={16}
            color={colors.success}
            style={styles.downloadedIcon}
          />
        )}
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  size: {
    fontSize: 12,
  },
  date: {
    fontSize: 11,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  downloadedIcon: {
    marginRight: 4,
  },
});
