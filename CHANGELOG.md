# Changelog
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
