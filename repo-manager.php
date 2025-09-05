<?php

use WPGitManager\Admin\GitManager;
use WPGitManager\Controller\MultiRepoAjax;
use WPGitManager\Infrastructure\Autoloader;
use WPGitManager\View\Components\FloatingWidget;

/**
 * Plugin Name: WP Repo Manager for Git
 * Description: Professional Git repository management for WordPress with a modern, accessible design system.
 * Version: 2.0.0
 * Author: Farzad Hoseinzadeh
 * Author URI: https://github.com/fstarlike
 * Text Domain: repo-manager
 * Domain Path: /languages
 * Requires at least: 5.0
 * Tested up to: 6.8
 * Requires PHP: 7.4
 * Network: true
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 *
 * @package WP_Git_Manager
 *
 * @author Farzad Hoseinzadeh
 * @license GPL v2 or later
 *
 * @link https://github.com/fstarlike/repo-manager
 *
 * WP Repo Manager is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * any later version.
 *
 * WP Repo Manager is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with WP Git Manager. If not, see https://www.gnu.org/licenses/gpl-2.0.html.
 */
if (! defined('ABSPATH')) {
    exit;
}

define('GIT_MANAGER_PATH', plugin_dir_path(__FILE__));
define('GIT_MANAGER_URL', plugin_dir_url(__FILE__));
define('GIT_MANAGER_VERSION', '2.0.0');

if (! defined('GIT_MANAGER_ALLOW_AUTO_FIX')) {
    define('GIT_MANAGER_ALLOW_AUTO_FIX', false);
}

if (file_exists(GIT_MANAGER_PATH . 'vendor/autoload.php')) {
    require_once GIT_MANAGER_PATH . 'vendor/autoload.php';
} else {
    require_once GIT_MANAGER_PATH . 'src/Infrastructure/Autoloader.php';
    $autoloader = new Autoloader(GIT_MANAGER_PATH . 'src');
    $autoloader->register();
}

function git_manager_enqueue_global_checker($hook)
{
    // Don't load on Git Manager's own pages
    if (false !== strpos($hook, 'repo-manager')) {
        return;
    }

    $allowed    = get_option('git_manager_allowed_roles', ['administrator']);
    $user       = wp_get_current_user();
    $has_access = false;
    foreach ($user->roles as $role) {
        if (in_array($role, $allowed)) {
            $has_access = true;
            break;
        }
    }

    if ($has_access) {
        // Check if floating widget is enabled
        $floating_widget_enabled = get_option('git_manager_floating_widget_enabled', 1);

        if ($floating_widget_enabled) {
            // Floating Widget Assets for all admin pages
            wp_enqueue_style('repo-manager-floating-widget', GIT_MANAGER_URL . 'src/Assets/css/floating-widget.css', [], GIT_MANAGER_VERSION);
            wp_enqueue_script('repo-manager-floating-widget', GIT_MANAGER_URL . 'src/Assets/js/floating-widget.js', ['wp-i18n'], GIT_MANAGER_VERSION, true);

            // Global variables for floating widget
            wp_localize_script('repo-manager-floating-widget', 'WPGitManagerGlobal', [
                'beepUrl'       => GIT_MANAGER_URL . 'src/Assets/audio/beep.mp3',
                'ajaxurl'       => admin_url('admin-ajax.php'),
                'action_nonces' => [
                    'git_manager_latest_commit'     => wp_create_nonce('git_manager_latest_commit'),
                    'git_manager_fetch'             => wp_create_nonce('git_manager_fetch'),
                    'git_manager_pull'              => wp_create_nonce('git_manager_pull'),
                    'git_manager_get_branches'      => wp_create_nonce('git_manager_get_branches'),
                    'git_manager_status'            => wp_create_nonce('git_manager_status'),
                    'git_manager_checkout'          => wp_create_nonce('git_manager_checkout'),
                    'git_manager_get_repos'         => wp_create_nonce('git_manager_get_repos'),
                    'git_manager_troubleshoot_step' => wp_create_nonce('git_manager_troubleshoot_step'),
                ],
            ]);
            wp_localize_script('repo-manager-floating-widget', 'gitManagerNonce', [
                'nonce'                 => wp_create_nonce('git_manager_action'),
                'git_manager_get_repos' => wp_create_nonce('git_manager_get_repos'),
            ]);
        }
    }
}

add_action('admin_enqueue_scripts', 'git_manager_enqueue_global_checker', 1);

function git_manager_enqueue_admin_assets($hook)
{
    wp_add_inline_style('admin-menu', '
		.toplevel_page_repo-manager > .wp-menu-image > img {
			width: 25px !important;
			height: auto !important;
			padding: 0 !important;
			padding-top: 5px !important;
		}
	');

    if (false === strpos($hook, 'repo-manager')) {
        return;
    }

    $allowed    = get_option('git_manager_allowed_roles', ['administrator']);
    $user       = wp_get_current_user();
    $has_access = false;
    foreach ($user->roles as $role) {
        if (in_array($role, $allowed)) {
            $has_access = true;
            break;
        }
    }

    if ($has_access) {
        // Note: repo-manager-global script is already enqueued in git_manager_enqueue_global_checker()
        // No need to enqueue it again here
    }

    // Note: admin.css is already enqueued in GitManager.php and Dashboard.php
    // No need to enqueue it here to avoid duplication
    // wp_enqueue_script('bootstrap-js', 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js', ['jquery'], '5.3.0', true);

    wp_register_style('repo-manager-logo', false, [], GIT_MANAGER_VERSION);
    wp_enqueue_style('repo-manager-logo');
}

add_action('admin_enqueue_scripts', 'git_manager_enqueue_admin_assets');

// Add floating widget to all admin pages
add_action('admin_footer', function () {
    $screen = get_current_screen();
    if ($screen && false !== strpos($screen->id, 'repo-manager')) {
        return;
    }

    // Check if floating widget is enabled
    $floating_widget_enabled = get_option('git_manager_floating_widget_enabled', 1);
    if (!$floating_widget_enabled) {
        return;
    }

    if (class_exists(FloatingWidget::class)) {
        FloatingWidget::render();
    }
});

add_action('admin_menu', function () {
    global $menu;
    foreach ($menu as $k => $item) {
        if (isset($item[2]) && false !== strpos($item[2], 'repo-manager')) {
            $menu[$k][6] = GIT_MANAGER_URL . 'src/Assets/images/logo.svg';
        }
    }
}, 100);

// WordPress automatically loads translations for plugins hosted on WordPress.org
// No need to manually call load_plugin_textdomain() since WordPress 4.6

add_action('init', function () {
    if (is_admin() && class_exists(MultiRepoAjax::class)) {
        (new MultiRepoAjax())->register();
    }
});

function git_manager_init()
{
    return GitManager::get_instance();
}

git_manager_init();
