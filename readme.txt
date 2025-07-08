=== WP Git Manager ===
Contributors: farzad-hoseinzadeh
Tags: git, repository, admin, version control, developer
Requires at least: 5.0
Tested up to: 6.5
Stable tag: 1.0.0
License: MIT
License URI: https://opensource.org/licenses/MIT

A powerful and user-friendly WordPress plugin to manage your Git repositories directly from the WordPress admin panel.

== Description ==
WP Git Manager lets you view, fetch, pull, and switch branches of your Git repository from the WordPress admin panel. Features include:
* View and switch branches (dropdown, sorted by last commit)
* Fetch, pull, and view last commits (author, avatar, files changed, etc.)
* Troubleshooting for Git safe.directory issues
* Server compatibility check (shell_exec, git binary, .git folder)
* Role-based access control
* Modern, responsive UI

== Installation ==
1. Upload the plugin folder to `/wp-content/plugins/` or install via the WordPress admin panel.
2. Activate the plugin through the 'Plugins' menu in WordPress.
3. Go to the 'Git Manager' menu in the admin sidebar.
4. Set your repository path and configure allowed user roles (admin only).

== Frequently Asked Questions ==
= Why does the plugin require shell_exec? =
This plugin uses shell_exec to run git commands on your server. This is required for full functionality. Only users with admin or allowed roles can access these features. Make sure your server is secure and only trusted users have access.

= Is it safe to use shell_exec? =
All inputs are sanitized and only allowed users can run commands. However، enabling shell_exec can have security implications. Use at your own risk and only on trusted servers.

== Screenshots ==
1. Git Manager admin panel
2. Branches dropdown
3. Commit log with avatars

== Changelog ==

== Upgrade Notice ==
= 1.1.0 =
First public release.

== License ==
MIT License

== Author ==
Farzad Hoseinzadeh

== GitHub ==
https://github.com/farzad-hoseinzadeh/wp-git-manager
