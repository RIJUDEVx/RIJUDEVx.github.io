// One small toast for everything that gets copied, whether by a button or by
// selecting text. The line depends on what was copied.

export function toast(text: string) {
  document.querySelector('.toast')?.remove();
  const t = document.createElement('div');
  t.className = 'toast mono';
  t.setAttribute('role', 'status');
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('out'), 2000);
  setTimeout(() => t.remove(), 2400);
}

/** What to say about a piece of copied text. */
export function copiedLine(raw: string): string {
  const s = raw.trim();
  const words = s.split(/\s+/).filter(Boolean).length;
  if (/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(s)) return 'email copied. say hi :)';
  if (/^https?:\/\//.test(s)) return 'link copied. send it to someone nice.';
  if (/^[0-9a-f]{7}$/.test(s)) return 'hash copied. it is decorative, but sure.';
  if (/^(\$|GET |POST |PATCH |git |agent\.)/.test(s)) return 'command copied. run it at your own risk.';
  if (words <= 3 && /\d/.test(s) && s.length <= 16) return `"${s}" copied. it is a real number.`;
  if (words > 40) return `${words} words copied. quote me on that :)`;
  if (words > 6) return `${words} words copied. cite your sources.`;
  return `"${s.length > 28 ? s.slice(0, 27) + '…' : s}" copied.`;
}
