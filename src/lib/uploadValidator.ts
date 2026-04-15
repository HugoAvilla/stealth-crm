/**
 * Centralized upload validation module.
 * Validates MIME type, extension, file size, filename, and file count.
 *
 * @module uploadValidator
 * @covers SEC-09, SEC-10, SEC-11, SEC-12, SEC-13, SEC-14
 */

export interface UploadContext {
  type: 'logo' | 'checklist-photo';
  maxFiles?: number;
  currentFiles?: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/** Accepted MIME types by context */
const ALLOWED_MIME: Record<UploadContext['type'], string[]> = {
  'logo': ['image/png', 'image/jpeg', 'image/webp'],
  'checklist-photo': ['image/png', 'image/jpeg', 'image/webp', 'image/heic'],
};

/** Accepted extensions by context */
const ALLOWED_EXTENSIONS: Record<UploadContext['type'], string[]> = {
  'logo': ['png', 'jpg', 'jpeg', 'webp'],
  'checklist-photo': ['png', 'jpg', 'jpeg', 'webp', 'heic'],
};

/** Max file sizes in bytes by context */
const MAX_SIZE_BYTES: Record<UploadContext['type'], number> = {
  'logo': 2 * 1024 * 1024,       // 2 MB
  'checklist-photo': 5 * 1024 * 1024, // 5 MB
};

/** Human-readable size labels */
const SIZE_LABELS: Record<UploadContext['type'], string> = {
  'logo': '2 MB',
  'checklist-photo': '5 MB',
};

/** Default max files for checklist */
const DEFAULT_MAX_FILES = 20;

/**
 * Extract file extension from filename (lowercase, no dot).
 */
function getExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length < 2) return '';
  return parts[parts.length - 1].toLowerCase();
}

/**
 * Check if MIME type and extension are consistent.
 */
function mimeMatchesExtension(mime: string, extension: string): boolean {
  const mimeToExtensions: Record<string, string[]> = {
    'image/png': ['png'],
    'image/jpeg': ['jpg', 'jpeg'],
    'image/webp': ['webp'],
    'image/heic': ['heic'],
  };
  const validExtensions = mimeToExtensions[mime];
  if (!validExtensions) return false;
  return validExtensions.includes(extension);
}

/**
 * Validates an upload file against context-specific rules.
 *
 * @param file - The File object to validate
 * @param context - Upload context with type and optional file count info
 * @returns ValidationResult with `valid` boolean and optional `error` message
 */
export function validateUpload(file: File, context: UploadContext): ValidationResult {
  // 1. Check zero bytes
  if (file.size === 0) {
    return { valid: false, error: 'Arquivo vazio. Selecione um arquivo válido.' };
  }

  // 2. Check MIME type
  const allowedMimes = ALLOWED_MIME[context.type];
  if (!allowedMimes.includes(file.type)) {
    const formatsLabel = context.type === 'logo'
      ? 'PNG, JPG ou WebP'
      : 'PNG, JPG, WebP ou HEIC';
    return { valid: false, error: `Formato não aceito. Use ${formatsLabel}.` };
  }

  // 3. Check extension
  const extension = getExtension(file.name);
  const allowedExts = ALLOWED_EXTENSIONS[context.type];
  if (!allowedExts.includes(extension)) {
    return { valid: false, error: 'Extensão do arquivo não é permitida.' };
  }

  // 4. Check MIME/extension match
  if (!mimeMatchesExtension(file.type, extension)) {
    return { valid: false, error: 'Formato do arquivo inválido.' };
  }

  // 5. Check file size
  const maxSize = MAX_SIZE_BYTES[context.type];
  if (file.size > maxSize) {
    return { valid: false, error: `Arquivo muito grande. Máximo: ${SIZE_LABELS[context.type]}.` };
  }

  // 6. Check max file count (checklist only)
  if (context.type === 'checklist-photo') {
    const maxFiles = context.maxFiles ?? DEFAULT_MAX_FILES;
    const currentFiles = context.currentFiles ?? 0;
    if (currentFiles >= maxFiles) {
      return { valid: false, error: `Limite de ${maxFiles} fotos atingido.` };
    }
  }

  return { valid: true };
}

/**
 * Sanitizes a filename by removing path traversal sequences and special characters.
 *
 * @param name - The original filename
 * @returns Sanitized filename safe for storage paths
 */
export function sanitizeFilename(name: string): string {
  // Remove path traversal
  let sanitized = name.replace(/\.\.\//g, '').replace(/\.\.\\/g, '');

  // Remove special characters except alphanumeric, dots, hyphens, underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9._\-]/g, '_');

  // Remove leading dots (hidden files)
  sanitized = sanitized.replace(/^\.+/, '');

  // Ensure not empty
  if (!sanitized || sanitized === '_') {
    sanitized = `file_${Date.now()}`;
  }

  return sanitized;
}
