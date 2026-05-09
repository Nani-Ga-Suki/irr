export function capitalizeWords(value: string): string {
  return value.replace(/(^|[\s([{/"'`-])([a-z\u00C0-\u00FF])/gi, (_match, prefix: string, letter: string) => {
    return `${prefix}${letter.toLocaleUpperCase()}`;
  });
}
