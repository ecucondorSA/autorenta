/**
 * TEST FILE: Issues for Sentry AI Code Review detection
 * This file contains intentional issues to test Sentry's AI analysis
 */

// Issue 1: Potential null reference without check
export function getUserName(user: { name?: string } | null): string {
  return user.name.toUpperCase(); // BUG: user could be null, name could be undefined
}

// Issue 2: SQL Injection vulnerability
export function buildQuery(userId: string): string {
  return `SELECT * FROM users WHERE id = '${userId}'`; // SECURITY: SQL injection
}

// Issue 3: Hardcoded credentials
export const API_CONFIG = {
  apiKey: 'sk-1234567890abcdef', // SECURITY: Hardcoded API key
  secret: 'my-super-secret-password', // SECURITY: Hardcoded password
};

// Issue 4: Console.log in production code
export function processData(data: unknown[]): void {
  console.log('Processing data:', data); // BUG: console.log in production
  console.log('Secret key:', API_CONFIG.apiKey); // SECURITY: Logging sensitive data
}

// Issue 5: Unsafe type assertion
export function parseResponse(response: unknown): { id: number } {
  return response as { id: number }; // BUG: Unsafe assertion without validation
}

// Issue 6: Missing error handling
export async function fetchData(url: string): Promise<unknown> {
  const response = await fetch(url); // BUG: No error handling
  return response.json();
}

// Issue 7: Race condition potential
let counter = 0;
export async function incrementCounter(): Promise<number> {
  const current = counter;
  await new Promise((resolve) => setTimeout(resolve, 100));
  counter = current + 1; // BUG: Race condition
  return counter;
}

// Issue 8: Memory leak - event listener not cleaned up
export function setupListener(element: HTMLElement): void {
  element.addEventListener('click', () => {
    // This listener is never removed - potential memory leak
    console.log('clicked');
  });
}

// Issue 9: Infinite loop risk
export function findItem(items: string[], target: string): number {
  let i = 0;
  while (items[i] !== target) {
    i++; // BUG: No bounds check, infinite loop if target not found
  }
  return i;
}

// Issue 10: XSS vulnerability
export function renderHTML(userInput: string): string {
  return `<div>${userInput}</div>`; // SECURITY: XSS vulnerability
}
