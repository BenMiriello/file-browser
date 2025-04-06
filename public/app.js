document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const fileListBody = document.getElementById('file-list-body');
    const currentPathInput = document.getElementById('current-path');
    const parentDirButton = document.getElementById('parent-dir');
    const homeDirButton = document.getElementById('home-dir');
    const refreshButton = document.getElementById('refresh');
    const toggleHiddenButton = document.getElementById('toggle-hidden');
    const bookmarksButton = document.getElementById('bookmarks');
    const previewModal = document.getElementById('preview-modal');
    const closePreviewButton = document.getElementById('close-preview');
    const previewFilename = document.getElementById('preview-filename');
    const filePreviewContent = document.getElementById('file-preview-content');
    const downloadPreviewButton = document.getElementById('download-preview-file');
    const loadingOverlay = document.getElementById('loading-overlay');
    const bookmarksModal = document.getElementById('bookmarks-modal');
    const closeBookmarksButton = document.getElementById('close-bookmarks');
    const bookmarksList = document.getElementById('bookmarks-list');
    const addBookmarkButton = document.getElementById('add-bookmark');
    const editBookmarksButton = document.getElementById('edit-bookmarks');
    
    // Current state
    let currentPath = '';
    let homeDirectory = '';
    let showHiddenFiles = false;
    let currentPreviewFilePath = '';
    let isEditingBookmarks = false;
    let bookmarks = [];
    
    // Initialize the app
    init();
    
    async function init() {
        // Load bookmarks from localStorage
        loadBookmarks();
        
        // Fetch configuration from server
        try {
            const configResponse = await fetch('/api/config');
            const config = await configResponse.json();
            homeDirectory = config.homeDirectory;
            
            // Set initial path to home directory
            currentPath = homeDirectory;
            
            // Initial data load
            loadDirectoryContents(currentPath);
            
            // Event listeners
            parentDirButton.addEventListener('click', navigateToParentDirectory);
            homeDirButton.addEventListener('click', navigateToHomeDirectory);
            refreshButton.addEventListener('click', refreshCurrentDirectory);
            toggleHiddenButton.addEventListener('click', toggleHiddenFiles);
            bookmarksButton.addEventListener('click', () => bookmarksModal.classList.add('show'));
            closePreviewButton.addEventListener('click', closePreviewModal);
            closeBookmarksButton.addEventListener('click', () => bookmarksModal.classList.remove('show'));
            addBookmarkButton.addEventListener('click', addCurrentPathToBookmarks);
            editBookmarksButton.addEventListener('click', toggleEditBookmarks);
            downloadPreviewButton.addEventListener('click', () => {
                if (currentPreviewFilePath) {
                    downloadFile(currentPreviewFilePath);
                }
            });
            
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
        } catch (error) {
            console.error('Error fetching configuration:', error);
            alert('Failed to initialize the application. Please refresh and try again.');
        }
    }
    
    // Bookmark functions
    function loadBookmarks() {
        try {
            const savedBookmarks = localStorage.getItem('fileBrowserBookmarks');
            if (savedBookmarks) {
                bookmarks = JSON.parse(savedBookmarks);
                renderBookmarks();
            }
        } catch (error) {
            console.error('Error loading bookmarks:', error);
            bookmarks = [];
        }
    }
    
    function saveBookmarks() {
        try {
            localStorage.setItem('fileBrowserBookmarks', JSON.stringify(bookmarks));
        } catch (error) {
            console.error('Error saving bookmarks:', error);
        }
    }
    
    function renderBookmarks() {
        bookmarksList.innerHTML = '';
        
        if (bookmarks.length === 0) {
            const li = document.createElement('li');
            li.className = 'bookmark-item';
            li.textContent = 'No bookmarks yet. Add some!';
            bookmarksList.appendChild(li);
            return;
        }
        
        bookmarks.forEach((bookmark, index) => {
            const li = document.createElement('li');
            li.className = 'bookmark-item';
            
            li.innerHTML = `
                <div class="bookmark-title">${escapeHtml(bookmark.title)}</div>
                <div class="bookmark-path">${escapeHtml(bookmark.path)}</div>
                <button class="bookmark-delete" data-index="${index}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            `;
            
            li.addEventListener('click', (e) => {
                // Don't navigate if clicking the delete button
                if (e.target.closest('.bookmark-delete')) {
                    return;
                }
                
                loadDirectoryContents(bookmark.path);
                bookmarksModal.classList.remove('show');
            });
            
            bookmarksList.appendChild(li);
        });
        
        // Add delete event listeners
        document.querySelectorAll('.bookmark-delete').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(button.getAttribute('data-index'));
                bookmarks.splice(index, 1);
                saveBookmarks();
                renderBookmarks();
            });
        });
    }
    
    function addCurrentPathToBookmarks() {
        // Extract folder name from path for the title
        const pathParts = currentPath.split('/').filter(part => part !== '');
        const folderName = pathParts.length > 0 ? pathParts[pathParts.length - 1] : 'Root';
        
        // Check if this path is already bookmarked
        if (bookmarks.some(bookmark => bookmark.path === currentPath)) {
            alert('This location is already bookmarked!');
            return;
        }
        
        bookmarks.push({
            title: folderName,
            path: currentPath
        });
        
        saveBookmarks();
        renderBookmarks();
    }
    
    function toggleEditBookmarks() {
        isEditingBookmarks = !isEditingBookmarks;
        
        if (isEditingBookmarks) {
            bookmarksList.classList.add('editing');
            editBookmarksButton.textContent = 'Done';
        } else {
            bookmarksList.classList.remove('editing');
            editBookmarksButton.textContent = 'Edit';
        }
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
            row.setAttribute('data-name', file.name);
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
                    <span class="file-name-text">${escapeHtml(file.name)}</span>
                </td>
                <td>${fileSize}</td>
                <td>${modDate}</td>
            `;
            
            // Add click event for the entire row
            row.addEventListener('click', () => {
                const isDirectory = row.getAttribute('data-is-dir') === 'true';
                const path = row.getAttribute('data-path');
                
                if (isDirectory) {
                    loadDirectoryContents(path);
                } else {
                    const fileType = row.getAttribute('data-type');
                    const fileName = row.getAttribute('data-name');
                    previewFile(path, fileType, fileName);
                }
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
            ? '<i class="fas fa-eye"></i>' 
            : '<i class="fas fa-eye-slash"></i>';
        refreshCurrentDirectory();
    }
    
    function getHomeDirectory() {
        return homeDirectory;
    }
    
    function previewFile(filePath, fileType, fileName) {
        // Set current preview file path for download button
        currentPreviewFilePath = filePath;
        
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
            `;
            filePreviewContent.appendChild(msg);
        }
        
        // Show the modal
        previewModal.classList.add('show');
    }
    
    function closePreviewModal() {
        previewModal.classList.remove('show');
        currentPreviewFilePath = '';
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