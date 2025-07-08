# WP Git Manager
A free and user-friendly WordPress plugin to manage your Git repositories directly from the WordPress admin panel.

## Version
**v1.0.0 (Stable)**

## Features
- View and switch branches (with dropdown, sorted by last commit)
- Fetch, pull, and view last commits (with author, avatar, files changed, etc.)
- Manual and automatic handling of Git safe.directory issues
- Status check for server compatibility (shell_exec, git binary, .git folder)
- Role-based access control (only allowed user roles can access the plugin)
- Modern, responsive UI for easy Git operations

## Installation
1. Upload the plugin folder to `/wp-content/plugins/` or install via the WordPress admin panel.
2. Activate the plugin through the 'Plugins' menu in WordPress.
3. Go to the 'Git Manager' menu in the admin sidebar.
4. Set your repository path and configure allowed user roles (admin only).

## Usage
- Use the dashboard to fetch, pull, view branches, and see the latest commits.
- Only users with allowed roles (set by admin) can access the plugin.
- Use the 'Status' button to check if your server supports all required features.

## Requirements
- PHP 7.2+
- WordPress 5.0+
- `shell_exec` enabled and `git` installed on the server for full functionality

## Screenshots
<!-- Add screenshots here after uploading to GitHub -->

## License
MIT

## Author
Farzad Hoseinzadeh

## GitHub Repository
https://github.com/farzad-hoseinzadeh/wp-git-manager
