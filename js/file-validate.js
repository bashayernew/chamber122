export function validateBusinessFile(file) {
  if (!file) return 'Choose a file';
  if (file.size > 25 * 1024 * 1024) return 'Max 25MB';
  const ok = ['image/png','image/jpeg','application/pdf'];
  if (!ok.includes(file.type)) return 'Only JPG, PNG, PDF allowed';
  return null;
}

