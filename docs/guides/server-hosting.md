# Server Hosting

This guide walks you through setting up a Hytale dedicated server from scratch using the official Hytale Downloader CLI. Once your server is running, you can point the Hytale Server Manager app at the `Server/` directory during first-run setup to manage it through the GUI.

## Prerequisites

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Java | 25 (Adoptium) | 25 (Adoptium) |
| RAM | 4 GB | 8 GB+ (for public servers) |
| Architecture | x64 or arm64 | x64 or arm64 |
| Network | UDP port 5520 | UDP port 5520 |

## Installing Java 25

Hytale servers require Java 25. The Adoptium distribution is recommended.

### Windows

```bash
winget install EclipseAdoptium.Temurin.25.JDK
```

After installing, add Java to your PATH:

```powershell
# Current session (PowerShell)
$env:Path = "C:\Program Files\Eclipse Adoptium\jdk-25.0.2.10-hotspot\bin;$env:Path"

# Permanent (run as Administrator in PowerShell)
[Environment]::SetEnvironmentVariable("Path", "C:\Program Files\Eclipse Adoptium\jdk-25.0.2.10-hotspot\bin;" + [Environment]::GetEnvironmentVariable("Path", "Machine"), "Machine")
```

### Verify

```bash
java -version
```

## Creating a Server Directory

Before downloading anything, create a directory where your server will live. This can be anywhere on your system -- for example, a `Games/Hytale Servers/` folder with a subdirectory per server:

```bash
mkdir -p "Games/Hytale Servers/Home"
cd "Games/Hytale Servers/Home"
```

All subsequent steps happen inside this directory.

## Installing the Hytale Downloader

The Hytale Downloader is the official CLI tool for downloading and updating server files. It handles OAuth2 authentication automatically. Java 25 must be installed first.

From inside your server directory:

```bash
# Download
curl -L -o hytale-downloader.zip https://downloader.hytale.com/hytale-downloader.zip

# Extract
unzip hytale-downloader.zip

# Verify
ls -la hytale-downloader*
```

## Downloading Server Files

Run the downloader from your server directory to authenticate and download:

```bash
# Windows
./hytale-downloader-windows-amd64.exe

# Linux
./hytale-downloader-linux-amd64
```

The terminal will prompt you to visit `oauth.accounts.hytale.com` to authorize the download. Complete the authentication in your browser. Once authorized, the downloader fetches the latest server version as a compressed archive (e.g., `2026.02.06-aa1b071c2.zip`) into the current directory.

To check the current server version without downloading:

```bash
# Windows
./hytale-downloader-windows-amd64.exe -print-version

# Linux
./hytale-downloader-linux-amd64 -print-version
```

## Extracting Server Files

Extract the downloaded archive from your server directory:

```bash
unzip 2026.02.06-aa1b071c2.zip
```

This creates a `hytale-server/` subdirectory containing the server files. Your directory should now look like:

```
Home/                                           (your server directory)
├── .hytale-downloader-credentials.json
├── 2026.02.06-aa1b071c2.zip                    (downloaded archive)
├── hytale-downloader.zip
├── hytale-downloader-windows-amd64.exe         (or linux-amd64)
├── hytale-downloader-linux-amd64
├── QUICKSTART.md
└── hytale-server/                              (extracted server)
    ├── Assets.zip
    ├── Server/
    │   ├── HytaleServer.jar
    │   ├── HytaleServer.aot
    │   └── Licenses/
    ├── start.bat                               (Windows)
    └── start.sh                                (Linux/macOS)
```

> **Using the Hytale Server Manager?** Point the app at the `Server/` directory inside `hytale-server/` during first-run setup. The app validates the directory by checking for `HytaleServer.jar`.

## Starting the Server

Use the provided startup scripts:

```bash
cd hytale-server
./start.sh
```

For custom memory settings, start the JAR directly:

```bash
java -Xmx4G -Xms4G -jar Server/HytaleServer.jar --assets
```

| Flag | Description |
|------|-------------|
| `-Xmx4G` | Maximum memory allocation (adjust based on available RAM) |
| `-Xms4G` | Initial memory allocation |
| `--assets` | Required flag to load game assets |

## Server Authentication

On first run, authenticate in the server console:

```
/auth login device
```

This displays a link to `oauth.accounts.hytale.com` with a device code. Open the link in your browser and authorize the server.

By default, credentials are stored in memory only and are lost when the server stops. To persist them across restarts:

```
/auth persistence Encrypted
```

| Persistence Type | Description |
|------------------|-------------|
| `Memory` | Credentials lost on restart (default) |
| `Encrypted` | Credentials saved securely to disk (recommended) |

Verify authentication status with `/auth status`.

## Network Configuration

### Finding Your Local IP

```bash
# Windows (Git Bash)
ipconfig | grep -A 5 "Wireless\|Ethernet" | grep "IPv4"
```

Your local IP will look like `192.168.1.100` or `10.0.0.50`.

### Port Forwarding

Hytale uses **UDP port 5520** with the QUIC protocol. TCP forwarding is not required.

1. Access your router's admin panel (usually `192.168.1.1` or `192.168.0.1`)
2. Navigate to the Port Forwarding section
3. Create a rule:
   - **Protocol**: UDP
   - **External Port**: 5520
   - **Internal Port**: 5520
   - **Internal IP**: Your local IP address

### Firewall

```bash
# Windows (run as Administrator)
netsh advfirewall firewall add rule name="Hytale Server" dir=in action=allow protocol=UDP localport=5520

# Verify
netsh advfirewall firewall show rule name="Hytale Server"
```

## Console Commands

