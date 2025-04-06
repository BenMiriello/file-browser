# Debian File Browser

A lightweight web-based file browser that lets you access your Debian server's files through a browser from any device on your Tailscale network.

## Features

- Browse your server's file system from any device
- View images, text files, and PDFs directly in the browser
- Download files to your local device
- Mobile-friendly responsive design
- Browser history integration for back/forward navigation
- Toggle hidden files (dotfiles) visibility
- Configurable home directory and port

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)
- A Debian server
- [Tailscale](https://tailscale.com/) installed and configured on both server and client devices

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
     "port": 3002,
     "homeDirectory": "/home/yourusername/"
   }
   ```

## Usage

### Starting the Server

Start the server with:

```bash
npm start
```

Access the file browser from any device on your Tailscale network by navigating to:

```
http://your-server-hostname:3002
```

Replace `your-server-hostname` with your server's Tailscale hostname or IP address.

### Running as a Service (Keeping the Server Running)

To keep the file browser running even after you log out, you can set it up as a systemd service:

1. Create a service file:
   ```bash
   sudo nano /etc/systemd/system/file-browser.service
   ```

2. Add the following configuration (replace paths and username):
   ```
   [Unit]
   Description=Debian File Browser
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

- `port`: The port the server will listen on (default: 3002)
- `homeDirectory`: The default directory to show when accessing the file browser

You can also set these values using environment variables:

```bash
PORT=3003 HOME_DIRECTORY=/mnt/data npm start
```

## Security Considerations

This application is designed for use within a private Tailscale network. It does not include authentication or encryption beyond what Tailscale provides. Do not expose this service directly to the internet.

## Troubleshooting

- **Can't access the file browser**: Make sure Tailscale is running on both the server and client devices.
- **Permission errors**: Ensure the user running the service has read access to the directories you're trying to browse.
- **Service won't start**: Check the logs with `sudo journalctl -u file-browser -e` for detailed error messages.

## License

MIT
