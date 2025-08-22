# Changelog
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
