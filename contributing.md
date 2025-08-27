# Contributing to EZ-PHASE

Thank you for your interest in contributing to EZ-PHASE! This project aims to make haplotype phasing more accessible to the bioinformatics community through an intuitive GUI for PHASE 2.1.1.

## 🎯 Ways to Contribute

### Bug Reports
- Use the [GitHub Issues](https://github.com/JSBarrington/ez-phase/issues) page
- Include your operating system, EZ-PHASE version, and PHASE version
- Provide steps to reproduce the issue
- Include error messages and logs if available

### Feature Requests  
- Check existing issues to avoid duplicates
- Describe the use case and expected benefit
- Consider implementation complexity and user impact

### Code Contributions
- Fork the repository and create a feature branch
- Follow existing code style and patterns
- Test your changes thoroughly
- Update documentation as needed

## 🛠️ Development Setup

### Prerequisites
- Node.js 16+ and npm
- Git
- PHASE 2.1.1 binary for testing

### Getting Started
```bash
# Clone your fork
git clone https://github.com/yourusername/ez-phase.git
cd ez-phase

# Install dependencies
npm install

# Run in development mode
npm start

# Run with debugging
npm run dev
```

### Project Structure
```
ez-phase/
├── main.js              # Electron main process
├── renderer.js          # Frontend JavaScript
├── preload.js           # Secure IPC bridge
├── index.html           # Main UI
├── package.json         # Dependencies and build config
└── assets/             # Icons and static resources
```

## 🧪 Testing

### Manual Testing
- Test on multiple platforms if possible
- Verify with different PHASE input files
- Test edge cases (large files, missing data, errors)
- Ensure UI responsiveness and error handling

### Before Submitting
- [ ] Code follows existing style patterns
- [ ] No console errors or warnings
- [ ] Features work as expected
- [ ] Documentation updated if needed
- [ ] Git commits are clean and descriptive

## 📝 Code Style

### JavaScript
- Use modern ES6+ features where appropriate
- Prefer `const` and `let` over `var`
- Use meaningful variable and function names
- Add comments for complex logic

### HTML/CSS
- Follow existing styling patterns
- Use CSS custom properties for theming
- Maintain responsive design principles
- Test across different screen sizes

### Electron Best Practices
- Keep main and renderer processes properly separated
- Use IPC securely through preload scripts
- Handle process lifecycle events appropriately
- Follow Electron security guidelines

## 🚀 Pull Request Process

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Write clean, documented code
   - Test thoroughly
   - Update relevant documentation

3. **Commit Changes**
   ```bash
   git add .
   git commit -m "Add feature: brief description"
   ```

4. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then open a Pull Request on GitHub

5. **PR Requirements**
   - Clear description of changes
   - Reference any related issues
   - Include testing information
   - Update version numbers if needed

## 🐛 Reporting Security Issues

For security vulnerabilities, please email jsbarrington@github.com directly rather than creating public issues.

## 📋 Issue Templates

### Bug Report Template
```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g. macOS 12.0]
- EZ-PHASE Version: [e.g. v1.10.0]
- PHASE Version: [e.g. 2.1.1]

**Additional context**
Any other context about the problem.
```

### Feature Request Template
```markdown
**Is your feature request related to a problem?**
A clear description of what the problem is.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Any alternative solutions or features you've considered.

**Additional context**
Any other context or screenshots about the feature request.
```

## 🏷️ Release Process

Releases follow semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR**: Breaking changes
- **MINOR**: New features, backwards compatible
- **PATCH**: Bug fixes, backwards compatible

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🤝 Community Guidelines

- Be respectful and inclusive
- Help others learn and grow
- Focus on constructive feedback
- Celebrate diverse perspectives and experiences

## 📞 Questions?

- Open a [GitHub Discussion](https://github.com/JSBarrington/ez-phase/discussions)
- Check existing issues and documentation
- Email jsbarrington@github.com for project-related questions

Thank you for contributing to EZ-PHASE! 🧬