document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const fileListBody = document.getElementById('file-list-body');
    const currentPathInput = document.getElementById('current-path');
    const parentDirButton = document.getElementById('parent-dir');
    const homeDirButton = document.getElementById('home-dir');
    const refreshButton = document.getElementById('refresh');
    const filePreview = document.getElementById('file-preview');
    const filePreviewContent = document.getElementById('file-preview-content');
    const loadingOverlay = document.getElementById('loading-overlay');
    
    // Current state
    let currentPath = '/';
    
    // Initialize the app
    init();
    
    function init() {
        // Initial data load
        loadDirectoryContents(currentPath);
        
        // Event listeners
        parentDirButton.addEventListener('click', navigateToParentDirectory);
        homeDirButton.addEventListener('click', navigateToHomeDirectory);
        refreshButton.addEventListener('click', refreshCurrentDirectory);
    }
    
    async function loadDirectoryContents(path) {
        showLoading();
        try {
            const response = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
            if (!response.ok) {
                throw new Error(`Failed to load directory: ${response.statusText}`);
            }
            
            const data = await response.json();
            currentPath = data.currentPath;
            currentPathInput.value = currentPath;
            
            renderFileList(data.files);
        } catch (error) {
            console.error('Error loading directory contents:', error);
            showError(`Failed to load directory: ${error.message}`);
        } finally {
            hideLoading();
        }
    }
    
    function renderFileList(files) {
        // Clear the current list
        fileListBody.innerHTML = '';
        
        // Sort files (directories first, then by name)
        files.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });
        
        // Create table rows for each file
        files.forEach(file => {
            const row = document.createElement('tr');
            
            // Determine icon based on file type
            let iconClass = 'fa-file other-icon';
            if (file.isDirectory) {
                iconClass = 'fa-folder folder-icon';
            } else if (file.type && file.type.startsWith('image/')) {
                iconClass = 'fa-file-image image-icon';
            } else if (file.type && (
                file.type.includes('text/') || 
                file.type.includes('application/pdf') ||
                file.type.includes('document')
            )) {
                iconClass = 'fa-file-alt document-icon';
            }
            
            // Format file size
            const fileSize = file.isDirectory ? '-' : formatFileSize(file.size);
            
            // Format modification date
            const modDate = new Date(file.mtime).toLocaleString();
            
            row.innerHTML = `
                <td><i class="fas ${iconClass} file-icon"></i></td>
                <td class="file-name">${escapeHtml(file.name)}</td>
                <td>${fileSize}</td>
                <td>${modDate}</td>
                <td class="file-actions">
                    ${file.isDirectory 
                        ? `<button class="open-dir" data-path="${escapeHtml(file.path)}"><i class="fas fa-folder-open"></i> Open</button>`
                        : `
                            <button class="view-file" data-path="${escapeHtml(file.path)}" data-type="${escapeHtml(file.type)}">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <button class="download-file" data-path="${escapeHtml(file.path)}">
                                <i class="fas fa-download"></i> Download
                            </button>
                        `
                    }
                </td>
            `;
            
            // Add event listeners to the buttons
            row.querySelectorAll('.open-dir').forEach(button => {
                button.addEventListener('click', () => {
                    const dirPath = button.getAttribute('data-path');
                    loadDirectoryContents(dirPath);
                });
            });
            
            row.querySelectorAll('.view-file').forEach(button => {
                button.addEventListener('click', () => {
                    const filePath = button.getAttribute('data-path');
                    const fileType = button.getAttribute('data-type');
                    previewFile(filePath, fileType);
                });
            });
            
            row.querySelectorAll('.download-file').forEach(button => {
                button.addEventListener('click', () => {
                    const filePath = button.getAttribute('data-path');
                    downloadFile(filePath);
                });
            });
            
            fileListBody.appendChild(row);
        });
        
        // Clear preview when changing directories
        clearPreview();
    }
    
    function navigateToParentDirectory() {
        const pathParts = currentPath.split('/').filter(part => part !== '');
        pathParts.pop(); // Remove the last part
        const parentPath = pathParts.length > 0 ? '/' + pathParts.join('/') : '/';
        loadDirectoryContents(parentPath);
    }
    
    function navigateToHomeDirectory() {
        loadDirectoryContents(getHomeDirectory());
    }
    
    function refreshCurrentDirectory() {
        loadDirectoryContents(currentPath);
    }
    
    function getHomeDirectory() {
        // You might want to customize this based on the user's environment
        return '/home';
    }
    
    function previewFile(filePath, fileType) {
        clearPreview();
        
        if (fileType.startsWith('image/')) {
            // Preview image
            const img = document.createElement('img');
            img.src = `/api/view?path=${encodeURIComponent(filePath)}`;
            img.alt = 'File preview';
            img.className = 'preview-image';
            img.onerror = () => {
                showError('Failed to load image preview');
            };
            filePreviewContent.appendChild(img);
        } else if (fileType === 'application/pdf') {
            // Preview PDF
            const iframe = document.createElement('iframe');
            iframe.src = `/api/view?path=${encodeURIComponent(filePath)}`;
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = 'none';
            filePreviewContent.appendChild(iframe);
        } else if (fileType.startsWith('text/') || fileType.includes('javascript') || fileType.includes('json')) {
            // Preview text
            fetchTextContent(filePath);
        } else {
            // Show "no preview available" message
            const msg = document.createElement('div');
            msg.className = 'preview-placeholder';
            msg.innerHTML = `
                <i class="fas fa-file"></i>
                <p>No preview available for this file type</p>
                <button id="download-preview-file" class="download-file">
                    <i class="fas fa-download"></i> Download File
                </button>
            `;
            filePreviewContent.appendChild(msg);
            
            document.getElementById('download-preview-file').addEventListener('click', () => {
                downloadFile(filePath);
            });
        }
    }
    
    async function fetchTextContent(filePath) {
        showLoading();
        try {
            const response = await fetch(`/api/view?path=${encodeURIComponent(filePath)}`);
            if (!response.ok) {
                throw new Error(`Failed to load file: ${response.statusText}`);
            }
            
            const text = await response.text();
            const pre = document.createElement('pre');
            pre.style.width = '100%';
            pre.style.height = '100%';
            pre.style.overflow = 'auto';
            pre.style.padding = '1rem';
            pre.style.backgroundColor = '#f5f5f5';
            pre.style.borderRadius = '4px';
            pre.textContent = text;
            
            filePreviewContent.appendChild(pre);
        } catch (error) {
            console.error('Error loading text content:', error);
            showError(`Failed to load file: ${error.message}`);
        } finally {
            hideLoading();
        }
    }
    
    function clearPreview() {
        while (filePreviewContent.firstChild) {
            filePreviewContent.removeChild(filePreviewContent.firstChild);
        }
        
        const placeholder = document.createElement('div');
        placeholder.className = 'preview-placeholder';
        placeholder.innerHTML = `
            <i class="fas fa-file-alt"></i>
            <p>Select a file to preview</p>
        `;
        filePreviewContent.appendChild(placeholder);
    }
    
    function downloadFile(filePath) {
        // Create a temporary link and trigger a download
        const a = document.createElement('a');
        a.href = `/api/download?path=${encodeURIComponent(filePath)}`;
        a.download = filePath.split('/').pop();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        
        return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    
    function showLoading() {
        loadingOverlay.classList.add('visible');
    }
    
    function hideLoading() {
        loadingOverlay.classList.remove('visible');
    }
    
    function showError(message) {
        // You could implement a more sophisticated error display here
        alert(message);
    }
});
