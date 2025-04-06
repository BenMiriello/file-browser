# File Browser

A lightweight web-based file browser that lets you access your server's files through a browser from any device on your network.

![File Browser Screenshot](https://user-images.githubusercontent.com/40286278/67158168-8c2c5f00-f309-11e9-9d42-42a3ce5b1e55.png)

## Features

- Browse your file system from any device
- View images, text files, and PDFs directly in the browser
- Download files to your local device
- Bookmark favorite locations for quick access
- Mobile-friendly responsive design
- Browser history integration for back/forward navigation
- Toggle hidden files (dotfiles) visibility
- Configurable home directory and port

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/benmiriello/file-browser.git
   cd file-browser
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure the application in `package.json`:
   ```json
   "config": {
     "port": 4002,
     "homeDirectory": "/home/yourusername/"
   }
   ```

## Usage

### Starting the Server

Start the server with:

```bash
npm start
```

Access the file browser from any device on your network by navigating to:

```
http://your-server-hostname:4002
```

Replace `your-server-hostname` with your server's hostname or IP address.

### Accessing Remotely with Tailscale (Optional)

If you need to access your file browser from outside your local network, you can use [Tailscale](https://tailscale.com/) for secure remote access:

1. Install Tailscale on your server and client devices
2. Connect both devices to your Tailscale network
3. Access the file browser using your server's Tailscale IP or hostname

### Running as a Service (Keeping the Server Running)

To keep the file browser running even after you log out, you can set it up as a systemd service:

1. Create a service file:
   ```bash
   sudo nano /etc/systemd/system/file-browser.service
   ```

2. Add the following configuration (replace paths and username):
   ```
   [Unit]
   Description=File Browser
   After=network.target

   [Service]
   ExecStart=/usr/bin/node /path/to/file-browser/server.js
   Restart=always
   User=yourusername
   Group=yourusername
   Environment=PATH=/usr/bin:/usr/local/bin
   Environment=NODE_ENV=production
   WorkingDirectory=/path/to/file-browser

   [Install]
   WantedBy=multi-user.target
   ```

3. Enable and start the service:
   ```bash
   sudo systemctl enable file-browser
   sudo systemctl start file-browser
   ```

4. Check the status:
   ```bash
   sudo systemctl status file-browser
   ```

### Viewing Logs

If running as a service, you can view logs with:

```bash
sudo journalctl -u file-browser -f
```

## Configuration Options

You can configure the following options in the `config` section of your `package.json`:

- `port`: The port the server will listen on (default: 4002)
- `homeDirectory`: The default directory to show when accessing the file browser

You can also set these values using environment variables:

```bash
PORT=3003 HOME_DIRECTORY=/mnt/data npm start
```

## Features Guide

### Bookmarks

- Click the bookmark icon to open the bookmarks modal
- Click "Add Bookmark" to bookmark your current location
- Click on a bookmark to navigate directly to that location
- Click "Edit" to enable the delete buttons for removing bookmarks

### File Viewer

- Click on any file to preview it directly in the browser
- Text files, images, and PDFs are viewable in the browser
- Use the download button in the viewer to save files to your device

### Navigation

- Click on folders to navigate into them
- Use the parent directory button (^) to navigate up one level
- Click the home button to return to your configured home directory
- The browser's back and forward buttons work as expected

## Security Considerations

This application is designed for use within a private network. If you need to expose it to the internet, consider using Tailscale or implementing additional security measures such as:

- Strong authentication
- HTTPS encryption
- Rate limiting
- Restricted directory access

## Troubleshooting

- **Can't access the file browser**: Ensure your firewall allows traffic on the configured port
- **Permission errors**: Make sure the user running the service has read access to the directories you're trying to browse
- **Service won't start**: Check the logs with `sudo journalctl -u file-browser -e` for detailed error messages

## License

MIT
