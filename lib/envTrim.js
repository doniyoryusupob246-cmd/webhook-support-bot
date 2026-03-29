/** Убирает кавычки, если их скопировали вместе со значением в Vercel / .env */
export function trimEnvValue(value) {
  if (value == null || value === '') return undefined;
  let s = String(value).trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}
