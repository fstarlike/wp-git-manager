# Contributing to WP Git Manager

## Overview

WP Repo Manager is an open-source WordPress Plugin licensed under the GNU General Public License v2 or later. We welcome contributions from the community!

## License

This project is licensed under the **GPL v2 or later**. By contributing, you agree that your contributions will be licensed under the same license.

### What this means:
- You can use, modify, and distribute this software
- You can use it in commercial projects
- You must share any modifications under the same license
- You must include the original license and copyright notices

## How to Contribute

### 1. Reporting Issues
- Use the GitHub issue tracker
- Include detailed reproduction steps
- Specify your environment (WordPress version, PHP version, etc.)
- Include error logs if applicable

### 2. Feature Requests
- Describe the feature clearly
- Explain why it would be useful
- Consider if it fits the Plugin's scope

### 3. Code Contributions
- Fork the repository
- Create a feature branch
- Follow WordPress coding standards
- Include tests if applicable
- Submit a pull request

## Development Setup

### Requirements
- WordPress 5.0+
- PHP 7.4+
- Git installed on server
- Composer (for development dependencies)

### Local Development
1. Clone the repository
2. Install dependencies: `composer install`
3. Activate the plugin in WordPress
4. Make your changes
5. Test thoroughly

## Coding Standards

### PHP
- Follow [WordPress Coding Standards](https://developer.wordpress.org/coding-standards/wordpress-coding-standards/php/)
- Use PSR-4 autoloading
- Include proper documentation blocks
- Sanitize all user inputs

### JavaScript
- Use ES6+ features
- Follow WordPress JavaScript standards
- Include proper error handling
- Use WordPress i18n functions

### CSS
- Use BEM methodology
- Follow WordPress CSS standards
- Ensure accessibility compliance
- Support RTL languages

## Security Guidelines

### Input Validation
- Always sanitize user inputs
- Validate file paths against ABSPATH
- Use WordPress nonces for forms
- Escape output properly

### Shell Commands
- Only execute predefined Git commands
- Escape all user inputs with `escapeshellarg()`
- Validate repository paths
- Log all shell executions

## Testing

### Manual Testing
- Test on different WordPress versions
- Test on different PHP versions
- Test on different operating systems
- Test with various Git configurations

### Automated Testing
- Unit tests for core functions
- Integration tests for AJAX endpoints
- Security tests for input validation
- Performance tests for large repositories

## Release Process

### Version Numbering
- Follow semantic versioning (MAJOR.MINOR.PATCH)
- Update version in all relevant files
- Update changelog with detailed information
- Tag releases in Git

### Documentation Updates
- Update README.md with new features
- Update readme.txt for WordPress.org
- Update SECURITY.md if security changes
- Update CONTRIBUTING.md if needed

## Community Guidelines

### Be Respectful
- Treat all contributors with respect
- Provide constructive feedback
- Help newcomers get started
- Follow the WordPress community guidelines

### Communication
- Use clear, descriptive language
- Provide context for suggestions
- Ask questions when unsure
- Share knowledge and experiences

## Getting Help

### Resources
- [WordPress Developer Documentation](https://developer.wordpress.org/)
- [Git Documentation](https://git-scm.com/doc)
- [Plugin Development Handbook](https://developer.wordpress.org/plugins/)

### Support
- GitHub Issues for bug reports
- GitHub Discussions for questions
- Email: fstarlike@gmail.com

## Recognition

Contributors will be recognized in:
- Plugin changelog
- README.md contributors section
- Release notes
- Plugin header (for significant contributions)

---

Thank you for contributing to WP Git Manager! Your contributions help make this plugin better for everyone in the WordPress community.
