import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { R2File } from '../services/s3';
import { getFileType, getExtension, formatSize } from '../constants/fileTypes';

interface Props {
  visible: boolean;
  file: R2File | null;
  isDownloaded: boolean;
  onClose: () => void;
  onView: () => void;
  onDownload: () => void;
  onShare: () => void;
  onDeleteLocal?: () => void;
}

export default function FileActionSheet({
  visible,
  file,
  isDownloaded,
  onClose,
  onView,
  onDownload,
  onShare,
  onDeleteLocal,
}: Props) {
  const { colors } = useTheme();

  if (!file) return null;

  const ext = getExtension(file.name);
  const ft = getFileType(ext);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.surfaceSecondary }]} />

          {/* File info */}
          <View style={styles.fileInfo}>
            <View style={[styles.iconWrap, { backgroundColor: ft.bg }]}>
              <Ionicons name={ft.icon} size={28} color={ft.color} />
            </View>
            <View style={styles.fileDetails}>
              <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={2}>
                {file.name}
              </Text>
              <Text style={[styles.fileMeta, { color: colors.textSecondary }]}>
                {ft.label} • {formatSize(file.size)}
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.action, { backgroundColor: colors.primaryLight }]}
              onPress={onView}
            >
              <Ionicons name="eye" size={22} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.primary }]}>Voir</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.action, { backgroundColor: isDownloaded ? '#F0FDF4' : colors.primaryLight }]}
              onPress={onDownload}
            >
              <Ionicons
                name={isDownloaded ? 'cloud-done' : 'cloud-download'}
                size={22}
                color={isDownloaded ? '#16A34A' : colors.primary}
              />
              <Text style={[styles.actionText, { color: isDownloaded ? '#16A34A' : colors.primary }]}>
                {isDownloaded ? 'Téléchargé' : 'Télécharger'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.action, { backgroundColor: '#F5F3FF' }]}
              onPress={onShare}
            >
              <Ionicons name="share-outline" size={22} color="#7C3AED" />
              <Text style={[styles.actionText, { color: '#7C3AED' }]}>Partager</Text>
            </TouchableOpacity>
          </View>

          {isDownloaded && onDeleteLocal && (
            <TouchableOpacity
              style={[styles.deleteAction, { borderColor: colors.border }]}
              onPress={onDeleteLocal}
            >
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
              <Text style={[styles.deleteText, { color: colors.danger }]}>
                Supprimer le fichier local
              </Text>
            </TouchableOpacity>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconWrap: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  fileMeta: {
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  action: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  deleteText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
