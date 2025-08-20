// Simple toast notification system

const TOAST_CONTAINER_ID = 'toast-container';

function ensureToastContainer() {
  let container = document.getElementById(TOAST_CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = TOAST_CONTAINER_ID;
    document.body.appendChild(container);
  }
  return container;
}

export function showToast(message, type = 'info', options = {}) {
  const container = ensureToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  const duration = options.duration ?? 3500;
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, duration);

  return toast;
}

export function showSuccess(message, options) { return showToast(message, 'success', options); }
export function showError(message, options) { return showToast(message, 'error', options); }
export function showWarning(message, options) { return showToast(message, 'warning', options); }
export function showInfo(message, options) { return showToast(message, 'info', options); }

