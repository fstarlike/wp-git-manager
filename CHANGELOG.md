# Changelog

## [2.0.0] - 2025-01-27
### Added
- **Complete Plugin Redesign**: Full rewrite with modern architecture and enhanced user experience
- **Advanced Repository Management**: Multi-repository support with individual configuration and monitoring
  - Repository cloning with URL validation and authentication
  - Repository cards with visual status indicators and quick actions
  - Branch management with conflict resolution
  - Real-time repository status updates with visual indicators
  - Commit history with diff visualization
  - Remote repository configuration and management
  - Tag management (create, delete, manage Git tags)
  - Stash operations with visual interface
- **Enhanced Security**: Improved credential management and secure storage system
  - Encrypted credential storage
  - Role-based access control
  - Comprehensive input validation and sanitization
  - Audit logging for security monitoring
- **Professional UI/UX**: Modern design system with Material Design principles
  - Clean, organized dashboard with sidebar navigation
  - Responsive modals with proper focus management
  - Dark/Light theme switching with system preference detection
  - Professional color palette with semantic meaning
  - Smooth, purposeful animations
  - WCAG 2.1 compliant accessibility features
- **Advanced Troubleshooting**: Comprehensive diagnostic system with step-by-step guidance
  - 10 comprehensive troubleshooting steps
  - Real-time progress tracking with animated progress bar
  - Visual status indicators (success, warning, error)
  - Expandable step details with solutions and recommendations
  - Summary report with statistics and actionable recommendations
  - Path testing feature for different repository paths
  - Enhanced path validation and status logic
- **Multi-language Support**: Built-in internationalization with Persian and Chinese translations
  - Complete Persian (fa_IR) translation
  - Complete Chinese (zh) translation
  - Automatic language detection based on WordPress settings
  - RTL support for Persian language
- **Cross-platform Compatibility**: Enhanced support for Windows, macOS, and Linux environments
  - Cross-platform git command builder
  - Safer HOME resolution for Windows and POSIX environments
  - Improved permission and ownership handling
- **Performance Optimizations**: Improved loading times and resource management
  - Optimized database queries
  - Efficient asset loading and caching
  - Lazy loading for better performance
  - Smart DOM updates and animations
- **Developer Tools**: Enhanced debugging and development utilities
  - Comprehensive error logging
  - Development mode features
  - Enhanced debugging capabilities
- **API Integration**: RESTful API endpoints for external integrations
  - Multi-repository AJAX endpoints
  - Secure nonce-based authentication
  - JSON response format
- **Backup & Recovery**: Automated backup system for repository configurations
  - Repository configuration backup
  - Settings persistence
  - Recovery mechanisms
- **Notification System**: Comprehensive notification system with customizable alerts
  - Real-time change detection with audio alerts
  - Customizable notification preferences
  - Visual and audio feedback
- **Floating Widget**: Global floating widget for quick repository access
  - Available on all admin pages
  - Quick repository status check
  - Fast access to common operations
- **Settings Management**: Comprehensive settings interface
  - Role-based access control settings
  - Repository path configuration
  - Auto-fix settings for troubleshooting
  - Notification preferences

### Changed
- **Architecture Overhaul**: Complete restructuring for better maintainability and scalability
  - PSR-12 compliant code structure
  - Modern PHP practices and patterns
  - Organized file structure with clear separation of concerns
- **Code Quality**: PSR-12 compliance and modern PHP practices
  - Consistent coding standards
  - Improved code readability
  - Better error handling
- **Security Model**: Enhanced permission system and access controls
  - Role-based permissions
  - Secure credential storage
  - Input validation and sanitization
- **User Interface**: Complete redesign with modern, responsive layout
  - Material Design principles
  - Responsive design for all devices
  - Improved accessibility
- **Performance**: Optimized database queries and asset loading
  - Efficient resource management
  - Smart caching strategies
  - Reduced loading times
- **Compatibility**: Improved WordPress version compatibility and plugin integration
  - WordPress 5.0+ compatibility
  - Tested up to WordPress 6.4
  - PHP 7.4+ requirement

### Fixed
- **Security Vulnerabilities**: Addressed potential security issues in previous versions
  - Secure nonce validation
  - Input sanitization
  - XSS prevention
- **Cross-platform Issues**: Resolved compatibility problems across different operating systems
  - Windows-specific fixes
  - POSIX compatibility improvements
  - Path handling enhancements
- **Performance Bottlenecks**: Optimized slow operations and improved responsiveness
  - Database query optimization
  - Asset loading improvements
  - Caching enhancements
- **UI/UX Issues**: Fixed interface inconsistencies and improved user experience
  - Consistent styling across components
  - Improved responsive design
  - Better accessibility features
- **Database Issues**: Resolved data integrity and storage problems
  - Improved data persistence
  - Better error handling
  - Data validation enhancements

