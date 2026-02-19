import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio, Video, ResizeMode } from 'expo-av';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '../context/ThemeContext';
import { useNetwork } from '../context/NetworkContext';
import { getPresignedUrl } from '../services/s3';
import {
  downloadFile,
  isFileDownloaded,
  getLocalFileUri,
} from '../services/offlineManager';
import { getFileType, isImage, isVideo, isAudio } from '../constants/fileTypes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ViewerScreen() {
  const params = useLocalSearchParams<{
    uri: string;
    filename: string;
    ext: string;
    bucket: string;
    key: string;
  }>();

  const { colors } = useTheme();
  const { isConnected } = useNetwork();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const { uri, filename, ext, bucket, key } = params;
  const ft = getFileType(ext);

  const handleDownload = async () => {
    if (!isConnected) {
      Alert.alert('Hors ligne', 'Connexion requise pour télécharger.');
      return;
    }
    try {
      setDownloading(true);
      const url = getPresignedUrl(bucket!, key!, 7200);
      await downloadFile(bucket!, key!, url);
      Alert.alert('Téléchargé ✓', `${filename} est disponible hors ligne.`);
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    const localUri = await getLocalFileUri(bucket!, key!);
    if (localUri) {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(localUri);
      }
      return;
    }

    // Need to download first
    if (!isConnected) {
      Alert.alert('Hors ligne', 'Fichier non disponible.');
      return;
    }

    try {
      setDownloading(true);
      const url = getPresignedUrl(bucket!, key!, 7200);
      const localPath = await downloadFile(bucket!, key!, url);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(localPath);
      }
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenExternal = async () => {
    if (uri) {
      await WebBrowser.openBrowserAsync(uri);
    }
  };

  const renderContent = () => {
    if (!uri) {
      return (
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={48} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.text }]}>Fichier non disponible</Text>
        </View>
      );
    }

    if (isImage(ext || '')) {
      return (
        <ScrollView
          contentContainerStyle={styles.imageContainer}
          maximumZoomScale={4}
          minimumZoomScale={1}
          showsVerticalScrollIndicator={false}
        >
          <Image
            source={{ uri }}
            style={styles.image}
            resizeMode="contain"
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              Alert.alert('Erreur', 'Impossible de charger l\'image.');
            }}
          />
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
        </ScrollView>
      );
    }

    if (isVideo(ext || '')) {
      return (
        <View style={styles.videoContainer}>
          <Video
            source={{ uri }}
            style={styles.video}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={false}
            onLoad={() => setLoading(false)}
          />
        </View>
      );
    }

    if (isAudio(ext || '')) {
      return (
        <View style={styles.center}>
          <View style={[styles.audioIcon, { backgroundColor: ft.bg }]}>
            <Ionicons name="musical-notes" size={64} color={ft.color} />
          </View>
          <Text style={[styles.audioTitle, { color: colors.text }]}>{filename}</Text>
          <Audio />
          <TouchableOpacity
            style={[styles.playBtn, { backgroundColor: colors.primary }]}
            onPress={handleOpenExternal}
          >
            <Ionicons name="play" size={24} color="#FFF" />
            <Text style={styles.playBtnText}>Écouter</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Default: unsupported preview
    return (
      <View style={styles.center}>
        <View style={[styles.fileIconBig, { backgroundColor: ft.bg }]}>
          <Ionicons name={ft.icon} size={64} color={ft.color} />
        </View>
        <Text style={[styles.fileName, { color: colors.text }]}>{filename}</Text>
        <Text style={[styles.noPreview, { color: colors.textSecondary }]}>
          Aperçu non disponible pour ce type de fichier.
        </Text>
        <Text style={[styles.noPreviewSub, { color: colors.textTertiary }]}>
          Téléchargez le fichier pour l'ouvrir.
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: filename || 'Aperçu' }} />

      {renderContent()}

      {/* Bottom actions */}
      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity style={[styles.bottomBtn, { backgroundColor: colors.primaryLight }]} onPress={handleDownload}>
          {downloading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="cloud-download" size={22} color={colors.primary} />
          )}
          <Text style={[styles.bottomBtnText, { color: colors.primary }]}>Télécharger</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.bottomBtn, { backgroundColor: '#F5F3FF' }]} onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color="#7C3AED" />
          <Text style={[styles.bottomBtnText, { color: '#7C3AED' }]}>Partager</Text>
        </TouchableOpacity>

        {uri && (
          <TouchableOpacity
            style={[styles.bottomBtn, { backgroundColor: '#ECFEFF' }]}
            onPress={handleOpenExternal}
          >
            <Ionicons name="open-outline" size={22} color="#0E7490" />
            <Text style={[styles.bottomBtnText, { color: '#0E7490' }]}>Ouvrir</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  imageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: {
    width: SCREEN_WIDTH,
    height: (SCREEN_WIDTH * 9) / 16,
  },
  audioIcon: {
    width: 120,
    height: 120,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  audioTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    gap: 8,
  },
  playBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  fileIconBig: {
    width: 100,
    height: 100,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  fileName: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  noPreview: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  noPreviewSub: {
    fontSize: 13,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  bottomBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
    paddingBottom: 32,
  },
  bottomBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 4,
  },
  bottomBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
