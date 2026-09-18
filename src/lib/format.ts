export function formatFileSize(bytes?: number): string | null {
  if (bytes == null) return null;
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

// "maxim@mail.ru" -> "max***@mail.ru": до 3 первых символов имени и домен целиком (свой адрес
// узнать легко, опечатку в домене видно, адрес целиком на экране не светится). Открыто
// "длина - 2" символов, но не меньше 1 и не больше 3 — у коротких имён скрыто минимум 2 символа,
// маска не превращается в раскрытие.
const MASK_MAX_VISIBLE = 3;
const MASK_MIN_HIDDEN = 2;

export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) return email;

  const local = email.slice(0, at);
  const domain = email.slice(at);
  const visible = Math.min(MASK_MAX_VISIBLE, Math.max(1, local.length - MASK_MIN_HIDDEN));
  return local.length > 1 ? `${local.slice(0, visible)}***${domain}` : `***${domain}`;
}
