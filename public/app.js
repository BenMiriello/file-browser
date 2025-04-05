document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const fileListBody = document.getElementById('file-list-body');
    const currentPathInput = document.getElementById('current-path');
    const parentDirButton = document.getElementById('parent-dir');
    const homeDirButton = document.getElementById('home-dir');
    const refreshButton = document.getElementById('refresh');
    const toggleHiddenButton = document.getElementById('toggle-hidden');
    const previewModal = document.getElementById('preview-modal');
    const closePreviewButton = document.getElementById('close-preview');
    const previewFilename = document.getElementById('preview-filename');
    const filePreviewContent = document.getElementById('file-preview-content');
    const loadingOverlay = document.getElementById('loading-overlay');
    
    // Current state
    let currentPath = '/home/simonsays/';
    let showHiddenFiles = false;
    
    // Initialize the app
    init();
    
    function init() {
        // Initial data load
        loadDirectoryContents(currentPath);
        
        // Event listeners
        parentDirButton.addEventListener('click', navigateToParentDirectory);
        homeDirButton.addEventListener('click', navigateToHomeDirectory);
        refreshButton.addEventListener('click', refreshCurrentDirectory);
        toggleHiddenButton.addEventListener('click', toggleHiddenFiles);
        closePreviewButton.addEventListener('click', closePreviewModal);
        
        // Allow path input and navigation
        currentPathInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                loadDirectoryContents(currentPathInput.value);
            }
        });
        
        // Close modal when clicking outside content
        previewModal.addEventListener('click', (e) => {
            if (e.target === previewModal) {
                closePreviewModal();
            }
        });
        
        // Handle browser navigation
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.path) {
                loadDirectoryContents(event.state.path, false);
            }
        });
        
        // Initialize browser history
        window.history.replaceState({ path: currentPath }, '', `#${encodeURIComponent(currentPath)}`);
    }
    
    async function loadDirectoryContents(path, updateHistory = true) {
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
            
            // Update browser history
            if (updateHistory) {
                window.history.pushState(
                    { path: currentPath }, 
                    '', 
                    `#${encodeURIComponent(currentPath)}`
                );
            }
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
        
        // Filter hidden files if needed
        if (!showHiddenFiles) {
            files = files.filter(file => !file.name.startsWith('.'));
        }
        
        // Sort files (directories first, then by name)
        files.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });
        
        // Create table rows for each file
        files.forEach(file => {
            const row = document.createElement('tr');
            row.setAttribute('data-path', file.path);
            row.setAttribute('data-is-dir', file.isDirectory);
            if (!file.isDirectory) {
                row.setAttribute('data-type', file.type);
            }
            
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
                <td class="file-name">
                    <i class="fas ${iconClass} file-icon"></i>
                    ${escapeHtml(file.name)}
                </td>
                <td>${fileSize}</td>
                <td>${modDate}</td>
                <td class="file-actions">
                    ${file.isDirectory 
                        ? `<button class="open-dir" data-path="${escapeHtml(file.path)}">
                              <i class="fas fa-folder-open"></i> Open
                           </button>`
                        : `
                            <button class="view-file" data-path="${escapeHtml(file.path)}" data-type="${escapeHtml(file.type)}" data-name="${escapeHtml(file.name)}">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <button class="download-file" data-path="${escapeHtml(file.path)}">
                                <i class="fas fa-download"></i> Download
                            </button>
                        `
                    }
                </td>
            `;
            
            // Add click event for the entire row
            row.addEventListener('click', (e) => {
                // Ignore clicks on buttons
                if (e.target.closest('button')) {
                    return;
                }
                
                const isDirectory = row.getAttribute('data-is-dir') === 'true';
                const path = row.getAttribute('data-path');
                
                if (isDirectory) {
                    loadDirectoryContents(path);
                } else {
                    const fileType = row.getAttribute('data-type');
                    const fileName = row.querySelector('.file-name').textContent.trim();
                    previewFile(path, fileType, fileName);
                }
            });
            
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
                    const fileName = button.getAttribute('data-name');
                    previewFile(filePath, fileType, fileName);
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
    
    function toggleHiddenFiles() {
        showHiddenFiles = !showHiddenFiles;
        toggleHiddenButton.innerHTML = showHiddenFiles 
            ? '<i class="fas fa-eye"></i> .files' 
            : '<i class="fas fa-eye-slash"></i> .files';
        refreshCurrentDirectory();
    }
    
    function getHomeDirectory() {
        return '/home/simonsays/';
    }
    
    function previewFile(filePath, fileType, fileName) {
        // Clear previous content
        while (filePreviewContent.firstChild) {
            filePreviewContent.removeChild(filePreviewContent.firstChild);
        }
        
        // Set filename in the modal header
        previewFilename.textContent = fileName || 'File Preview';
        
        if (fileType && fileType.startsWith('image/')) {
            // Preview image
            const img = document.createElement('img');
            img.src = `/api/view?path=${encodeURIComponent(filePath)}`;
            img.alt = 'File preview';
            img.className = 'preview-image';
            img.onerror = () => {
                showPreviewError('Failed to load image preview');
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
        } else if (fileType && (fileType.startsWith('text/') || fileType.includes('javascript') || fileType.includes('json'))) {
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
        
        // Show the modal
        previewModal.classList.add('show');
    }
    
    function closePreviewModal() {
        previewModal.classList.remove('show');
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
            pre.style.whiteSpace = 'pre-wrap';
            pre.style.wordBreak = 'break-word';
            pre.textContent = text;
            
            filePreviewContent.appendChild(pre);
        } catch (error) {
            console.error('Error loading text content:', error);
            showPreviewError(`Failed to load file: ${error.message}`);
        } finally {
            hideLoading();
        }
    }
    
    function showPreviewError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'preview-error';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <p>${escapeHtml(message)}</p>
        `;
        filePreviewContent.appendChild(errorDiv);
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
        alert(message);
    }
});
