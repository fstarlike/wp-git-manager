# Git Manager v2.0.0 – Professional Git Management for WordPress

**Git Manager** is a WordPress plugin that brings full Git repository management right into your dashboard. Version 2.0.0 is a complete rewrite – faster, more secure, and packed with a clean, modern UI that makes working with Git inside WordPress feel natural.

---

## 🚀 What’s Inside?

### Advanced Repository Management

* Manage multiple repositories from one place
* **Clone new repositories** with URL validation and authentication
* Quick visual cards showing repository status
* Switch branches easily (with conflict checks)
* Full commit history with diff previews
* Remote configuration for push/pull
* Tag and stash management with an intuitive interface

### Modern UI & Security

* Clean dashboard with sidebar navigation
* Responsive modals that behave properly (no weird glitches)
* Notification system with customizable alerts
* Smooth loading animations and progress indicators
* **Keyboard shortcuts** for power users
* Secure credential storage
* Role-based access control
* Full activity logs for audits

### Great UX & Performance

* Light/Dark theme support with auto-detect
* Mobile-friendly design that actually works well on phones
* Accessibility built-in (screen reader and keyboard friendly)
* Optimized for speed (lazy loading, minimal overhead)
* Built-in troubleshooting guide with real fixes
* Automatic backup of your repository settings
* REST API for external integrations

### Floating Widget

* Always available across all WordPress admin screens
* Quick view of repo status without leaving the page
* Instant access to common Git actions
* Real-time updates right in the widget

---

## 📋 Requirements

* **WordPress:** 5.0+
* **PHP:** 7.4+
* **Git:** Installed and available on the server
* Write permissions for the plugin and repository directories

---

## 🔧 Getting Started

1. Download and install the plugin
2. Activate it from your WordPress dashboard
3. Go to **Git Manager → Settings** and set your repository paths
4. Test the connection and start managing your Git workflow

---

## 🌐 Language & RTL Support

* English (default)
* Persian (with full RTL support)
* Chinese
  Layouts adjust automatically for right-to-left languages.

---

## 📱 Responsive by Design

* **Desktop:** Full dashboard with all tools
* **Tablet:** Optimized touch-friendly layout
* **Mobile:** Simplified interface for quick actions

---

## 🎯 Why You’ll Love It

* Easy setup, no complicated steps
* Clear visual feedback for every action
* Built-in help and troubleshooting
* Workflow optimized for real developers

---

## 🔒 Security Matters

* **Comprehensive Security**: Role-based access control, input validation, and sanitization
* **Shell Command Safety**: All Git commands are properly escaped and validated
* **Access Control**: Restricted to administrators only with configurable role permissions
* **Audit Logging**: Detailed logs for all repository operations and security events
* **Nonce Protection**: CSRF protection on all AJAX requests
* **Path Validation**: Prevents directory traversal attacks
* **SSH Key Security**: Temporary storage with restricted permissions (0600)

**Note**: This plugin uses `shell_exec()` for legitimate Git operations. All inputs are sanitized and commands are properly escaped. See [SECURITY.md](SECURITY.md) for detailed security information.

---

## 🛠 Troubleshooting Made Simple

* Step-by-step diagnostics for common issues
* Real-time progress updates
* One-click auto-fixes for most problems

---

## 🔌 API Ready

* REST endpoints for multi-repo operations
* JSON responses with detailed error handling
* Secure, nonce-based authentication

---

## 📚 Documentation

You’ll find:

* Setup guides
* User tutorials
* API docs
* Troubleshooting tips

---

## 🐛 Reporting Issues

* Check the built-in troubleshooting first
* Review the documentation
* Open an issue on the repository with environment details

---

## 📄 License

GPLv2 or later

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 2 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301  USA

Copyright (c) 2025 Farzad Hoseinzade

---

## 🙏 Thanks To

* Material Design for design principles
* GitHub Desktop & GitLab for UI inspiration
* WordPress for the integration standards
* The community for feedback and testing