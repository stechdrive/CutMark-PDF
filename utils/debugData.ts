const REDACTED = '[redacted]';

const FILE_EXTENSION_PATTERN = /(\.[A-Za-z0-9]{1,12})$/;
const WINDOWS_PATH_PATTERN = /[A-Za-z]:[\\/](?:[^\\/\s"'<>|:]+[\\/])*[^\\/\s"'<>|:]*(?::\d+(?::\d+)?)?/g;
const UNIX_HOME_PATH_PATTERN = /\/(?:Users|home)\/[^/\s"'<>]+(?:\/[^/\s"'<>]+)*/g;

export const redactSensitiveText = (value: string) =>
  value
    .replace(WINDOWS_PATH_PATTERN, REDACTED)
    .replace(UNIX_HOME_PATH_PATTERN, REDACTED);

export const redactFileName = (name: string) => {
  const extension = name.match(FILE_EXTENSION_PATTERN)?.[1] ?? '';
  return `${REDACTED}${extension}`;
};

export const toFileInfo = (file: File | null) => {
  if (!file) return null;
  const extension = file.name.match(FILE_EXTENSION_PATTERN)?.[1] ?? '';
  return {
    name: redactFileName(file.name),
    extension,
    size: file.size,
    type: file.type,
    lastModified: new Date(file.lastModified).toISOString(),
  };
};

export const normalizeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: redactSensitiveText(error.message),
      stack: error.stack ? redactSensitiveText(error.stack) : undefined,
    };
  }
  if (typeof error === 'string') {
    return redactSensitiveText(error);
  }
  return error;
};

export const safeJsonStringify = (value: unknown) => {
  const seen = new WeakSet();
  return JSON.stringify(
    value,
    (key, val) => {
      if (val instanceof Error) {
        return normalizeError(val);
      }
      if (val instanceof File) {
        return toFileInfo(val);
      }
      if (typeof val === 'string') {
        return redactSensitiveText(val);
      }
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val)) return '[Circular]';
        seen.add(val);
      }
      return val;
    },
    2
  );
};
