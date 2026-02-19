import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '../../context/ThemeContext';
import { useNetwork } from '../../context/NetworkContext';
import {
  listObjects,
  getPresignedUrl,
  R2File,
  R2Folder,
  R2ListResult,
} from '../../services/s3';
import {
  cacheListResult,
  getCachedListResult,
  downloadFile as downloadFileOffline,
  isFileDownloaded,
  getLocalFileUri,
  deleteLocalFile,
} from '../../services/offlineManager';
import FolderItem from '../../components/FolderItem';
import FileItem from '../../components/FileItem';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import NetworkBanner from '../../components/NetworkBanner';
import SearchBar from '../../components/SearchBar';
import FileActionSheet from '../../components/FileActionSheet';
import { getExtension, isImage, isVideo, isAudio } from '../../constants/fileTypes';

export default function BucketScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { isConnected } = useNetwork();

  const [prefix, setPrefix] = useState('');
  const [folders, setFolders] = useState<R2Folder[]>([]);
  const [files, setFiles] = useState<R2File[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [downloadedMap, setDownloadedMap] = useState<Record<string, boolean>>({});
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Action sheet
  const [selectedFile, setSelectedFile] = useState<R2File | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  // Breadcrumb
  const pathParts = prefix
    .split('/')
    .filter(Boolean)
    .map((part, i, arr) => ({
      label: part,
      prefix: arr.slice(0, i + 1).join('/') + '/',
    }));

  const fetchData = useCallback(async () => {
    try {
      if (isConnected) {
        const result = await listObjects(name!, prefix);
        setFolders(result.folders);
        setFiles(result.files);
        await cacheListResult(name!, prefix, result);
      } else {
        const cached = await getCachedListResult(name!, prefix);
        if (cached) {
          setFolders(cached.folders);
          setFiles(cached.files);
        }
      }

      // Check which files are downloaded
      const map: Record<string, boolean> = {};
      for (const f of files) {
        map[f.key] = await isFileDownloaded(name!, f.key);
      }
      setDownloadedMap(map);
    } catch (err: any) {
      const cached = await getCachedListResult(name!, prefix);
      if (cached) {
        setFolders(cached.folders);
        setFiles(cached.files);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [name, prefix, isConnected]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  // Update downloaded map when files change
  useEffect(() => {
    const checkDownloads = async () => {
      const map: Record<string, boolean> = {};
      for (const f of files) {
        map[f.key] = await isFileDownloaded(name!, f.key);
      }
      setDownloadedMap(map);
    };
    if (files.length > 0) checkDownloads();
  }, [files, name]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const navigateToFolder = (folderPrefix: string) => {
    setPrefix(folderPrefix);
    setSearch('');
  };

  const goBack = () => {
    if (prefix) {
      const parts = prefix.split('/').filter(Boolean);
      parts.pop();
      setPrefix(parts.length > 0 ? parts.join('/') + '/' : '');
    }
  };

  // ─── File Actions ──────────────────────────────────────────────────────────

  const handleView = async (file: R2File) => {
    setSheetVisible(false);
    const ext = getExtension(file.name);

    // Check if already downloaded
    const localUri = await getLocalFileUri(name!, file.key);
    if (localUri) {
      router.push({
        pathname: '/viewer',
        params: { uri: localUri, filename: file.name, ext, bucket: name!, key: file.key },
      });
      return;
    }

    // Online: use pre-signed URL
    if (isConnected) {
      const url = getPresignedUrl(name!, file.key);
      if (isImage(ext) || isVideo(ext) || isAudio(ext)) {
        router.push({
          pathname: '/viewer',
          params: { uri: url, filename: file.name, ext, bucket: name!, key: file.key },
        });
      } else {
        await WebBrowser.openBrowserAsync(url);
      }
    } else {
      Alert.alert('Hors ligne', 'Téléchargez le fichier pour le voir hors ligne.');
    }
  };

  const handleDownload = async (file: R2File) => {
    setSheetVisible(false);

    if (downloadedMap[file.key]) {
      Alert.alert('Déjà téléchargé', 'Ce fichier est déjà disponible hors ligne.');
      return;
    }

    if (!isConnected) {
      Alert.alert('Hors ligne', 'Connexion requise pour télécharger.');
      return;
    }

    try {
      setDownloading(file.key);
      setDownloadProgress(0);
      const url = getPresignedUrl(name!, file.key, 7200);
      await downloadFileOffline(name!, file.key, url, (progress) => {
        setDownloadProgress(progress);
      });
      setDownloadedMap((prev) => ({ ...prev, [file.key]: true }));
      Alert.alert('Téléchargé ✓', `${file.name} est disponible hors ligne.`);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Échec du téléchargement.');
    } finally {
      setDownloading(null);
      setDownloadProgress(0);
    }
  };

  const handleShare = async (file: R2File) => {
    setSheetVisible(false);

    // Try sharing local file first
    const localUri = await getLocalFileUri(name!, file.key);
    if (localUri) {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(localUri);
      }
      return;
    }

    // Download first, then share
    if (!isConnected) {
      Alert.alert('Hors ligne', 'Téléchargez le fichier d\'abord.');
      return;
    }

    try {
      setDownloading(file.key);
      const url = getPresignedUrl(name!, file.key, 7200);
      const localPath = await downloadFileOffline(name!, file.key, url, (progress) => {
        setDownloadProgress(progress);
      });
      setDownloadedMap((prev) => ({ ...prev, [file.key]: true }));

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(localPath);
      }
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Échec du partage.');
    } finally {
      setDownloading(null);
      setDownloadProgress(0);
    }
  };

  const handleDeleteLocal = async (file: R2File) => {
    setSheetVisible(false);
    try {
      await deleteLocalFile(name!, file.key);
      setDownloadedMap((prev) => ({ ...prev, [file.key]: false }));
      Alert.alert('Supprimé', 'Fichier local supprimé.');
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    }
  };

  // ─── Filter ────────────────────────────────────────────────────────────────

  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: R2Folder | R2File }) => {
    if ('prefix' in item) {
      return <FolderItem folder={item} onPress={() => navigateToFolder(item.prefix)} />;
    }
    return (
      <FileItem
        file={item}
        isDownloaded={downloadedMap[item.key]}
        onPress={() => handleView(item)}
        onLongPress={() => {
          setSelectedFile(item);
          setSheetVisible(true);
        }}
      />
    );
  };

  const allItems: (R2Folder | R2File)[] = [...filteredFolders, ...filteredFiles];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: name || 'Fichiers' }} />
      <NetworkBanner />

      {/* Breadcrumb */}
      <View style={[styles.breadcrumb, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.breadcrumbItem}
          onPress={() => { setPrefix(''); setSearch(''); }}
        >
          <Ionicons name="home" size={16} color={colors.primary} />
          <Text style={[styles.breadcrumbText, { color: colors.primary }]}>{name}</Text>
        </TouchableOpacity>
        {pathParts.map((part) => (
          <React.Fragment key={part.prefix}>
            <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
            <TouchableOpacity
              style={styles.breadcrumbItem}
              onPress={() => navigateToFolder(part.prefix)}
            >
              <Text style={[styles.breadcrumbText, { color: colors.primary }]}>
                {part.label}
              </Text>
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </View>

      {/* Back button when in subfolder */}
      {prefix !== '' && (
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.surfaceSecondary }]}
          onPress={goBack}
        >
          <Ionicons name="arrow-back" size={18} color={colors.primary} />
          <Text style={[styles.backText, { color: colors.primary }]}>Retour</Text>
        </TouchableOpacity>
      )}

      <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher un fichier…" />

      {/* Download progress */}
      {downloading && (
        <View style={[styles.progressBar, { backgroundColor: colors.surfaceSecondary }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${downloadProgress}%`, backgroundColor: colors.primary },
            ]}
          />
          <Text style={[styles.progressText, { color: colors.text }]}>
            Téléchargement… {downloadProgress}%
          </Text>
        </View>
      )}

      {loading ? (
        <LoadingState message="Chargement des fichiers…" />
      ) : (
        <FlatList
          data={allItems}
          keyExtractor={(item) => ('prefix' in item ? item.prefix : item.key)}
          renderItem={renderItem}
          ListEmptyComponent={
            <EmptyState
              icon="folder-open"
              title="Dossier vide"
              subtitle="Aucun fichier ou dossier ici"
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Action Sheet */}
      <FileActionSheet
        visible={sheetVisible}
        file={selectedFile}
        isDownloaded={selectedFile ? downloadedMap[selectedFile.key] ?? false : false}
        onClose={() => setSheetVisible(false)}
        onView={() => selectedFile && handleView(selectedFile)}
        onDownload={() => selectedFile && handleDownload(selectedFile)}
        onShare={() => selectedFile && handleShare(selectedFile)}
        onDeleteLocal={() => selectedFile && handleDeleteLocal(selectedFile)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexWrap: 'wrap',
    gap: 4,
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  breadcrumbText: {
    fontSize: 13,
    fontWeight: '600',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  backText: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressBar: {
    marginHorizontal: 16,
    marginVertical: 8,
    height: 28,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 8,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  list: {
    paddingBottom: 24,
  },
});
