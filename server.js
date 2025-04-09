// server.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const util = require('util');
const readdir = util.promisify(fs.readdir);
const stat = util.promisify(fs.stat);
const cors = require('cors');
const morgan = require('morgan');
const mime = require('mime-types');
const packageJson = require('./package.json');

const app = express();
const PORT = process.env.PORT || packageJson.config.port || 4002;
const HOME_DIRECTORY = process.env.HOME_DIRECTORY || packageJson.config.homeDirectory || '/home';

// Configure middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(express.static('public'));

// Make configuration accessible to the frontend
app.get('/api/config', (req, res) => {
  res.json({
    homeDirectory: HOME_DIRECTORY
  });
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to get directory contents
app.get('/api/files', async (req, res) => {
  try {
    const dirPath = req.query.path || '/';
    
    // Security check: prevent path traversal attacks
    const normalizedPath = path.normalize(dirPath).replace(/^(\.\.(\/|\\|$))+/, '');
    
    const files = await readdir(normalizedPath);
    const fileStats = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(normalizedPath, file);
        try {
          const stats = await stat(filePath);
          return {
            name: file,
            path: filePath,
            isDirectory: stats.isDirectory(),
            size: stats.size,
            mtime: stats.mtime,
            type: mime.lookup(filePath) || 'application/octet-stream'
          };
        } catch (err) {
          return {
            name: file,
            path: filePath,
            isDirectory: false,
            size: 0,
            mtime: new Date(),
            type: 'unknown',
            error: err.message
          };
        }
      })
    );

    res.json({
      currentPath: normalizedPath,
      files: fileStats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to download files
app.get('/api/download', (req, res) => {
  try {
    const filePath = req.query.path;
    
    // Security check: prevent path traversal attacks
    const normalizedPath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
    
    if (!fs.existsSync(normalizedPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const stats = fs.statSync(normalizedPath);
    if (stats.isDirectory()) {
      return res.status(400).json({ error: 'Cannot download directories' });
    }

    res.download(normalizedPath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to view file content (for images and other viewable files)
app.get('/api/view', (req, res) => {
  try {
    const filePath = req.query.path;
    
    // Security check: prevent path traversal attacks
    const normalizedPath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
    
    if (!fs.existsSync(normalizedPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const stats = fs.statSync(normalizedPath);
    if (stats.isDirectory()) {
      return res.status(400).json({ error: 'Cannot view directories' });
    }

    const contentType = mime.lookup(normalizedPath) || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    fs.createReadStream(normalizedPath).pipe(res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`File browser server running on port ${PORT}`);
  console.log(`Home directory set to: ${HOME_DIRECTORY}`);
  console.log(`Access it through your network at http://<your-server-hostname>:${PORT}`);
});