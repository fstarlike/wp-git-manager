<?php
if (! defined('ABSPATH')) {
    exit;
}
?>


<!-- Last Commit Info Box -->
<div id="git-last-commit" class="git-last-commit" style="display:none;"></div>

<div class="wrap">
	<h1>
		<img src="<?php echo plugin_dir_url(__FILE__); ?>logo.svg"
			alt="Git Manager Logo" style="height:36px;vertical-align:middle;margin-right:8px;">
		<?php _e('WP Git Manager', 'git-manager'); ?>
	</h1>
	<form method="post" id="git-manager-form">
		<?php wp_nonce_field('git_manager_action', 'git_manager_nonce'); ?>
		<label for="git_repo_path"><i class="fa-solid fa-folder-tree"></i>
			<?php _e('Git Repository Path:', 'git-manager'); ?></label>
		<input type="text" name="git_repo_path" id="git_repo_path"
			value="<?php echo esc_attr(realpath(get_option('git_manager_repo_path', ''))); ?>" />
		<button type="submit" class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i>
			<?php _e('Save Path', 'git-manager'); ?></button>
	</form>

	<!-- Loading Overlay -->
	<div id="git-manager-loading-overlay">
		<div id="git-manager-loading-box">
			<div class="spinner-border" role="status"></div>
			<div class="loading-text">
				<?php _e('Loading, please wait...', 'git-manager'); ?>
			</div>
		</div>
	</div>
	<div id="git-manager-operations">
		<button class="btn" id="git-status"><i class="fa-solid fa-magnifying-glass-chart"></i> Status</button>
		<button class="btn" id="git-fetch"><i class="fa-solid fa-download"></i> Fetch</button>
		<button class="btn" id="git-troubleshoot"><i class="fa-solid fa-bug"></i> Troubleshooting</button>
		<button class="btn" id="git-pull"><i class="fa-solid fa-arrow-down"></i> Pull</button>
		<button class="btn" id="git-branch"><i class="fa-solid fa-code-branch"></i> Branches</button>
		<button class="btn" id="git-log"><i class="fa-solid fa-clock-rotate-left"></i> Show Last Commits</button>
	<?php if (current_user_can('manage_options')) { ?>
	<a class="btn" id="git-settings" href="<?php echo admin_url('admin.php?page=git-manager-settings'); ?>"><i class="fa-solid fa-gear"></i> Settings</a>

	</div>
	<?php } ?>
	<div id="git-manager-output" class="alert alert-info d-flex justify-content-between align-items-center"
		style="margin-top:20px;">
		<span id="git-manager-output-content"></span>
		<span class="text-muted small wp-git-manager-version-text" style="font-family:monospace;">WP Git Manager
			v<?php echo defined('GIT_MANAGER_VERSION') ? GIT_MANAGER_VERSION : '1.0.0'; ?></span>
	</div>
</div>