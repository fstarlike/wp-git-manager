<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<div class="wrap">
	<h1><?php _e( 'Git Manager', 'git-manager' ); ?></h1>
	<form method="post" id="git-manager-form">
		<?php wp_nonce_field( 'git_manager_action', 'git_manager_nonce' ); ?>
		<label for="git_repo_path"><?php _e( 'Git Repository Path:', 'git-manager' ); ?></label>
		<input type="text" name="git_repo_path" id="git_repo_path" value="<?php echo esc_attr( get_option( 'git_manager_repo_path', '' ) ); ?>" style="width:400px;" />
		<input type="submit" class="button button-primary" value="<?php _e( 'Save Path', 'git-manager' ); ?>" />
	</form>
	<hr />
<div id="git-manager-operations">
	<button class="button" id="git-status">Status</button>
	<button class="button" id="git-fetch">Fetch</button>
<button class="button" id="git-troubleshoot">Troubleshooting</button>
	<button class="button" id="git-pull">Pull</button>
	<button class="button" id="git-branch">Branches</button>
	<button class="button" id="git-log">Show Last Commits</button>
	<?php if (current_user_can('manage_options')): ?>
		<button class="button" id="git-settings" >Settings</button>
	<?php endif; ?>
</div>
<?php if (current_user_can('manage_options')): ?>
<div id="git-manager-settings-panel" style="display:none; margin-top:20px;">
	<form method="post" id="git-manager-roles-form">
		<h3><?php _e('Allowed User Roles', 'git-manager'); ?></h3>
		<select name="git_manager_allowed_roles[]" multiple style="min-width:200px;min-height:80px;">
			<?php
			global $wp_roles;
			$roles = $wp_roles->roles;
			$allowed = get_option('git_manager_allowed_roles', ['administrator']);
			foreach ($roles as $role_key => $role) {
				echo '<option value="' . esc_attr($role_key) . '"' . (in_array($role_key, $allowed) ? ' selected' : '') . '>' . esc_html($role['name']) . '</option>';
			}
			?>
		</select>
		<button type="submit" class="button button-secondary"><?php _e('Save Roles', 'git-manager'); ?></button>
	</form>
</div>
<?php endif; ?>
	<div id="git-manager-output" style="margin-top:20px;"></div>
</div>
