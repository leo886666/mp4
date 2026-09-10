export const THEME_KEY = "vesper:theme";

/**
 * Runs before first paint in <head> so the correct theme is applied
 * without a flash. Kept in a non-"use client" module: importing a plain
 * function from a client component file into a server component yields a
 * client reference proxy, which throws at prerender time.
 */
export function themeBootstrapScript(): string {
  return `
(function(){
  try {
    var t = localStorage.getItem('${THEME_KEY}');
    if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    if (t === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();`.trim();
}
