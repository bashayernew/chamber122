// File Upload Utility using backend API
import { uploadFile } from './api.js';

// Upload to temp folder (works before login)
export async function uploadTempDoc(file, docType) {
  if (!file) throw new Error('No file chosen');
  
  // For signup process, use local storage fallback
  // Files will be uploaded after user is authenticated
  console.log('Using local storage fallback for signup process');
  
  const localUrl = URL.createObjectURL(file);
  const fallbackKey = `temp_upload_${docType}_${Date.now()}`;
  
  // Store file info in sessionStorage for later processing
  sessionStorage.setItem(fallbackKey, JSON.stringify({
    name: file.name,
    size: file.size,
    type: file.type,
    docType: docType,
    timestamp: Date.now(),
    localUrl: localUrl,
    file: null // Will be recreated from blob
  }));
  
  return { 
    path: `temp/${docType}_${Date.now()}.${file.name.split('.').pop() || 'bin'}`,
    signedUrl: localUrl,
    fallback: true,
    fallbackKey: fallbackKey
  };
}

// Upload files after user is authenticated
export async function uploadFilesAfterSignup() {
  const uploadedFiles = [];
  
  // Get all files from sessionStorage
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && key.startsWith('temp_upload_')) {
      try {
        const fileData = JSON.parse(sessionStorage.getItem(key));
        const file = await fetch(fileData.localUrl).then(r => r.blob()).then(blob => {
          return new File([blob], fileData.name, { type: fileData.type });
        });
        
        // Upload via API
        const uploadResult = await uploadFile(file);
        
        uploadedFiles.push({
          docType: fileData.docType,
          path: uploadResult.public_url,
          name: fileData.name,
          public_url: uploadResult.public_url
        });
        
        // Clean up sessionStorage
        sessionStorage.removeItem(key);
        URL.revokeObjectURL(fileData.localUrl);
      } catch (err) {
        console.error('Error processing file:', err);
      }
    }
  }
  
  return uploadedFiles;
}

