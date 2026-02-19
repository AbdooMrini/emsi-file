/**
 * AWS Signature Version 4 signing for S3-compatible APIs (Cloudflare R2).
 * Uses crypto-js for HMAC-SHA256 (pure JS, works in React Native).
 */
import CryptoJS from 'crypto-js';

interface SignerConfig {
  accessKey: string;
  secretKey: string;
  region: string;
  service?: string;
}

interface SignedRequest {
  url: string;
  headers: Record<string, string>;
}

interface SignParams {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
}

function sha256(data: string): string {
  return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
}

function hmacSHA256(key: CryptoJS.lib.WordArray | string, data: string): CryptoJS.lib.WordArray {
  return CryptoJS.HmacSHA256(data, key);
}

function hmacSHA256Hex(key: CryptoJS.lib.WordArray | string, data: string): string {
  return hmacSHA256(key, data).toString(CryptoJS.enc.Hex);
}

function getDateStamp(): string {
  return new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function getDateOnly(amzDate: string): string {
  return amzDate.substring(0, 8);
}

function uriEncode(str: string, encodeSlash = true): string {
  let encoded = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (
      (ch >= 'A' && ch <= 'Z') ||
      (ch >= 'a' && ch <= 'z') ||
      (ch >= '0' && ch <= '9') ||
      ch === '_' || ch === '-' || ch === '~' || ch === '.'
    ) {
      encoded += ch;
    } else if (ch === '/' && !encodeSlash) {
      encoded += ch;
    } else {
      const hex = ch.charCodeAt(0).toString(16).toUpperCase();
      encoded += '%' + (hex.length === 1 ? '0' : '') + hex;
    }
  }
  return encoded;
}

export class AwsSigner {
  private accessKey: string;
  private secretKey: string;
  private region: string;
  private service: string;

  constructor(config: SignerConfig) {
    this.accessKey = config.accessKey;
    this.secretKey = config.secretKey;
    this.region = config.region;
    this.service = config.service || 's3';
  }

  sign(params: SignParams): SignedRequest {
    const { method, url: rawUrl, body = '' } = params;

    const parsedUrl = new URL(rawUrl);
    const host = parsedUrl.host;
    const path = parsedUrl.pathname || '/';
    const queryString = parsedUrl.search ? parsedUrl.search.substring(1) : '';

    const amzDate = getDateStamp();
    const dateOnly = getDateOnly(amzDate);

    const payloadHash = sha256(body);

    // Build headers
    const headers: Record<string, string> = {
      host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      ...(params.headers || {}),
    };

    // Canonical headers (sorted, lowercase)
    const sortedHeaders = Object.keys(headers)
      .map((k) => k.toLowerCase())
      .sort();

    const canonicalHeaders = sortedHeaders
      .map((k) => `${k}:${headers[Object.keys(headers).find((h) => h.toLowerCase() === k)!]?.trim()}`)
      .join('\n') + '\n';

    const signedHeaders = sortedHeaders.join(';');

    // Canonical query string
    const canonicalQueryString = queryString
      .split('&')
      .filter(Boolean)
      .map((p) => {
        const [k, v = ''] = p.split('=');
        return `${uriEncode(decodeURIComponent(k))}=${uriEncode(decodeURIComponent(v))}`;
      })
      .sort()
      .join('&');

    // Canonical request
    const canonicalRequest = [
      method.toUpperCase(),
      uriEncode(path, false),
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    // Scope
    const scope = `${dateOnly}/${this.region}/${this.service}/aws4_request`;

    // String to sign
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      scope,
      sha256(canonicalRequest),
    ].join('\n');

    // Signing key
    const kDate = hmacSHA256('AWS4' + this.secretKey, dateOnly);
    const kRegion = hmacSHA256(kDate, this.region);
    const kService = hmacSHA256(kRegion, this.service);
    const kSigning = hmacSHA256(kService, 'aws4_request');

    // Signature
    const signature = hmacSHA256Hex(kSigning, stringToSign);

    // Authorization header
    const authorization = `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return {
      url: rawUrl,
      headers: {
        ...headers,
        Authorization: authorization,
      },
    };
  }

  /**
   * Generate a pre-signed URL for GET requests.
   */
  presign(rawUrl: string, expiresIn = 3600): string {
    const parsedUrl = new URL(rawUrl);
    const host = parsedUrl.host;
    const path = parsedUrl.pathname || '/';

    const amzDate = getDateStamp();
    const dateOnly = getDateOnly(amzDate);
    const scope = `${dateOnly}/${this.region}/${this.service}/aws4_request`;

    const existingQuery = parsedUrl.search ? parsedUrl.search.substring(1) : '';

    // Build query params for pre-signing
    const presignParams: Record<string, string> = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${this.accessKey}/${scope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': String(expiresIn),
      'X-Amz-SignedHeaders': 'host',
    };

    // Merge existing query params
    if (existingQuery) {
      existingQuery.split('&').forEach((p) => {
        const [k, v = ''] = p.split('=');
        presignParams[decodeURIComponent(k)] = decodeURIComponent(v);
      });
    }

    const canonicalQueryString = Object.keys(presignParams)
      .sort()
      .map((k) => `${uriEncode(k)}=${uriEncode(presignParams[k])}`)
      .join('&');

    const canonicalHeaders = `host:${host}\n`;
    const signedHeaders = 'host';

    const canonicalRequest = [
      'GET',
      uriEncode(path, false),
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      'UNSIGNED-PAYLOAD',
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      scope,
      sha256(canonicalRequest),
    ].join('\n');

    const kDate = hmacSHA256('AWS4' + this.secretKey, dateOnly);
    const kRegion = hmacSHA256(kDate, this.region);
    const kService = hmacSHA256(kRegion, this.service);
    const kSigning = hmacSHA256(kService, 'aws4_request');

    const signature = hmacSHA256Hex(kSigning, stringToSign);

    return `${parsedUrl.protocol}//${host}${path}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
  }
}
