# EZ-PHASE: Easy Haplotype Phasing GUI

A user-friendly GUI wrapper for PHASE 2.1.1 haplotype phasing software, designed to make population genetics analysis accessible to researchers without extensive command-line experience.

![EZ-PHASE Logo](assets/icon2.png)

## 🧬 About

EZ-PHASE provides an intuitive graphical interface for the PHASE 2.1.1 command-line tool, enabling researchers to perform haplotype phasing analysis through a modern, easy-to-use interface. Perfect for population genetics, phylogeography, and evolutionary studies.

## ✨ Features

- **Point-and-click interface** - No command-line knowledge required
- **Batch processing** - Process multiple .inp files simultaneously  
- **Parallel execution** - Leverage multiple CPU cores for faster analysis
- **Real-time preview** - See exact PHASE commands before execution
- **Progress tracking** - Monitor analysis progress with detailed logs
- **Advanced parameters** - Full access to PHASE 2.1.1 options:
  - Multiple recombination models (MR0, MR1, MR2, MR3, MR4)
  - Mutation models (stepwise, PIM, custom δ-files)
  - Customizable iterations, burn-in, and thinning
  - Call thresholds and random seeds
- **Auto-detection** - Automatically finds PHASE binary in common locations
- **Detailed logging** - Complete execution logs for reproducibility

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or later)
- [PHASE 2.1.1](http://stephenslab.uchicago.edu/phase/download.html) binary
- macOS, Windows, or Linux

### Installation

1. **Clone this repository:**
   ```bash
   git clone https://github.com/jessebarrington/ez-phase.git
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

## 📖 Usage

### Basic Workflow

1. **Select PHASE Binary**: 
   - Click "Browse" to manually locate your PHASE executable
   - The app validates the binary automatically

2. **Choose Input Files**: 
   - Select a directory containing your .inp files
   - The app will automatically detect all .inp files in the folder

3. **Configure Parameters**:
   - Set basic parameters (iterations, burn-in, thinning)
   - Optionally configure advanced options (recombination models, etc.)

4. **Preview & Run**: 
   - Review the generated command in the preview section
   - Click "Run PHASE" to start analysis

### Input File Format

EZ-PHASE works with standard PHASE input files (.inp format). Your files should follow the PHASE 2.1.1 specification:

```
5        # Number of individuals
10       # Number of loci
P 1 2 3 4 5 6 7 8 9 10    # Position line
SSSSSSSSS               # Sequence type line
# Individual data follows...
```

### Output Files

EZ-PHASE creates an `ez_phase_output/` directory containing:
- **Phased haplotypes** (`.out` files)
- **Execution logs** (`phase_execution.log`)
- **Parameter summaries** 
- **Error reports** (if any)

## 🔧 Advanced Configuration

### Recombination Models

- **MR0** (default): Li–Stephens model with general recombination variation
- **MR1**: Single hotspot with unknown position
- **MR2**: User-specified hotspot intervals (1-2 intervals)
- **MR3**: Constant recombination rate (estimated)
- **MR4**: Constant recombination rate (fixed, requires -R value)

### Parallel Processing

EZ-PHASE can run multiple PHASE processes simultaneously:
- **Auto-detect**: Automatically uses optimal number of cores
- **Manual**: Choose 1, 2, 4, or 8 parallel processes
- Significantly reduces analysis time for large datasets

## Building for Distribution

### Create macOS DMG
```bash
npm run build-mac
```

### Create Windows Installer  
```bash
npm run build-win
```

### Universal Build
```bash
npm run build
```

Built applications will be in the `dist/` directory.

## Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and add tests if applicable
4. **Commit**: `git commit -m 'Add amazing feature'`
5. **Push**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

### Development Setup

```bash
# Clone your fork
git clone https://github.com/jessebarrington/ez-phase.git
cd ez-phase

# Install dependencies
npm install

# Run in development mode
npm start

# Enable dev tools (uncomment in main.js)
# mainWindow.webContents.openDevTools();
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [PHASE 2.1.1](http://stephenslab.uchicago.edu/phase/) by Stephens Lab, University of Chicago
- Built with [Electron](https://electronjs.org/) for cross-platform compatibility
- Icons and UI inspired by modern bioinformatics tools

## Support & Contact

- **Issues**: [GitHub Issues](https://github.com/jessebarrington/ez-phase/issues)
- **Documentation**: [Wiki](https://github.com/jessebarrington/ez-phase/wiki)
- **Email**: jesse.barrington@gmail.com

## Citation

If you use EZ-PHASE in your research, please cite:

```
EZ-PHASE: A User-Friendly GUI for PHASE 2.1.1 Haplotype Phasing
Jesse S. Barrington (2025)
GitHub: https://github.com/jessebarrington/ez-phase
```

And the original PHASE software:
```
Stephens, M., Smith, N.J. and Donnelly, P. (2001) 
A new statistical method for haplotype reconstruction from population data. 
American Journal of Human Genetics, 68, 978–989.
```

---

**⭐ Star this repository if EZ-PHASE helps your research!**
