# Contributing to EZ-PHASE

We love your input! We want to make contributing to EZ-PHASE as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## 🚀 Quick Start

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/JSBarrington/ez-phase.git`
3. **Install** dependencies: `npm install`
4. **Create** a branch: `git checkout -b feature/amazing-feature`
5. **Make** your changes
6. **Test** your changes: `npm start`
7. **Commit** and **push**: `git commit -m 'Add amazing feature'`
8. **Create** a Pull Request

## 🐛 Bug Reports

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/JSBarrington/ez-phase/issues/new).

**Great Bug Reports** include:

- **Summary**: Quick summary of the issue
- **Environment**: OS, Node.js version, PHASE version
- **Steps to reproduce**: Be specific!
- **Expected vs Actual behavior**: What should happen vs what actually happened
- **Screenshots**: If applicable
- **Additional context**: Logs, error messages, etc.

### Bug Report Template

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Environment:**
 - OS: [e.g. macOS 12.0, Windows 11, Ubuntu 20.04]
 - Node.js version: [e.g. 18.17.0]
 - EZ-PHASE version: [e.g. 1.0.0]
 - PHASE version: [e.g. 2.1.1]

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Additional context**
Add any other context about the problem here.
```

## 💡 Feature Requests

We welcome feature requests! Please:

1. **Check existing issues** to avoid duplicates
2. **Describe the feature** clearly
3. **Explain the use case** - why is this needed?
4. **Consider alternatives** - what other approaches exist?

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
A clear and concise description of what the problem is.

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.
```

## 🔧 Development Setup

### Prerequisites
- Node.js 16+
- Git
- PHASE 2.1.1 binary (for testing)

### Setup Steps
```bash
# Clone your fork
git clone https://github.com/JSBarrington/ez-phase.git
cd ez-phase

# Install dependencies
npm install

# Start development server
npm start

# Run tests (when available)
npm test
```

### Development Scripts
```bash
npm start          # Run the app in development mode
npm run build      # Build for production
npm run build-mac  # Build macOS DMG
npm run build-win  # Build Windows installer
npm test           # Run tests
npm run lint       # Run ESLint
```

## 📝 Code Style

We use ESLint for code style. Please ensure your code follows these guidelines:

### JavaScript Style
- Use **ES6+** features where appropriate
- **2 spaces** for indentation
- **Single quotes** for strings
- **Semicolons** at the end of statements
- **camelCase** for variables and functions
- **PascalCase** for classes and components

### Example
```javascript
const handleFileSelection = async (filePaths) => {
  try {
    const validFiles = filePaths.filter(file => file.endsWith('.inp'));
    
    if (validFiles.length === 0) {
      throw new Error('No valid .inp files found');
    }
    
    return await processFiles(validFiles);
  } catch (error) {
    console.error('File selection error:', error);
    throw error;
  }
};
```

### HTML/CSS Style
- **2 spaces** for indentation
- **kebab-case** for CSS classes
- **Semantic HTML** elements where possible
- **CSS Grid/Flexbox** for layouts

## 🧪 Testing

### Manual Testing
Before submitting a PR, please test:

1. **Installation**: Fresh `npm install` works
2. **Basic functionality**: App starts and loads correctly
3. **File selection**: Can select directories and .inp files
4. **PHASE execution**: Can run PHASE with sample data
5. **Cross-platform**: Test on your available platforms

### Automated Testing (Future)
We're planning to add:
- Unit tests with Jest
- Integration tests for PHASE execution
- E2E tests with Spectron

## 📋 Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new features (when testing framework is ready)
3. **Ensure CI passes** (when CI is set up)
4. **Update CHANGELOG.md** with your changes
5. **Request review** from maintainers

### PR Template

```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] I have tested this change manually
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing tests pass locally

## Checklist
- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have updated CHANGELOG.md
```

## 🎯 Areas We Need Help With

### High Priority
- **Testing framework** setup and tests
- **Windows compatibility** improvements
- **Linux packaging** (AppImage, snap, etc.)
- **Performance optimization** for large datasets

### Medium Priority
- **Documentation** improvements and examples
- **UI/UX enhancements** and accessibility
- **Additional PHASE features** integration
- **Internationalization** (i18n)

### Low Priority
- **Code refactoring** and cleanup
- **Additional output formats**
- **Integration** with other population genetics tools

## 🏷️ Issue Labels

We use these labels to organize issues:

- `bug` - Something isn't working
- `enhancement` - New feature or request  
- `documentation` - Improvements or additions to documentation
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention is needed
- `question` - Further information is requested
- `wontfix` - This will not be worked on

## 📞 Getting Help

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Email**: [your.email@example.com] for private matters

## 🙏 Recognition

Contributors will be recognized in:
- **README.md** Contributors section
- **GitHub contributors** page
- **CHANGELOG.md** for significant contributions

## 📄 License

By contributing, you agree that your contributions will be licensed under the same MIT License that covers the project.