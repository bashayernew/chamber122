// Global error handler for debugging
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  console.error('Error details:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Module import error handler
window.addEventListener('error', (event) => {
  if (event.filename && event.filename.includes('.js')) {
    console.error('JavaScript file error:', event.filename, event.message);
  }
});
