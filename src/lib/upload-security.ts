/**
 * Upload security utilities.
 * Validates file types, sizes, and sanitizes filenames before upload.
 */

// ── Allowed types per upload context ──────────────────────────────────────────

export const UPLOAD_CONFIGS = {
  avatar: {
    accept: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    maxSize: 5 * 1024 * 1024, // 5MB
    label: "Image",
  },
  image: {
    accept: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"],
    maxSize: 10 * 1024 * 1024, // 10MB
    label: "Image",
  },
  video: {
    accept: ["video/mp4", "video/webm", "video/ogg", "video/quicktime"],
    maxSize: 200 * 1024 * 1024, // 200MB
    label: "Video",
  },
  pdf: {
    accept: ["application/pdf"],
    maxSize: 25 * 1024 * 1024, // 25MB
    label: "PDF",
  },
  document: {
    accept: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    maxSize: 25 * 1024 * 1024,
    label: "Document",
  },
  chatFile: {
    accept: [
      "image/jpeg", "image/png", "image/webp", "image/gif",
      "video/mp4", "video/webm",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/zip",
    ],
    maxSize: 25 * 1024 * 1024,
    label: "File",
  },
  examFile: {
    accept: [
      "image/jpeg", "image/png", "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    maxSize: 25 * 1024 * 1024,
    label: "File",
  },
  adminAny: {
    accept: [], // empty = no restriction (admin only)
    maxSize: 500 * 1024 * 1024, // 500MB
    label: "File",
  },
} as const;

export type UploadContext = keyof typeof UPLOAD_CONFIGS;

// ── Validation ───────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a file against an upload context config.
 * Admin users bypass type restrictions but still have size limits.
 */
export function validateFile(
  file: File,
  context: UploadContext,
  isAdmin: boolean = false,
): ValidationResult {
  const config = UPLOAD_CONFIGS[context];

  // Admin can upload anything (but still check size)
  if (!isAdmin && config.accept.length > 0) {
    if (!config.accept.includes(file.type)) {
      const exts = config.accept
        .map((t) => t.split("/").pop())
        .join(", ");
      return {
        valid: false,
        error: `Invalid file type. Allowed: ${exts}`,
      };
    }
  }

  if (file.size > config.maxSize) {
    const mb = Math.round(config.maxSize / (1024 * 1024));
    return {
      valid: false,
      error: `File too large. Maximum: ${mb}MB`,
    };
  }

  return { valid: true };
}

/**
 * Sanitize a filename: strip special chars, limit length.
 * Returns a safe name like "my_file-2024.jpg"
 */
export function sanitizeFilename(name: string): string {
  // Get extension
  const parts = name.split(".");
  const ext = parts.length > 1 ? `.${parts.pop()!.toLowerCase().slice(0, 10)}` : "";

  // Sanitize the name part
  const base = parts
    .join(".")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^[._-]+/, "")
    .slice(0, 80);

  return `${base || "file"}${ext}`;
}

/**
 * Generate a safe storage path: context/timestamp-random.ext
 */
export function safeStoragePath(
  context: string,
  filename: string,
  userId?: string,
): string {
  const safe = sanitizeFilename(filename);
  const rand = Math.random().toString(36).slice(2, 8);
  const ts = Date.now();
  const prefix = userId ? `${context}/${userId}` : context;
  return `${prefix}/${ts}-${rand}.${safe.split(".").pop() || "bin"}`;
}

/**
 * Get the file extension from a filename (lowercase, no dot).
 */
export function getExt(filename: string): string {
  const parts = filename.split(".");
  return (parts.pop() || "bin").toLowerCase().slice(0, 10);
}
