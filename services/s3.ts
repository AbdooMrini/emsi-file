/**
 * S3-compatible client for Cloudflare R2.
 * Supports: ListBuckets, ListObjectsV2, GetObject (pre-signed URL), HeadObject.
 */
import { XMLParser } from 'fast-xml-parser';
import { AwsSigner } from './signer';
import { R2_CONFIG } from '../constants/config';

const signer = new AwsSigner({
  accessKey: R2_CONFIG.accessKey,
  secretKey: R2_CONFIG.secretKey,
  region: R2_CONFIG.region,
  service: 's3',
});

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => {
    // Force these to always be arrays
    return ['Bucket', 'CommonPrefixes', 'Contents'].includes(name);
  },
});

function endpoint(path = ''): string {
  return `${R2_CONFIG.endpoint}${path}`;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface R2Bucket {
  name: string;
  creationDate: string;
}

export interface R2Folder {
  prefix: string;
  name: string;
}

export interface R2File {
  key: string;
  name: string;
  size: number;
  lastModified: string;
  etag?: string;
}

export interface R2ListResult {
  folders: R2Folder[];
  files: R2File[];
  isTruncated: boolean;
  nextContinuationToken?: string;
}

// ─── API Methods ─────────────────────────────────────────────────────────────

/**
 * List all buckets.
 */
export async function listBuckets(): Promise<R2Bucket[]> {
  const url = endpoint('/');
  const signed = signer.sign({ method: 'GET', url });

  const res = await fetch(signed.url, { headers: signed.headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ListBuckets failed (${res.status}): ${text}`);
  }

  const xml = await res.text();
  const parsed = xmlParser.parse(xml);
  const buckets = parsed?.ListAllMyBucketsResult?.Buckets?.Bucket || [];

  return buckets.map((b: any) => ({
    name: b.Name,
    creationDate: b.CreationDate,
  }));
}

/**
 * List objects in a bucket with optional prefix and delimiter.
 */
export async function listObjects(
  bucket: string,
  prefix = '',
  continuationToken?: string
): Promise<R2ListResult> {
  const params = new URLSearchParams({
    'list-type': '2',
    delimiter: '/',
  });
  if (prefix) params.set('prefix', prefix);
  if (continuationToken) params.set('continuation-token', continuationToken);
  params.set('max-keys', '1000');

  const url = endpoint(`/${bucket}?${params.toString()}`);
  const signed = signer.sign({ method: 'GET', url });

  const res = await fetch(signed.url, { headers: signed.headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ListObjects failed (${res.status}): ${text}`);
  }

  const xml = await res.text();
  const parsed = xmlParser.parse(xml);
  const result = parsed?.ListBucketResult || {};

  const currentPrefix = result.Prefix || '';

  // Folders (CommonPrefixes)
  const rawFolders = result.CommonPrefixes || [];
  const folders: R2Folder[] = rawFolders.map((cp: any) => {
    const p = cp.Prefix;
    const name = p.replace(currentPrefix, '').replace(/\/$/, '');
    return { prefix: p, name };
  });

  // Files (Contents) - filter out the prefix itself
  const rawFiles = result.Contents || [];
  const files: R2File[] = rawFiles
    .filter((item: any) => item.Key !== currentPrefix)
    .map((item: any) => {
      const key = item.Key;
      const name = key.replace(currentPrefix, '');
      return {
        key,
        name,
        size: parseInt(item.Size, 10) || 0,
        lastModified: item.LastModified || '',
        etag: item.ETag?.replace(/"/g, ''),
      };
    });

  return {
    folders,
    files,
    isTruncated: result.IsTruncated === 'true' || result.IsTruncated === true,
    nextContinuationToken: result.NextContinuationToken,
  };
}

/**
 * Get a pre-signed URL for downloading/viewing an object.
 */
export function getPresignedUrl(bucket: string, key: string, expiresIn = 3600): string {
  const url = endpoint(`/${bucket}/${encodeURIComponent(key).replace(/%2F/g, '/')}`);
  return signer.presign(url, expiresIn);
}

/**
 * Get object metadata (HEAD).
 */
export async function headObject(
  bucket: string,
  key: string
): Promise<{ contentType: string; contentLength: number }> {
  const url = endpoint(`/${bucket}/${encodeURIComponent(key).replace(/%2F/g, '/')}`);
  const signed = signer.sign({ method: 'HEAD', url });

  const res = await fetch(signed.url, { method: 'HEAD', headers: signed.headers });
  if (!res.ok) {
    throw new Error(`HeadObject failed (${res.status})`);
  }

  return {
    contentType: res.headers.get('content-type') || 'application/octet-stream',
    contentLength: parseInt(res.headers.get('content-length') || '0', 10),
  };
}
