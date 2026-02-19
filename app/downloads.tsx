import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../context/ThemeContext';
import {
  getAllDownloadedFiles,
  getLocalFileUri,
  deleteLocalFile,
} from '../services/offlineManager';
import { getFileType, getExtension, formatDate } from '../constants/fileTypes';
import EmptyState from '../components/EmptyState';

interface DownloadedItem {
  bucket: string;
  key: string;
  localUri: string;
  downloadedAt: string;
}

export default function DownloadsScreen() {
  const { colors } = useTheme();
  const [files, setFiles] = useState<DownloadedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFiles = async () => {
    const downloaded = await getAllDownloadedFiles();
    setFiles(downloaded);
    setLoading(false);
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handleShare = async (item: DownloadedItem) => {
    const localUri = await getLocalFileUri(item.bucket, item.key);
    if (localUri) {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(localUri);
      }
    }
  };

  const handleDelete = (item: DownloadedItem) => {
    Alert.alert(
      'Supprimer',
      `Supprimer ${item.key.split('/').pop()} du stockage local ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteLocalFile(item.bucket, item.key);
            loadFiles();
          },
        },
      ]
    );
  };

  const fileName = (key: string) => key.split('/').pop() || key;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={files}
        keyExtractor={(item) => `${item.bucket}_${item.key}`}
        renderItem={({ item }) => {
          const name = fileName(item.key);
          const ext = getExtension(name);
          const ft = getFileType(ext);

          return (
            <View style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.iconWrap, { backgroundColor: ft.bg }]}>
                <Ionicons name={ft.icon} size={22} color={ft.color} />
              </View>
              <View style={styles.info}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={[styles.meta, { color: colors.textSecondary }]}>
                  {item.bucket} • {formatDate(item.downloadedAt)}
                </Text>
              </View>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleShare(item)}>
                <Ionicons name="share-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="cloud-download"
              title="Aucun téléchargement"
              subtitle="Les fichiers téléchargés seront disponibles hors ligne ici."
            />
          ) : null
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 8,
    paddingBottom: 24,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginHorizontal: 8,
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
    marginBottom: 2,
  },
  meta: {
    fontSize: 12,
  },
  actionBtn: {
    padding: 8,
  },
});
