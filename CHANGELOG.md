# Changelog

All notable changes to EZ-PHASE will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.10.0] - 2024-08-27

### 🎉 Major Release - Enhanced File Management & Process Control

### Added
- **Enhanced File Management System**
  - Visual status indicators for files (pending/processing/completed/error)
  - Real-time file status updates during execution
  - Individual file removal with status-aware controls
  - File size display and better file information

- **Advanced Process Control**
  - Robust stop/cancel functionality for PHASE processes
  - Process group management for better cleanup
  - Force-kill mechanism after timeout
  - Process status tracking and recovery

- **Auto-detect Parallel Processing**
  - Automatic CPU core detection option
  - Intelligent parallel process optimization
  - Better resource utilization for batch jobs

- **Enhanced Advanced Parameters UI**
  - Full MR1, MR2, MR4 recombination model support
  - Dynamic UI for hotspot interval specification
  - Delta-file mutation model selection
  - Improved parameter validation and error messages

- **Real-time Progress Tracking**
  - Per-file progress monitoring
  - Live output streaming from PHASE execution
  - Separate error and standard output handling
  - Progress bar with detailed status information

### Improved
- **User Interface**
  - Better visual feedback for all operations
  - Improved tooltip documentation
  - Enhanced error messaging and recovery
  - More intuitive parameter organization

- **Cross-platform Compatibility**
  - Better Windows process management
  - Improved macOS application bundling
  - Enhanced Linux AppImage functionality

- **Performance & Stability**
  - More efficient memory usage for large datasets
  - Better handling of concurrent file processing
  - Improved error recovery and cleanup
  - Enhanced logging and debugging capabilities

### Technical Enhancements
- Refactored process management with proper cleanup
- Enhanced IPC communication between processes
- Improved file system operations and error handling
- Better separation of concerns in codebase architecture

### Fixed
- Process zombie prevention through proper cleanup
- File locking issues during batch processing
- Memory leaks in long-running operations
- Cross-platform path handling inconsistencies

## [1.1.0] - 2024-08-XX

### Initial Enhanced Version
- Basic GUI wrapper for PHASE 2.1.1
- File selection and batch processing
- Parameter configuration interface
- Command preview functionality
- Cross-platform build system

---

## Release Notes

### v1.10.0 Highlights

This major release focuses on **professional-grade file management** and **robust process control**, making EZ-PHASE suitable for production bioinformatics workflows. The enhanced status tracking system provides clear visibility into batch processing operations, while the improved process control ensures reliable execution even with large datasets.

**Key Benefits:**
- **Better Workflow Management**: Visual status tracking for all files
- **Improved Reliability**: Robust process control with proper cleanup  
- **Enhanced Performance**: Auto-detection and optimization features
- **Professional UI**: More intuitive and informative interface

### Breaking Changes
None. This release is fully backward compatible with existing workflows.

### Migration Guide
No migration steps required. Existing configurations and workflows will continue to work seamlessly.

### Known Issues
- Large datasets (>1000 individuals) may require manual memory management
- Some Windows antivirus software may flag the executable (false positive)
- macOS Gatekeeper may require manual approval for first launch

### Future Roadmap
- Auto-updater functionality
- Built-in result visualization
- Cloud processing integration
- Advanced workflow templates

---

**Full Changelog**: https://github.com/JSBarrington/ez-phase/compare/v1.1.0...v1.10.0