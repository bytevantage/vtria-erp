// Path utilities for handling both root and /vtria-erp/ deployments

// Detect if we're running under /vtria-erp/ path
export const getBasePath = () => {
  return window.location.pathname.startsWith('/vtria-erp') ? '/vtria-erp' : '';
};

// Get full path with base path
export const getPath = (path) => {
  const basePath = getBasePath();
  // Remove leading slash to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${basePath}/${cleanPath}`;
};

// Navigate with base path awareness
export const navigateWithBase = (navigate, path) => {
  navigate(getPath(path));
};

// Window location redirect with base path
export const redirectWithBase = (path) => {
  window.location.href = getPath(path);
};

// Export basePath for use in components
export const basePath = getBasePath();
