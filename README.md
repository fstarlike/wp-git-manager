# WP Git Manager
A free and user-friendly WordPress plugin to manage your Git repositories directly from the WordPress admin panel.

## Version

**1.2.0 (Stable)**

## Features

- View and switch branches (dropdown, sorted by last commit)
- Fetch, pull, and view last commits (author, avatar, files changed, etc.)
- Troubleshooting for Git safe.directory issues (manual and automatic)
- Server compatibility check (shell_exec, git binary, .git folder)
- Role-based access control
- Modern, responsive UI

## Installation

1. Upload the plugin folder to `/wp-content/plugins/` or install via the WordPress admin panel.
2. Activate the plugin through the 'Plugins' menu in WordPress.
3. Go to the 'Git Manager' menu in the admin sidebar.
4. Set your repository path and configure allowed user roles (admin only).

## Usage

- Use the dashboard to fetch, pull, switch branches, and view the latest commits.
- Only users with allowed roles (set by admin) can access the plugin.
- Use the 'Status' button to check if your server supports all required features.

## Requirements

- PHP 7.2 or higher
- WordPress 5.0 or higher
- `shell_exec` enabled and `git` installed on the server

## License

MIT License

## Author

Farzad Hoseinzadeh

## GitHub Repository
https://github.com/fstarlike/wp-git-manager