### Breaking Changes
- **Database Schema**: Updated database structure requires migration from v1.x
  - New table structure for multi-repository support
  - Enhanced settings storage
  - Improved data organization
- **API Changes**: Modified REST API endpoints and response formats
  - New AJAX endpoints for multi-repository support
  - Updated response formats
  - Enhanced error handling
- **Configuration**: New configuration format incompatible with previous versions
  - New settings structure
  - Enhanced configuration options
  - Improved default values
- **File Structure**: Reorganized plugin file structure for better organization
  - New directory structure
  - Improved file organization
  - Better maintainability

## [1.4.2] - 2025-01-XX
### Added
- **Enhanced Troubleshooting System**: Complete redesign of the troubleshooting interface with step-by-step checks, visual feedback, and modern UI
  - Dedicated troubleshooting submenu for better organization
  - 10 comprehensive troubleshooting steps covering repository path, Git binary, SSH setup, permissions, and more
  - Real-time progress tracking with animated progress bar
  - Visual status indicators (success, warning, error) for each step
  - Expandable step details with solutions and recommendations
  - Summary report with statistics and actionable recommendations
  - Modern, responsive design with smooth animations
  - Stop/Reset functionality for better user control
  - **Path Testing Feature**: Test different repository paths without changing settings
  - **Current Path Display**: Shows the currently configured repository path
  - **Enhanced Path Validation**: Checks if directory is actually a Git repository (.git folder)
  - **Improved Status Logic**: Better error/warning/success status classification for more accurate troubleshooting results
  - **Fixed Frontend Status Display**: Correctly displays error/warning/success status from backend responses
  - **Improved Summary Stats Styling**: Enhanced CSS specificity and responsive design for consistent stat item display
  - **Complete Dashboard Redesign**: Modern, beautiful UI matching troubleshooting page design with gradients, improved colors, and better layout
  - **Enhanced Commits List Design**: Beautiful, modern styling for commit history with hover effects, proper spacing, and responsive design
- Cross-platform git command builder and safer HOME resolution for Windows and POSIX environments.
- Settings page to control "automatic fixes" and a persisted admin option to enable safe auto-fixes.
### Changed
- Hardened troubleshooting and auto-fix behavior: clearer guidance, safer write attempts to .git/config, and Windows-specific instructions when auto-fix is disabled.
- Modernized AJAX/JS behavior (fetch helpers, credentials binding, per-action nonces) and refined admin UI styles.
- Improved branch detection and default branch identification when listing branches.
### Fixed
- Detect and attempt to auto-resolve common git errors (dubious ownership, missing committer identity) and provide actionable manual commands when auto-fix is disabled.
- Various permission/ownership handling improvements and safer file writes.

## [1.4.1] - 2025-08-25

## [1.4.0] - 2025-08-23
### Added
- Improved admin styles and refined UI behavior and component spacing
- Modernized admin AJAX calls: replaced deprecated jQuery shorthand with a small fetch-based helper for more reliable, promise-based requests.
### Changed
- Branch-aware change detection: the plugin now tracks the last seen commit per-branch and only notifies when the currently active branch has remote changes.
- Admin top-bar visual redesign: refined styling for the admin bar badge, spinner and commit info for a cleaner, professional look.
### Fixed
- Minor tweaks and cleanup from quick fixes and adjustments.
- Reduced false-positive "new commit" alerts that previously appeared when switching branches or when other branches updated.

## [1.3.0] - 2025-08-11
### Fixed
- Reformatted PHP files to follow PSR-12 and modern array syntax.
- Improved code readability and consistency across plugin files.
- Enhanced admin UI markup and styles for better maintainability.
- Updated AJAX logic for more robust commit and branch handling.
- Fixed minor issues in admin bar integration and asset loading.

## [1.2.0] - 2025-07-14
### Added
- "Fetch" and "Pull" actions to the WordPress admin dashboard top bar for quick repository updates.

## [1.1.0] - 2025-07-09
### Added
- Real-time git change detection with beep and alert when new commits are detected (AJAX polling).
- Plugin logo (logo.svg) for admin menu and header.
- Custom modal and UI components with modern CSS (no Bootstrap dependency).
- Professional loading overlay and improved button/overlay logic.
- Status auto-display on page load.
- All user-facing messages are now translatable and in English.

### Changed
- Improved output logic for all repository states (no path, not a git repo, valid repo).
- Enhanced troubleshooting output and status display.
- Refactored and cleaned up JavaScript for better UX and maintainability.
- Beep sound path fixed for reliable playback.
- Menu icon size enforced globally in WP admin.

### Fixed
- Removed duplicate/conflicting JS code.
- Fixed issues with alert display and output overwriting.
- Improved compatibility with Windows and cross-platform git log parsing.

---

Full details in the plugin repository.
