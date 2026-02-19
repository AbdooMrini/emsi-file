// ─── Cloudflare R2 Configuration ─────────────────────────────────────────────
// ⚠️  In production, consider using a secure backend proxy instead of
//     embedding keys directly in the mobile app.
export const R2_CONFIG = {
  accountId: 'b41959b701734cef1281bd772b0414cf',
  accessKey: '7f181454ce9e049bd1d9fa8019d635f0',
  secretKey: '1d66d9c35d81787f1f263220862db8cf84a3da48db6d0801ef87b56d2962c7d0',
  endpoint: 'https://b41959b701734cef1281bd772b0414cf.r2.cloudflarestorage.com',
  region: 'auto',
};

export const APP_NAME = 'Gestion de Cours';
export const APP_SUBTITLE = 'Cloudflare R2';
