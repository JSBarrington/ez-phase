# EZ-PHASE Setup Instructions

## Prerequisites

1. **Node.js** (v16 or later): Download from [nodejs.org](https://nodejs.org/)
2. **GNU Parallel** (for your script): Install via Homebrew: `brew install parallel`

## Quick Setup

### 1. Create Project Directory
```bash
mkdir ez-phase
cd ez-phase
```

### 2. Save Files
Save these files in your project directory:
- `package.json` (from the Electron Setup artifact)
- `main.js` (from the Electron Main Process artifact)  
- `index.html` (from the PHASE GUI artifact - rename it from the HTML version)

### 3. Install Dependencies
```bash
npm install
```

### 4. Update PHASE Binary Path
Edit `main.js` and update this line with your actual PHASE binary path:
```javascript
const phaseBin = '/Users/lab/Desktop/GraphiumSC/PHASE_Dir/phase-master/src/phase.2.1.1.source/PHASE';
```

### 5. Run the App
```bash
npm start
```

## Building for Distribution

### Create DMG for Mac
```bash
npm run build-mac
```

This creates a `.dmg` file in the `dist/` folder that you can distribute.

## Integration with Your Existing Script

The GUI automatically integrates your bash script logic:

### Key Features Integrated:
- **Your exact loci list** - easily customizable in the GUI
- **Parallel processing** - uses your GNU parallel approach
- **Logging** - maintains your `phase_run_details.log` functionality
- **File handling** - works with your `.inp`/`a.inp` file pattern
- **PHASE parameters** - includes all your flags (-MR, -d1, -S, etc.)

### Configuration Updates:
You can modify the script generation in `main.js`:

```javascript
// Update loci list to match yours
const LOCI = [
  'L03_CAD', 'L04_CAT', 'L05_DDC', 'L06_EF1', 
  'L07_GADPH', 'L08_HCL', 'L09_IDH', 'L10_MDH', 
  'L11_RpS2', 'L12_RpS5', 'L13_Wg'
];

// Update default parameters to match your preferences
const DEFAULT_ITERATIONS = 10000;
const DEFAULT_BURNIN = 10;
const DEFAULT_THINNING = 1000;
```

## File Structure
```
ez-phase/
├── package.json
├── main.js
├── preload.js
├── index.html
├── assets/
│   └── icon.png (optional)
└── dist/ (created after build)
```

## Testing

1. **Development Mode**: `npm start`
2. **Test with your .inp files**: Select your directory containing the files
3. **Check output**: Look for the generated log files and PHASE output files

## Troubleshooting

### Common Issues:

1. **PHASE not found**: Update the `phaseBin` path in `main.js`
2. **GNU Parallel not found**: Install with `brew install parallel`
3. **Permission denied**: Run `chmod +x /path/to/PHASE` on your binary
4. **Node.js version**: Ensure you're using Node.js v16+

### Debug Mode:
Uncomment this line in `main.js` to see console output:
```javascript
mainWindow.webContents.openDevTools();
```

## Features Your Script Already Has:

✅ **Parallel processing** with job control  
✅ **Detailed logging** to `phase_run_details.log`  
✅ **Error handling** for missing files  
✅ **Multiple seed runs** (1-5)  
✅ **Automatic output directory creation**  
✅ **GNU Parallel integration**  

The GUI just adds a user-friendly interface on top of your proven script logic!

## Next Steps

1. Test the basic setup
2. Customize loci list and parameters 
3. Add any additional PHASE options you need
4. Build and distribute the DMG file

Let me know if you need help with any of these steps!