class FileUploadManager {
  constructor() {
    this.maxFileSize = 25 * 1024 * 1024; // 25MB
    this.allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp'
    ];
  }

  async uploadFile(file, businessId, documentType) {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.message);
      }

      // Upload via API
      const uploadResult = await uploadFile(file);
      
      return {
        success: true,
        fileName: uploadResult.filename,
        publicUrl: uploadResult.public_url,
        fileSize: uploadResult.size,
        mimeType: uploadResult.type
      };

    } catch (error) {
      console.error('Error uploading file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async uploadMultipleFiles(files, businessId, documentType) {
    const results = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await this.uploadFile(file, businessId, `${documentType}_${i + 1}`);
      results.push(result);
    }

    return results;
  }

  async deleteFile(fileName) {
    // TODO: Implement delete endpoint
    console.warn('[file-upload] Delete not yet implemented');
    return { success: false, error: 'Delete not yet implemented' };
  }

  async getFileUrl(fileName) {
    // Files are public, return direct URL
    return fileName.startsWith('/') ? fileName : `/uploads/${fileName}`;
  }

  async getSignedUrl(fileName, expiresIn = 3600) {
    // Files are public, return direct URL
    return this.getFileUrl(fileName);
  }

  validateFile(file) {
    // Check file size
    if (file.size > this.maxFileSize) {
      return {
        valid: false,
        message: `File size must be less than ${this.formatFileSize(this.maxFileSize)}`
      };
    }

    // Check file type
    if (!this.allowedTypes.includes(file.type)) {
      return {
        valid: false,
        message: `File type not allowed. Allowed types: ${this.allowedTypes.join(', ')}`
      };
    }

    // Check file name
    if (file.name.length > 255) {
      return {
        valid: false,
        message: 'File name must be less than 255 characters'
      };
    }

    return { valid: true };
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Create a file input with drag and drop
  createFileInput(options = {}) {
    const {
      accept = this.allowedTypes.join(','),
      multiple = false,
      maxFiles = 1,
      onSelect = () => {},
      onError = () => {}
    } = options;

    const container = document.createElement('div');
    container.className = 'file-upload-container';
    container.style.cssText = `
      border: 2px dashed rgba(75, 85, 99, 0.5);
      border-radius: 8px;
      padding: 2rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
      background: rgba(17, 24, 39, 0.8);
    `;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    input.style.display = 'none';

    const label = document.createElement('label');
    label.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      cursor: pointer;
    `;

    label.innerHTML = `
      <div style="font-size: 2rem; color: #6b7280;">📄</div>
      <div style="color: #d1d5db; font-weight: 500;">
        Click to select files or drag and drop
        <span style="display: block; color: #9ca3af; font-size: 0.9rem; margin-top: 0.25rem;">
          ${this.formatFileSize(this.maxFileSize)} max per file
        </span>
      </div>
    `;

    // Handle file selection
    input.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      
      if (files.length > maxFiles) {
        onError(`Maximum ${maxFiles} files allowed`);
        return;
      }

      // Validate each file
      for (const file of files) {
        const validation = this.validateFile(file);
        if (!validation.valid) {
          onError(validation.message);
          return;
        }
      }

      onSelect(files);
    });

    // Handle drag and drop
    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      container.style.borderColor = '#3b82f6';
      container.style.backgroundColor = 'rgba(59, 130, 246, 0.05)';
    });

    container.addEventListener('dragleave', (e) => {
      e.preventDefault();
      container.style.borderColor = 'rgba(75, 85, 99, 0.5)';
      container.style.backgroundColor = 'rgba(17, 24, 39, 0.8)';
    });

    container.addEventListener('drop', (e) => {
      e.preventDefault();
      container.style.borderColor = 'rgba(75, 85, 99, 0.5)';
      container.style.backgroundColor = 'rgba(17, 24, 39, 0.8)';

      const files = Array.from(e.dataTransfer.files);
      
      if (files.length > maxFiles) {
        onError(`Maximum ${maxFiles} files allowed`);
        return;
      }

      // Validate each file
      for (const file of files) {
        const validation = this.validateFile(file);
        if (!validation.valid) {
          onError(validation.message);
          return;
        }
      }

      onSelect(files);
    });

    // Click to open file dialog
    container.addEventListener('click', () => {
      input.click();
    });

    container.appendChild(input);
    container.appendChild(label);

    return container;
  }

  // Create a file preview component
  createFilePreview(file, onRemove) {
    const preview = document.createElement('div');
    preview.className = 'file-preview';
    preview.style.cssText = `
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 8px;
      margin-top: 1rem;
    `;

    preview.innerHTML = `
      <div style="font-size: 1.5rem;">📄</div>
      <div style="flex: 1; min-width: 0;">
        <div style="color: white; font-weight: 500; margin-bottom: 0.25rem;">
          ${file.name}
        </div>
        <div style="color: #9ca3af; font-size: 0.9rem;">
          ${this.formatFileSize(file.size)}
        </div>
      </div>
      <button type="button" class="remove-file" style="
        background: #ef4444;
        color: white;
        border: none;
        padding: 0.25rem 0.75rem;
        border-radius: 4px;
        font-size: 0.8rem;
        cursor: pointer;
        transition: background 0.3s ease;
      ">
        Remove | إزالة
      </button>
    `;

    preview.querySelector('.remove-file').addEventListener('click', onRemove);

    return preview;
  }

  // Show upload progress
  showUploadProgress(container, progress) {
    const progressBar = container.querySelector('.upload-progress') || this.createProgressBar(container);
    const progressFill = progressBar.querySelector('.progress-fill');
    const progressText = progressBar.querySelector('.progress-text');

    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }

    if (progressText) {
      progressText.textContent = `${Math.round(progress)}%`;
    }
  }

  createProgressBar(container) {
    const progressBar = document.createElement('div');
    progressBar.className = 'upload-progress';
    progressBar.style.cssText = `
      width: 100%;
      height: 8px;
      background: rgba(75, 85, 99, 0.3);
      border-radius: 4px;
      overflow: hidden;
      margin-top: 1rem;
    `;

    progressBar.innerHTML = `
      <div class="progress-fill" style="
        height: 100%;
        background: linear-gradient(90deg, #3b82f6, #1d4ed8);
        width: 0%;
        transition: width 0.3s ease;
      "></div>
      <div class="progress-text" style="
        text-align: center;
        color: #9ca3af;
        font-size: 0.8rem;
        margin-top: 0.5rem;
      ">0%</div>
    `;

    container.appendChild(progressBar);
    return progressBar;
  }
}

// Initialize file upload manager
let fileUploadManager = null;

document.addEventListener('DOMContentLoaded', () => {
  fileUploadManager = new FileUploadManager();
  // Update the global reference after initialization
  window.fileUploadManager = fileUploadManager;
});

// Export for global access
window.FileUploadManager = FileUploadManager;
window.fileUploadManager = fileUploadManager;
