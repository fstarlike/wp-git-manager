# Security Documentation

## Overview

WP Repo Manager is a WordPress Plugin that provides Git repository management functionality. This document outlines the security measures implemented and explains why certain security decisions were made.

## Security Features

### 1. Role-Based Access Control
- Plugin access is restricted to users with specific roles (default: administrator)
- All AJAX endpoints verify user capabilities before execution
- Nonce verification on all user actions

### 2. Input Sanitization
- All user inputs are sanitized using WordPress sanitization functions
- File paths are validated to prevent directory traversal attacks
- Repository URLs are validated and sanitized

### 3. Nonce Protection
- All AJAX requests require valid nonces
- Nonces are unique per action and user session
- Nonce verification prevents CSRF attacks

## Shell Command Execution

### Why shell_exec is Used

WP Repo Manager uses `shell_exec()` to execute Git commands on the server. This is **necessary and legitimate** for the following reasons:

1. **Git Operations**: Git is a command-line tool that requires shell execution
2. **Repository Management**: Operations like clone, pull, push, status require Git CLI
3. **Cross-Platform Support**: Git commands work consistently across different operating systems

### Security Measures for Shell Commands

1. **Command Validation**: Only predefined Git commands are allowed
2. **Path Validation**: All repository paths are validated against ABSPATH
3. **User Input Sanitization**: All inputs are sanitized before shell execution
4. **Role Restrictions**: Only authorized users can execute commands
5. **Command Escaping**: All user inputs are properly escaped using `escapeshellarg()`

### Example of Safe Command Execution

```php
// Safe command construction
$cmd = 'git -C ' . escapeshellarg($repoPath) . ' ' . $gitArgs . ' 2>&1';
$out = shell_exec($cmd);
```

### Security Considerations

1. **Server Environment**: This plugin should only be used on trusted servers
2. **User Access**: Limit access to trusted administrators only
3. **File Permissions**: Ensure proper file permissions on repository directories
4. **SSH Keys**: SSH keys are stored temporarily with restricted permissions (0600)

## Best Practices for Users

1. **Server Security**: Use on trusted, secure servers only
2. **User Management**: Limit Plugin access to necessary administrators
3. **Regular Updates**: Keep the Plugin updated to latest version
4. **Audit Logs**: Monitor Plugin activity logs regularly
5. **Backup**: Regularly backup repository configurations

## Compliance with WordPress Guidelines

This Plugin complies with WordPress Plugin Directory guidelines:

- ✅ **GPL License**: Uses GPLv2 or later license
- ✅ **No Trialware**: All functionality is available without payment
- ✅ **No User Tracking**: No external analytics or tracking
- ✅ **Code Quality**: Well-structured, readable code
- ✅ **Security**: Proper input validation and sanitization
- ✅ **Documentation**: Comprehensive security documentation

## Reporting Security Issues

If you discover a security vulnerability, please:

1. **Do not** disclose it publicly
2. **Email** security details to: fstarlike@gmail.com
3. **Include** detailed reproduction steps
4. **Allow** reasonable time for response and fix

## Version History

- **2.0.0**: Enhanced security with improved input validation and role-based access control
- **1.4.2**: Added comprehensive security measures and audit logging
- **1.1.0**: Initial security implementation with nonce protection

---

**Note**: This Plugin is designed for development and staging environments where administrators have full control over the server. Use with appropriate caution in production environments.
