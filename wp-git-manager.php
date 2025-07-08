<?php
/**
 * Plugin Name: WP Git Manager
 * Description: Professional Git repository management from WordPress admin panel with features like displaying commits, pull, fetch, branch switching and ...
 * Version: 1.0.0
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

define( 'GIT_MANAGER_VERSION', '1.0.0' );

// Load plugin textdomain for translations
function git_manager_load_textdomain() {
	load_plugin_textdomain( 'git-manager', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );
}
add_action( 'plugins_loaded', 'git_manager_load_textdomain' );

require_once GIT_MANAGER_PATH . 'includes/class-git-manager.php';
require_once GIT_MANAGER_PATH . 'includes/class-git-manager-ajax.php';

function git_manager_init() {
	return Git_Manager::get_instance();
}
git_manager_init();
