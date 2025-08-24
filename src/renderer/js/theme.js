/**
 * Theme management module for the Curator's Vault application.
 * Handles light/dark theme switching and persistence.
 */

let currentTheme = 'light';

/**
 * Initialize theme functionality
 */
export function initializeTheme() {
  // Check for saved theme preference or respect OS preference
  const savedTheme = localStorage.getItem('theme');
  const osPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme) {
    currentTheme = savedTheme;
  } else if (osPrefersDark) {
    currentTheme = 'dark';
  }
  
  // Apply the theme
  applyTheme(currentTheme);
  
  // Add event listener for theme toggle button
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleTheme);
  }
  
  // Listen for OS theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // Only update if user hasn't explicitly set a theme
    if (!localStorage.getItem('theme')) {
      currentTheme = e.matches ? 'dark' : 'light';
      applyTheme(currentTheme);
    }
  });
}

/**
 * Toggle between light and dark themes
 */
export function toggleTheme() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme(currentTheme);
  localStorage.setItem('theme', currentTheme);
}

/**
 * Apply the specified theme
 * @param {string} theme - 'light' or 'dark'
 */
export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  currentTheme = theme;
  
  // Update theme toggle button text/emoji
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  if (themeToggleBtn) {
    themeToggleBtn.textContent = theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode';
  }
  
  // Dispatch custom event for components that need to react to theme changes
  window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme } }));
}

/**
 * Get the current theme
 * @returns {string} - 'light' or 'dark'
 */
export function getCurrentTheme() {
  return currentTheme;
}