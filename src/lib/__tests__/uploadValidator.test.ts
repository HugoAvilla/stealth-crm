import { describe, it, expect } from 'vitest';
import { validateUpload, sanitizeFilename } from '../uploadValidator';

// Helper to create a mock File
function mockFile(name: string, size: number, type: string): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

describe('validateUpload', () => {
  // --- Logo tests ---
  it('accepts a valid PNG logo within size limit', () => {
    const file = mockFile('logo.png', 500_000, 'image/png');
    const result = validateUpload(file, { type: 'logo' });
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rejects a logo exceeding 2 MB', () => {
    const file = mockFile('big-logo.png', 3 * 1024 * 1024, 'image/png');
    const result = validateUpload(file, { type: 'logo' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('2 MB');
  });

  it('rejects invalid MIME type for logo', () => {
    const file = mockFile('malware.exe', 1000, 'application/x-executable');
    const result = validateUpload(file, { type: 'logo' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Formato não aceito');
  });

  it('rejects a zero-byte logo file', () => {
    const file = mockFile('empty.png', 0, 'image/png');
    const result = validateUpload(file, { type: 'logo' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('vazio');
  });

  it('rejects MIME/extension mismatch for logo (exe renamed to png)', () => {
    // MIME says jpeg but extension is png
    const file = mockFile('fake.png', 1000, 'image/jpeg');
    const result = validateUpload(file, { type: 'logo' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('inválido');
  });

  it('accepts a valid JPEG logo', () => {
    const file = mockFile('photo.jpg', 100_000, 'image/jpeg');
    const result = validateUpload(file, { type: 'logo' });
    expect(result.valid).toBe(true);
  });

  it('accepts a valid WebP logo', () => {
    const file = mockFile('design.webp', 200_000, 'image/webp');
    const result = validateUpload(file, { type: 'logo' });
    expect(result.valid).toBe(true);
  });

  // --- Checklist photo tests ---
  it('accepts a valid checklist photo within size limit', () => {
    const file = mockFile('car-photo.jpg', 2_000_000, 'image/jpeg');
    const result = validateUpload(file, { type: 'checklist-photo' });
    expect(result.valid).toBe(true);
  });

  it('rejects a checklist photo exceeding 5 MB', () => {
    const file = mockFile('huge.jpg', 6 * 1024 * 1024, 'image/jpeg');
    const result = validateUpload(file, { type: 'checklist-photo' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('5 MB');
  });

  it('rejects a checklist when max photos reached (20)', () => {
    const file = mockFile('car.jpg', 1000, 'image/jpeg');
    const result = validateUpload(file, {
      type: 'checklist-photo',
      maxFiles: 20,
      currentFiles: 20,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Limite');
  });

  it('accepts a HEIC checklist photo', () => {
    const file = mockFile('iphone-photo.heic', 3_000_000, 'image/heic');
    const result = validateUpload(file, { type: 'checklist-photo' });
    expect(result.valid).toBe(true);
  });

  it('rejects HEIC for logo context', () => {
    const file = mockFile('iphone.heic', 1_000_000, 'image/heic');
    const result = validateUpload(file, { type: 'logo' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Formato não aceito');
  });

  it('rejects a file with invalid extension', () => {
    const file = mockFile('script.svg', 1000, 'image/png');
    const result = validateUpload(file, { type: 'logo' });
    expect(result.valid).toBe(false);
  });
});

describe('sanitizeFilename', () => {
  it('removes path traversal sequences', () => {
    expect(sanitizeFilename('../../../etc/passwd')).not.toContain('..');
  });

  it('removes special characters', () => {
    const result = sanitizeFilename('file (1) [copy] <test>.png');
    expect(result).not.toContain('(');
    expect(result).not.toContain('[');
    expect(result).not.toContain('<');
    expect(result).toContain('.png');
  });

  it('preserves valid filenames', () => {
    expect(sanitizeFilename('photo-2024.jpg')).toBe('photo-2024.jpg');
  });

  it('handles empty result after sanitization', () => {
    const result = sanitizeFilename('...');
    expect(result.length).toBeGreaterThan(0);
  });
});
