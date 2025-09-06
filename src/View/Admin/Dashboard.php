<?php

namespace WPGitManager\View\Admin;

use WPGitManager\Infrastructure\RTLSupport;
use WPGitManager\Admin\GitManager;
use WPGitManager\View\Components\AddRepository;
use WPGitManager\View\Components\Header;
use WPGitManager\View\Components\RepositoryDetail;
use WPGitManager\View\Components\Sidebar;
use WPGitManager\View\Components\Troubleshoot;
use WPGitManager\View\Components\WelcomeScreen;

class Dashboard
{
    private $header;

    private $sidebar;

    private $welcomeScreen;

    private $addRepository;

    private $repositoryDetail;

    private $troubleshoot;

    public function __construct()
    {
        $this->header           = new Header();
        $this->sidebar          = new Sidebar();
        $this->welcomeScreen    = new WelcomeScreen();
        $this->addRepository    = new AddRepository();
        $this->repositoryDetail = new RepositoryDetail();
        $this->troubleshoot     = new Troubleshoot();
    }

    public function render()
    {
        if (! defined('ABSPATH')) {
            exit;
        }

        $this->enqueueAssets();

        ?>
        <div class="wrap" <?php echo esc_attr(RTLSupport::getRTLWrapperAttributes()); ?>>
            <?php
            $this->header->render();
        ?>

            <div class="repo-manager-dashboard">
                <?php
            $this->sidebar->render();
        ?>

                <div class="git-repo-content">
                    <?php if (! GitManager::are_commands_enabled()) { ?>
                    <div class="repo-manager-commands-modal-overlay" id="gm-commands-modal-overlay">
                        <div class="repo-manager-commands-modal" role="dialog" aria-modal="true" aria-labelledby="gm-commands-modal-title">
                            <div class="repo-manager-commands-modal-header">
                                <h3 id="gm-commands-modal-title"><?php echo esc_html__('Command execution is disabled', 'repo-manager'); ?></h3>
                                <button type="button" class="gm-modal-close" id="gm-commands-close-btn" aria-label="<?php echo esc_attr__('Close', 'repo-manager'); ?>">×</button>
                            </div>
                            <div class="repo-manager-commands-modal-body">
                                <p><?php echo esc_html__('To use Repo Manager features (fetch, pull, push, status), you need to enable command execution. Go to Settings → Command Execution and turn it on. Only enable this on trusted servers, as it allows the plugin to run git commands on your server.', 'repo-manager'); ?></p>
                            </div>
                            <div class="repo-manager-commands-modal-footer">
                                <a class="git-action-btn" id="gm-commands-open-settings" href="<?php echo esc_url(admin_url('admin.php?page=repo-manager-settings')); ?>"><?php echo esc_html__('Open Settings', 'repo-manager'); ?></a>
                                <button type="button" class="git-action-btn git-secondary-btn" id="gm-commands-dismiss-btn"><?php echo esc_html__('Close', 'repo-manager'); ?></button>
                            </div>
                        </div>
                    </div>
                    <?php } ?>
                    <?php
            $this->welcomeScreen->render();
        $this->addRepository->render();
        $this->repositoryDetail->render();
        $this->troubleshoot->render();
        ?>
                </div>
            </div>
        </div>
        <?php
    }

    private function enqueueAssets()
    {
        // Note: admin.css and admin.js are already enqueued in GitManager.php
        // No need to enqueue them again here to avoid duplication

        // Note: repo-manager-global.js is already enqueued in repo-manager.php
        // No need to enqueue it again here to avoid duplication

        // Note: rtl-support.css, rtl-components.css, and rtl-support.js are already enqueued in GitManager.php
        // No need to enqueue them again here to avoid duplication

        // Only localize the RTL settings if RTL is active and the script is enqueued
        if (RTLSupport::isRTL() && wp_script_is('repo-manager-rtl-support', 'enqueued')) {
            wp_localize_script('repo-manager-rtl-support', 'gitManagerRTL', RTLSupport::getRTLSettings());
        }
    }
}
