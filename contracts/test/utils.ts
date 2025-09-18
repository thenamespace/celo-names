export function equalsIgnoreCase(str1: string, str2: string): boolean {
  return str1.toLowerCase() === str2.toLowerCase();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
