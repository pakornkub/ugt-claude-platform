// kit: ugt-nextjs-platform 4.48.0 · ugt-nextjs-upload-setup/messages/upload.en.ts
// kit-hash: 500bc0a768ac
// English catalog for ugt-nextjs-upload-setup. Keys must match upload.th.ts
// exactly — scripts/check-i18n.mjs fails the build when they drift.
export const uploadEn = {
  errors: {
    UNAUTHORIZED: 'Please sign in first.',
    FORBIDDEN_UPLOAD: "You don't have permission to upload files.",
    FORBIDDEN_DOWNLOAD: "You don't have permission to download files.",
    BAD_REQUEST: 'Missing required information.',
    FILE_TOO_LARGE: 'File exceeds {max} MB.',
    FILE_INFECTED: 'This file was flagged as infected and was not uploaded.',
    SCANNER_UNAVAILABLE: 'The virus scanner is unavailable. Please try again later.',
    NOT_FOUND: 'File not found.',
    FILE_NOT_AVAILABLE: 'This file is not available.',
    UPLOAD_FAILED: 'Upload failed.',
  },
  fileUpload: {
    uploading: 'Uploading…',
    attachButton: 'Attach file',
    removeLabel: 'Remove attachment',
    uploadedSuccess: 'File uploaded.',
  },
} as const;