### Authentication and Permissions

| Command | Description |
|---------|-------------|
| `/auth login device` | Authenticate the server |
| `/auth persistence Encrypted` | Persist credentials across restarts |
| `/op self` | Grant yourself operator access |
| `/op add <player>` | Grant operator to another player |
| `/op remove <player>` | Revoke operator status |
| `/whoami` | Display your player info |

### Whitelist

| Command | Description |
|---------|-------------|
| `whitelist on` | Enable the whitelist |
| `whitelist off` | Disable the whitelist |
| `whitelist add <username>` | Add a player |
| `whitelist remove <username>` | Remove a player |
| `whitelist list` | List all whitelisted players |

### Moderation

| Command | Description |
|---------|-------------|
| `/who` | List online players |
| `/kick <player> [reason]` | Kick a player |
| `/ban <player> [reason]` | Ban a player |
| `/unban <player>` | Unban a player |

### Server Control

| Command | Description |
|---------|-------------|
| `/stop` | Gracefully shut down the server |
| `/save` or `/save-all` | Force a world save |
| `/restart` | Restart the server |
| `/tps` | Display server tick rate |

### World and Teleportation

| Command | Description |
|---------|-------------|
| `/tp <x> <y> <z>` | Teleport to coordinates |
| `/tp <player>` | Teleport to a player |
| `/setspawn` | Set the world spawn point |
| `/spawn` | Teleport to spawn |
| `/time` | Display or set world time |
| `/weather` | Manage weather |
| `/seed` | Display the world seed |

### Utility

| Command | Description |
|---------|-------------|
| `/help` | List all commands |
| `<command> --help` | Help for a specific command |
| `/whereami` | Display current coordinates |
| `/ping` | Check network latency |
| `/gamemode <mode>` | Change game mode |

## Updating the Server

### Manual Update

```bash
# 1. Stop the server (in the server console)
/stop

# 2. Run the downloader
./hytale-downloader-windows-amd64.exe   # Windows
./hytale-downloader-linux-amd64          # Linux

# 3. Extract new files over the existing directory
unzip -o <new-version>.zip -d /path/to/hytale-server

# 4. Restart
./start.sh
```

### Automated Update Script (Linux)

```bash
cat > update.sh << 'EOF'
#!/bin/bash
DOWNLOADER_DIR="/path/to/downloader"
SERVER_DIR="/path/to/hytale-server"

cd $DOWNLOADER_DIR

echo "Checking for updates..."
./hytale-downloader-linux-amd64 -print-version
./hytale-downloader-linux-amd64

# Extract new files if updated (stop the server first)
EOF

chmod +x update.sh
```

Schedule with cron:

```bash
crontab -e
# Add: check for updates every hour
0 * * * * /path/to/update.sh >> /path/to/logs/update.log 2>&1
```

## Performance Tuning

| Players | Recommended RAM | View Distance |
|---------|-----------------|---------------|
| 1-5 | 4 GB | 10-12 |
| 5-15 | 8 GB | 8-10 |
| 15-30 | 12 GB | 6-8 |
| 30+ | 16 GB+ | 4-6 |

## Hosting Options

### Self-Hosting

| Pros | Cons |
|------|------|
| Free (no monthly costs) | Relies on your home internet |
| Full control over hardware | Server is down when your PC is off |
| | May need dynamic DNS configuration |

### VPS / Dedicated Server

| Pros | Cons |
|------|------|
| 24/7 uptime | Monthly cost ($10-50+) |
| Better network performance | Requires command-line knowledge |
| Static IP address | |

### Managed Hosting

| Pros | Cons |
|------|------|
| Easy setup with control panels | Higher monthly cost |
| 24/7 technical support | Less control over configuration |
| Automatic backups and updates | |

Managed hosting providers that support Hytale:

- [Apex Hosting](https://apexminecrafthosting.com/games/hytale-server-hosting/)
- [Shockbyte](https://shockbyte.com/games/hytale-server-hosting)
- [Host Havoc](https://hosthavoc.com/blog/how-to-setup-a-hytale-server)
- [Pine Hosting](https://pinehosting.com/hytale)

## Troubleshooting

### Server Won't Start

```bash
# Verify Java 25
java -version

# Verify Assets.zip exists
ls -la | grep Assets

# Check available memory
free -h            # Linux/macOS
wmic OS get FreePhysicalMemory   # Windows
```

### Downloader Authentication Fails

Re-run the downloader to re-authenticate. You will be prompted to visit `oauth.accounts.hytale.com` again:

```bash
# Windows
./hytale-downloader-windows-amd64.exe

# Linux
./hytale-downloader-linux-amd64
```

### Players Can't Connect

```bash
# Test if the port is open
nc -zvu localhost 5520

# Check if the server process is running
ps aux | grep HytaleServer   # Linux/macOS
tasklist | grep java          # Windows
```

### Poor Performance

- Reduce view distance in server settings
- Allocate more RAM (if available)
- Check server TPS with the `/tps` command
- Consider upgrading to a dedicated server or VPS

### Reading Server Logs

```bash
# Tail the latest log
tail -f logs/latest.log

# Search for errors
grep -i "error\|exception" logs/latest.log
```

## Additional Resources

- [Official Hytale Server Manual](https://support.hytale.com/hc/en-us/articles/45326769420827-Hytale-Server-Manual)
- [Hytale CLI Guide](https://supercraft.host/wiki/hytale/hytale-downloader-cli-guide/)
- [Server Commands Reference](https://low.ms/knowledgebase/server-commands-guide-for-hytale)
- [Hytale Official Website](https://hytale.com)