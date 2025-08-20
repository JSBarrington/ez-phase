# EZ-PHASE Installation Guide

## Prerequisites

### 1. Node.js
Download and install Node.js (v16 or later) from [nodejs.org](https://nodejs.org/)

**Check your Node.js version:**
```bash
node --version
npm --version
```

### 2. PHASE 2.1.1 Binary
Download PHASE 2.1.1 from the [Stephens Lab website](http://stephenslab.uchicago.edu/phase/download.html)

**Platform-specific notes:**
- **macOS/Linux**: Make sure the binary is executable (`chmod +x PHASE`)
- **Windows**: Use the Windows executable version
- **All platforms**: Note the location where you save the PHASE binary

## Installation Methods

### Method 1: Development Installation (Recommended)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/JSBarrington/ez-phase.git
   cd ez-phase
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the application:**
   ```bash
   npm start
   ```

### Method 2: Pre-built Releases

1. **Download the latest release** from the [Releases page](https://github.com/JSBarrington/ez-phase/releases)

2. **Platform-specific installation:**

   **macOS:**
   - Download `EZ-PHASE-1.0.0.dmg`
   - Open the DMG file
   - Drag EZ-PHASE to your Applications folder
   - Launch from Applications (you may need to right-click → Open first time)

   **Windows:**
   - Download `EZ-PHASE-Setup-1.0.0.exe`
   - Run the installer
   - Follow the installation wizard
   - Launch from Start Menu or Desktop shortcut

   **Linux:**
   - Download `EZ-PHASE-1.0.0.AppImage`
   - Make it executable: `chmod +x EZ-PHASE-1.0.0.AppImage`
   - Run: `./EZ-PHASE-1.0.0.AppImage`

## First-Time Setup

### 1. PHASE Binary Configuration

When you first run EZ-PHASE:

1. **Auto-detection (Recommended):**
   - Click "🔍 Auto-detect PHASE Binary"
   - EZ-PHASE will search common locations:
     - `/usr/local/bin/phase`
     - `/usr/bin/phase`
     - `~/Desktop/PHASE`
     - `~/Downloads/PHASE`
     - Current directory

2. **Manual Selection:**
   - Click "Browse" next to "PHASE Binary Location"
   - Navigate to your PHASE executable
   - Select the file

### 2. Test Installation

1. **Create a test directory** with sample .inp files
2. **Select the directory** in EZ-PHASE
3. **Configure basic parameters** (defaults are fine for testing)
4. **Click "Run PHASE"** to verify everything works

## Troubleshooting

### Common Issues

**❌ "PHASE binary not found"**
- Ensure PHASE is downloaded and executable
- Check the file path is correct
- On macOS/Linux: `chmod +x /path/to/PHASE`

**❌ "Permission denied"**
- Make PHASE executable: `chmod +x PHASE`
- On macOS: Right-click PHASE → Open (bypass Gatekeeper)
- On Windows: Run as Administrator if needed

**❌ "Node.js version error"**
- Update Node.js to v16 or later
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and run `npm install` again

**❌ "Module not found errors"**
```bash
# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json
# Reinstall dependencies
npm install
```

**❌ "Electron app won't start"**
```bash
# Try rebuilding electron
npm run rebuild
# Or reinstall electron
npm uninstall electron --save-dev
npm install electron --save-dev
```

### Platform-Specific Issues

**macOS:**
- **Security warnings**: Go to System Preferences → Security & Privacy → Allow anyway
- **Command line tools**: Install Xcode command line tools if needed
  ```bash
  xcode-select --install
  ```

**Windows:**
- **PowerShell execution policy**: Run as Administrator:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```
- **Antivirus**: Add EZ-PHASE directory to antivirus exceptions

**Linux:**
- **Missing libraries**: Install build essentials
  ```bash
  # Ubuntu/Debian
  sudo apt update
  sudo apt install build-essential
  
  # CentOS/RHEL
  sudo yum groupinstall "Development Tools"
  ```

## Verification

After installation, verify EZ-PHASE is working:

1. **Launch EZ-PHASE**
2. **Auto-detect or select PHASE binary** ✅
3. **Select a directory with .inp files** ✅  
4. **See command preview** ✅
5. **Run a test analysis** ✅

## Advanced Installation

### Building from Source

```bash
# Clone and install
git clone https://github.com/JSBarrington/ez-phase.git
cd ez-phase
npm install

# For development
npm start

# Build distributables
npm run build          # All platforms
npm run build-mac      # macOS DMG
npm run build-win      # Windows installer
```

### Docker Installation (Optional)

```dockerfile
# Dockerfile for EZ-PHASE
FROM node:16-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
EXPOSE 3000

CMD ["npm", "start"]
```

## Getting Help

If you encounter issues:

1. **Check this guide** and the troubleshooting section
2. **Search existing issues** on GitHub
3. **Create a new issue** with:
   - Your operating system and version
   - Node.js version (`node --version`)
   - Error messages or screenshots
   - Steps to reproduce the problem

## Next Steps

Once installed, see:
- [USAGE.md](USAGE.md) - Detailed usage instructions
- [EXAMPLES.md](EXAMPLES.md) - Example workflows
- [FAQ.md](FAQ.md) - Frequently asked questions