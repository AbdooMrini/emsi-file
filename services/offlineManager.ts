/**
 * Offline Manager — cache metadata and downloaded files for offline access.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { R2Bucket, R2File, R2Folder, R2ListResult } from './s3';

const CACHE_PREFIX = '@emsi_cache_';
const DOWNLOADS_DIR = FileSystem.documentDirectory + 'downloads/';

// ─── Ensure downloads directory exists ───────────────────────────────────────

async function ensureDownloadDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(DOWNLOADS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(DOWNLOADS_DIR, { intermediates: true });
  }
}

// ─── Metadata Cache ──────────────────────────────────────────────────────────

export async function cacheBuckets(buckets: R2Bucket[]): Promise<void> {
  await AsyncStorage.setItem(CACHE_PREFIX + 'buckets', JSON.stringify(buckets));
}

export async function getCachedBuckets(): Promise<R2Bucket[] | null> {
  const data = await AsyncStorage.getItem(CACHE_PREFIX + 'buckets');
  return data ? JSON.parse(data) : null;
}

export async function cacheListResult(
  bucket: string,
  prefix: string,
  result: R2ListResult
): Promise<void> {
  const key = CACHE_PREFIX + `list_${bucket}_${prefix}`;
  await AsyncStorage.setItem(key, JSON.stringify(result));
}

export async function getCachedListResult(
  bucket: string,
  prefix: string
): Promise<R2ListResult | null> {
  const key = CACHE_PREFIX + `list_${bucket}_${prefix}`;
  const data = await AsyncStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}

// ─── File Downloads ──────────────────────────────────────────────────────────

function getLocalPath(bucket: string, key: string): string {
  const safeName = key.replace(/\//g, '__');
  return DOWNLOADS_DIR + `${bucket}__${safeName}`;
}

/**
 * Download a file from a pre-signed URL and store it locally.
 */
export async function downloadFile(
  bucket: string,
  key: string,
  url: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  await ensureDownloadDir();
  const localPath = getLocalPath(bucket, key);

  const callback = onProgress
    ? (downloadProgress: FileSystem.DownloadProgressData) => {
        if (downloadProgress.totalBytesExpectedToWrite > 0) {
          const pct = Math.round(
            (downloadProgress.totalBytesWritten /
              downloadProgress.totalBytesExpectedToWrite) *
              100
          );
          onProgress(pct);
        }
      }
    : undefined;

  const downloadResumable = FileSystem.createDownloadResumable(
    url,
    localPath,
    {},
    callback
  );

  const result = await downloadResumable.downloadAsync();
  if (!result) throw new Error('Download failed');

  // Mark this file as downloaded
  await markAsDownloaded(bucket, key, result.uri);

  return result.uri;
}

/**
 * Check if a file is available offline.
 */
export async function isFileDownloaded(bucket: string, key: string): Promise<boolean> {
  const localPath = getLocalPath(bucket, key);
  const info = await FileSystem.getInfoAsync(localPath);
  return info.exists;
}

/**
 * Get local URI for a downloaded file.
 */
export async function getLocalFileUri(bucket: string, key: string): Promise<string | null> {
  const localPath = getLocalPath(bucket, key);
  const info = await FileSystem.getInfoAsync(localPath);
  return info.exists ? localPath : null;
}

/**
 * Delete a locally downloaded file.
 */
export async function deleteLocalFile(bucket: string, key: string): Promise<void> {
  const localPath = getLocalPath(bucket, key);
  const info = await FileSystem.getInfoAsync(localPath);
  if (info.exists) {
    await FileSystem.deleteAsync(localPath);
  }
  await unmarkAsDownloaded(bucket, key);
}

// ─── Downloaded files index ──────────────────────────────────────────────────

interface DownloadedFileInfo {
  bucket: string;
  key: string;
  localUri: string;
  downloadedAt: string;
}

async function getDownloadedIndex(): Promise<DownloadedFileInfo[]> {
  const data = await AsyncStorage.getItem(CACHE_PREFIX + 'downloaded_files');
  return data ? JSON.parse(data) : [];
}

async function saveDownloadedIndex(index: DownloadedFileInfo[]): Promise<void> {
  await AsyncStorage.setItem(CACHE_PREFIX + 'downloaded_files', JSON.stringify(index));
}

async function markAsDownloaded(bucket: string, key: string, localUri: string): Promise<void> {
  const index = await getDownloadedIndex();
  const existing = index.findIndex((i) => i.bucket === bucket && i.key === key);
  const entry: DownloadedFileInfo = {
    bucket,
    key,
    localUri,
    downloadedAt: new Date().toISOString(),
  };
  if (existing >= 0) {
    index[existing] = entry;
  } else {
    index.push(entry);
  }
  await saveDownloadedIndex(index);
}

async function unmarkAsDownloaded(bucket: string, key: string): Promise<void> {
  const index = await getDownloadedIndex();
  const filtered = index.filter((i) => !(i.bucket === bucket && i.key === key));
  await saveDownloadedIndex(filtered);
}

/**
 * Get all downloaded files (for offline listing).
 */
export async function getAllDownloadedFiles(): Promise<DownloadedFileInfo[]> {
  return getDownloadedIndex();
}

/**
 * Clear all cache and downloaded files.
 */
export async function clearAllCache(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
  await AsyncStorage.multiRemove(cacheKeys);

  const dirInfo = await FileSystem.getInfoAsync(DOWNLOADS_DIR);
  if (dirInfo.exists) {
    await FileSystem.deleteAsync(DOWNLOADS_DIR, { idempotent: true });
  }
}

/**
 * Get total cache size.
 */
export async function getCacheSize(): Promise<number> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(DOWNLOADS_DIR);
    if (!dirInfo.exists) return 0;

    const files = await FileSystem.readDirectoryAsync(DOWNLOADS_DIR);
    let total = 0;
    for (const file of files) {
      const info = await FileSystem.getInfoAsync(DOWNLOADS_DIR + file);
      if (info.exists && 'size' in info) {
        total += (info as any).size || 0;
      }
    }
    return total;
  } catch {
    return 0;
  }
}
