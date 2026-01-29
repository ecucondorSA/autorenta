/**
 * P0-014: File Upload Validation Utility
 *
 * Centralized file validation to prevent:
 * - Malicious file types (.exe, .zip, .bat, etc.)
 * - Oversized files
 * - MIME type spoofing
 */

export interface FileValidationOptions {
  maxSizeBytes?: number;
  allowedTypes?: string[];
  allowedMimeTypes?: string[];
  checkMimeType?: boolean;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  fileName: string;
}

/**
 * Default allowed MIME types for images
 */
export const DEFAULT_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

/**
 * Default allowed MIME types for documents
 */
export const DEFAULT_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];

/**
 * Maximum file size: 10MB (as specified in P0-014)
 */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Blocked file extensions (security risk)
 */
const BLOCKED_EXTENSIONS = [
  '.exe',
  '.bat',
  '.cmd',
  '.com',
  '.pif',
  '.scr',
  '.vbs',
  '.js',
  '.jar',
  '.zip',
  '.rar',
  '.7z',
  '.dmg',
  '.pkg',
  '.deb',
  '.rpm',
  '.sh',
  '.app',
  '.msi',
];

/**
 * Validate a single file for upload
 *
 * @param file - File to validate
 * @param options - Validation options
 * @returns Validation result with error message if invalid
 */
export function validateFile(
  file: File,
  options: FileValidationOptions = {},
): FileValidationResult {
  const {
    maxSizeBytes = MAX_FILE_SIZE_BYTES,
    allowedMimeTypes = DEFAULT_IMAGE_MIME_TYPES,
    checkMimeType = true,
  } = options;

  // Check for blocked extensions
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (BLOCKED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `File type ${extension} is not allowed for security reasons`,
      fileName: file.name,
    };
  }

  // Check file size
  if (file.size > maxSizeBytes) {
    const maxSizeMB = (maxSizeBytes / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size exceeds maximum of ${maxSizeMB}MB`,
      fileName: file.name,
    };
  }

  // Check MIME type (prevents spoofing)
  if (checkMimeType) {
    if (!allowedMimeTypes.includes(file.type)) {
      const allowedFormats = allowedMimeTypes
        .map((type) => type.split('/')[1].toUpperCase())
        .join(', ');
      return {
        valid: false,
        error: `Invalid file type. Only ${allowedFormats} are allowed`,
        fileName: file.name,
      };
    }
  }

  // Verify file has content
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty',
      fileName: file.name,
    };
  }

  return {
    valid: true,
    fileName: file.name,
  };
}

/**
 * Validate multiple files for upload
 *
 * @param files - Files to validate
 * @param options - Validation options
 * @returns Array of validation results
 */
export function validateFiles(
  files: File[] | FileList,
  options: FileValidationOptions = {},
): FileValidationResult[] {
  const fileArray = Array.from(files);
  return fileArray.map((file) => validateFile(file, options));
}

/**
 * Check if all files are valid
 *
 * @param results - Validation results
 * @returns True if all files are valid
 */
export function allFilesValid(results: FileValidationResult[]): boolean {
  return results.every((result) => result.valid);
}

/**
 * Get first error message from validation results
 *
 * @param results - Validation results
 * @returns First error message or null if all valid
 */
export function getFirstError(results: FileValidationResult[]): string | null {
  const firstError = results.find((result) => !result.valid);
  return firstError?.error || null;
}

/**
 * Log file upload attempt (for audit trail as per P0-014)
 *
 * @param fileName - Name of file
 * @param success - Whether upload was successful
 * @param error - Error message if failed
 */
export function logFileUpload(fileName: string, success: boolean, error?: string): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    fileName,
    success,
    error: error || null,
  };

  // Log to console (in production, this would go to a logging service)
  if (success) {
    console.info('[FileUpload] Success:', logEntry);
  } else {
    console.warn('[FileUpload] Failed:', logEntry);
  }

  // Store in sessionStorage for audit trail
  try {
    const existingLogs = sessionStorage.getItem('file_upload_log');
    const logs = existingLogs ? JSON.parse(existingLogs) : [];
    logs.push(logEntry);

    // Keep only last 50 entries
    if (logs.length > 50) {
      logs.shift();
    }

    sessionStorage.setItem('file_upload_log', JSON.stringify(logs));
  } catch {
    // Silently fail if sessionStorage is not available
  }
}
