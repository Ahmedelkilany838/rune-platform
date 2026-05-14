export type CopyResult = {
  ok: boolean;
  message: string;
};

export async function copyToClipboard(value: string) {
  if (!value.trim()) {
    return {
      ok: false,
      message: "Nothing to copy"
    } satisfies CopyResult;
  }

  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return {
      ok: false,
      message: "Clipboard is not available"
    } satisfies CopyResult;
  }

  try {
    await navigator.clipboard.writeText(value);
    return {
      ok: true,
      message: "Copied"
    } satisfies CopyResult;
  } catch {
    return {
      ok: false,
      message: "Copy failed"
    } satisfies CopyResult;
  }
}
