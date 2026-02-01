# Contributing to ISTS Protocol

Thank you for your interest in contributing to ISTS Protocol! This document provides guidelines for contributing to the project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Browser/environment details
- Code samples if applicable

### Suggesting Features

Feature requests are welcome! Please:
- Check existing issues first
- Clearly describe the use case
- Explain why this feature would benefit users
- Provide examples if possible

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes**
4. **Test thoroughly** in multiple browsers
5. **Commit with clear messages**: `git commit -m "Add feature: description"`
6. **Push to your fork**: `git push origin feature/your-feature-name`
7. **Create a Pull Request**

### Code Style

- Use clear, descriptive variable names
- Add comments for complex logic
- Follow existing code formatting
- Keep functions focused and modular
- Maintain zero-dependency philosophy

### Testing

Before submitting:
- Test in Chrome, Firefox, Safari, and Edge
- Verify compression ratios match expectations
- Check for memory leaks with large datasets
- Ensure backward compatibility

### Documentation

- Update README.md if adding features
- Add JSDoc comments for new functions
- Update TypeScript definitions
- Include usage examples

## Development Setup

```bash
# Clone your fork
git clone https://github.com/yourusername/ists-protocol.git
cd ists-protocol

# Create a branch
git checkout -b feature/my-feature

# Make changes and test
# Open examples/text-compression.html in browser

# Commit and push
git add .
git commit -m "Description of changes"
git push origin feature/my-feature
```

## Questions?

Feel free to open an issue for any questions or clarifications.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
