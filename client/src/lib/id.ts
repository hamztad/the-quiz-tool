export function generateId(prefix = ''): string {
  const id = crypto.randomUUID().slice(0, 12);
  return prefix ? `${prefix}_${id}` : id;
}
