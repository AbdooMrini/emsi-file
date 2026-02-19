import { Ionicons } from '@expo/vector-icons';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export interface FileTypeInfo {
  icon: IoniconsName;
  color: string;
  label: string;
  bg: string;
}

export const FILE_TYPES: Record<string, FileTypeInfo> = {
  pdf:  { icon: 'document-text',    color: '#FF3B30', label: 'PDF',     bg: '#FFF1F0' },
  doc:  { icon: 'document-text',    color: '#2563EB', label: 'Word',    bg: '#EFF6FF' },
  docx: { icon: 'document-text',    color: '#2563EB', label: 'Word',    bg: '#EFF6FF' },
  xls:  { icon: 'grid-outline',     color: '#16A34A', label: 'Excel',   bg: '#F0FDF4' },
  xlsx: { icon: 'grid-outline',     color: '#16A34A', label: 'Excel',   bg: '#F0FDF4' },
  ppt:  { icon: 'easel-outline',    color: '#EA580C', label: 'PPT',     bg: '#FFF7ED' },
  pptx: { icon: 'easel-outline',    color: '#EA580C', label: 'PPT',     bg: '#FFF7ED' },
  jpg:  { icon: 'image',            color: '#7C3AED', label: 'Image',   bg: '#F5F3FF' },
  jpeg: { icon: 'image',            color: '#7C3AED', label: 'Image',   bg: '#F5F3FF' },
  png:  { icon: 'image',            color: '#7C3AED', label: 'Image',   bg: '#F5F3FF' },
  gif:  { icon: 'image',            color: '#7C3AED', label: 'Image',   bg: '#F5F3FF' },
  svg:  { icon: 'image',            color: '#7C3AED', label: 'SVG',     bg: '#F5F3FF' },
  webp: { icon: 'image',            color: '#7C3AED', label: 'Image',   bg: '#F5F3FF' },
  mp4:  { icon: 'videocam',         color: '#0E7490', label: 'Vidéo',   bg: '#ECFEFF' },
  mp3:  { icon: 'musical-notes',    color: '#BE185D', label: 'Audio',   bg: '#FDF4FF' },
  wav:  { icon: 'musical-notes',    color: '#BE185D', label: 'Audio',   bg: '#FDF4FF' },
  zip:  { icon: 'archive',          color: '#92400E', label: 'ZIP',     bg: '#FFFBEB' },
  rar:  { icon: 'archive',          color: '#92400E', label: 'RAR',     bg: '#FFFBEB' },
  txt:  { icon: 'document-outline', color: '#4B5563', label: 'Texte',   bg: '#F9FAFB' },
  csv:  { icon: 'grid-outline',     color: '#15803D', label: 'CSV',     bg: '#F0FDF4' },
};

export const DEFAULT_FILE_TYPE: FileTypeInfo = {
  icon: 'document-outline',
  color: '#6B7280',
  label: 'Fichier',
  bg: '#F3F4F6',
};

export function getFileType(ext?: string): FileTypeInfo {
  if (!ext) return DEFAULT_FILE_TYPE;
  return FILE_TYPES[ext.toLowerCase()] || DEFAULT_FILE_TYPE;
}

export function getExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

export function formatSize(bytes?: number): string {
  if (!bytes) return '0 o';
  if (bytes < 1024) return bytes + ' o';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' Go';
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function isPreviewable(ext: string): boolean {
  const previewable = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf', 'mp4', 'webm', 'mp3', 'wav', 'txt'];
  return previewable.includes(ext.toLowerCase());
}

export function isImage(ext: string): boolean {
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext.toLowerCase());
}

export function isVideo(ext: string): boolean {
  return ['mp4', 'webm', 'ogv'].includes(ext.toLowerCase());
}

export function isAudio(ext: string): boolean {
  return ['mp3', 'wav', 'ogg', 'm4a'].includes(ext.toLowerCase());
}
