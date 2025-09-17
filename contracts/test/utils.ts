/**
 * Utility functions for tests
 */

/**
 * Case-insensitive string comparison
 * @param str1 First string
 * @param str2 Second string
 * @returns True if strings are equal (case-insensitive)
 */
export function equalsIgnoreCase(str1: string, str2: string): boolean {
  return str1.toLowerCase() === str2.toLowerCase();
}

/**
 * Sleep function for async delays
 * @param ms Milliseconds to sleep
 * @returns Promise that resolves after the delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
