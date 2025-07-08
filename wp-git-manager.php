<?php
/**
 * Plugin Name: WP Git Manager
 * Description: Professional Git repository management from WordPress admin panel with features like displaying commits, pull, fetch, branch switching and ...
 * Version: 1.1.0
 * Author: Farzad Hoseinzadeh
 * Author URI: https://github.com/fstarlike
 * Text Domain: git-manager
 * Domain Path: /languages
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'GIT_MANAGER_PATH', plugin_dir_path( __FILE__ ) );
define( 'GIT_MANAGER_URL', plugin_dir_url( __FILE__ ) );


define( 'GIT_MANAGER_VERSION', '1.1.0' );

// Enqueue modern admin styles and FontAwesome for plugin admin pages

function git_manager_enqueue_admin_assets($hook) {
	// Adjust admin menu icon size
	wp_add_inline_style( 'admin-menu', '
		.toplevel_page_git-manager > .wp-menu-image > img {
			width: 25px !important;
			height: auto !important;
			padding: 0 !important;
			padding-top: 5px !important;
		}
	');

	if (strpos($hook, 'git-manager') === false) return;
	wp_enqueue_style('git-manager-modern', plugin_dir_url(__FILE__) . 'admin/admin-modern.css', [], GIT_MANAGER_VERSION);
	wp_enqueue_style('fontawesome', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css', [], '6.4.0');
	// Bootstrap JS (for modal, etc)
	wp_enqueue_script('bootstrap-js', 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js', ['jquery'], '5.3.0', true);
	// Enqueue logo.svg as a resource (for menu icon)
	wp_register_style('git-manager-logo', false);
	wp_enqueue_style('git-manager-logo');
}
add_action('admin_enqueue_scripts', 'git_manager_enqueue_admin_assets');

// Add logo.svg to admin menu
add_action('admin_menu', function() {
	global $menu;
	foreach ($menu as $k => $item) {
		if (isset($item[2]) && strpos($item[2], 'git-manager') !== false) {
			$menu[$k][6] = plugin_dir_url(__FILE__) . 'admin/logo.svg';
		}
	}
}, 100);

// Load plugin textdomain for translations
function git_manager_load_textdomain() {
	load_plugin_textdomain( 'git-manager', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );
}
add_action( 'plugins_loaded', 'git_manager_load_textdomain' );


require_once GIT_MANAGER_PATH . 'includes/class-git-manager.php';
require_once GIT_MANAGER_PATH . 'includes/class-git-manager-ajax.php';

// Register AJAX endpoint for git change check
add_action('wp_ajax_git_manager_check_git_changes', function() {
	$ajax = new Git_Manager_Ajax();
	$ajax->check_git_changes();
});

function git_manager_init() {
	return Git_Manager::get_instance();
}
git_manager_init();
