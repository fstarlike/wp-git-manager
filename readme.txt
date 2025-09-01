=== Git Manager ===
Contributors: farzad-hoseinzadeh
Tags: git, repository, admin, version control, developer
Requires at least: 5.0
Tested up to: 6.8
Stable tag: 2.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

A comprehensive and professional WordPress plugin for advanced Git repository management with enhanced security, performance, and user experience.

== Description ==
WP Git Manager v2.0.0 is a complete rewrite with modern architecture and advanced features for managing Git repositories directly from the WordPress admin panel. Key features include:

* **Multi-Repository Support**: Manage multiple repositories from a single interface
* **Advanced Repository Management**: Clone, configure, and monitor repositories with enhanced security
* **Real-time Monitoring**: Live repository status updates with visual indicators
* **Advanced Troubleshooting**: Comprehensive diagnostic system with step-by-step guidance
* **Professional UI/UX**: Modern design system with Material Design principles
* **Enhanced Security**: Improved credential management and secure storage system
* **Cross-platform Compatibility**: Enhanced support for Windows, macOS, and Linux
* **Multi-language Support**: Built-in internationalization with Persian and Chinese translations
* **API Integration**: RESTful API endpoints for external integrations
* **Backup & Recovery**: Automated backup system for repository configurations
* **Developer Tools**: Enhanced debugging and development utilities
* **Accessibility**: WCAG 2.1 compliant interface with keyboard navigation

== Installation ==
1. Upload the plugin folder to `/wp-content/plugins/` or install via the WordPress admin panel.
2. Activate the plugin through the 'Plugins' menu in WordPress.
3. Go to the 'Git Manager' menu in the admin sidebar.
4. Set your repository path and configure allowed user roles (admin only).

== Frequently Asked Questions ==
= Why does the plugin require shell_exec? =
This plugin uses shell_exec to run git commands on your server. This is **necessary and legitimate** for Git operations like clone, pull, push, and status. Git is a command-line tool that requires shell execution. All inputs are properly sanitized and only authorized administrators can access these features.

= Is it safe to use shell_exec? =
Yes, when used properly. The plugin implements comprehensive security measures:
- All user inputs are sanitized using WordPress functions
- File paths are validated to prevent directory traversal
- Only predefined Git commands are allowed
- Role-based access control restricts usage to administrators
- Nonce verification prevents CSRF attacks
- Command escaping prevents command injection

= What security measures are in place? =
- Role-based access control (admin only by default)
- Input validation and sanitization
- Nonce protection on all AJAX requests
- Path validation against ABSPATH
- Comprehensive audit logging
- Temporary SSH key storage with restricted permissions

= Is this plugin suitable for production use? =
This plugin is designed for development and staging environments where administrators have full control over the server. For production use, ensure proper server security and limit access to trusted administrators only.

== Changelog ==

= 2.0.0 =
- **Complete Plugin Redesign**: Full rewrite with modern architecture and enhanced user experience
- **Advanced Repository Management**: Multi-repository support with individual configuration and monitoring
- **Enhanced Security**: Improved credential management and secure storage system
- **Professional UI/UX**: Modern design system with Material Design principles
- **Real-time Monitoring**: Live repository status updates with visual indicators
- **Advanced Troubleshooting**: Comprehensive diagnostic system with step-by-step guidance
- **Multi-language Support**: Built-in internationalization with Persian and Chinese translations
- **Cross-platform Compatibility**: Enhanced support for Windows, macOS, and Linux environments
- **Performance Optimizations**: Improved loading times and resource management
- **Accessibility Features**: WCAG 2.1 compliant interface with keyboard navigation
- **Developer Tools**: Enhanced debugging and development utilities
- **API Integration**: RESTful API endpoints for external integrations
- **Backup & Recovery**: Automated backup system for repository configurations
- **Advanced Git Operations**: Support for complex Git workflows and commands
- **Notification System**: Comprehensive notification system with customizable alerts

= 1.4.2 =
- Enhanced Troubleshooting System with step-by-step checks and visual feedback
- Complete Dashboard Redesign with modern UI
- Path Testing Feature and enhanced validation
- Cross-platform git command builder improvements

= 1.4.1 =
- Bug fixes and minor improvements

= 1.4.0 =
- Modernized admin AJAX calls: replaced deprecated jQuery shorthand with a small fetch-based helper for more reliable, promise-based requests.
- Branch-aware notifications: the plugin tracks last-seen commits per-branch and only notifies for the currently active branch to reduce false positives.
- Refined admin top-bar design: improved badge, spinner and commit info styling for a cleaner and more professional look.
- Bug fixes: reduced incorrect "new commit" alerts when switching branches.

= 1.3.0 =
- Added "Fetch" and "Pull" actions to the WordPress admin dashboard top bar for quick repository updates.

= 1.1.0 =
- Real-time git change detection with beep and alert when new commits are detected (AJAX polling).
- Plugin logo (logo.svg) for admin menu and header.
- Custom modal and UI components with modern CSS (no Bootstrap dependency).
- Professional loading overlay and improved button/overlay logic.
- Status auto-display on page load.
- All user-facing messages are now translatable and in English.

== Upgrade Notice ==
= 2.0.0 =
**Major Update**: Complete rewrite with new architecture. Database migration required. Backup your data before upgrading.

= 1.1.0 =
First public release.

== License ==
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

== Author ==
Farzad Hoseinzadeh

== GitHub ==
https://github.com/fstarlike/wp-git-manager

== Security / Automatic Fixes ==

WP Git Manager can perform certain automatic fixes to help configure git on the server (for example: adding a repository to Git's `safe.directory`, adding host keys to `~/.ssh/known_hosts`, and adjusting file/directory permissions). These operations are potentially dangerous when run on multi-tenant or untrusted servers.

- Default behavior: Automatic fixes are disabled by default.
- Enable via Settings: Admins may enable automatic fixes from the plugin Settings page (Git Manager → Settings). This sets the option `git_manager_allow_auto_fix`.
- Enable via wp-config: Advanced users may enable auto-fix globally by adding the following to `wp-config.php` (not recommended on shared servers):

	define('GIT_MANAGER_ALLOW_AUTO_FIX', true);

When automatic fixes are disabled, the plugin will not modify files or change permissions; instead it will display clear, copyable shell commands and instructions for the site administrator to run manually.

Use this feature only on servers you trust and where you have console access or a secure way to run the suggested commands.
