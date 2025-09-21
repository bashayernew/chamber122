// public/js/nav.js - Centralized navigation helper
export function go(path) {
  const url = new URL(path, location.origin);
  location.href = url.href;
}

export function goWithParams(path, params = {}) {
  const url = new URL(path, location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      url.searchParams.set(key, value);
    }
  });
  location.href = url.href;
}
