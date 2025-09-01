<?php

namespace WPGitManager\View\Admin;

use WPGitManager\Infrastructure\RTLSupport;
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

            <div class="git-manager-dashboard">
                <?php
            $this->sidebar->render();
        ?>

                <div class="git-repo-content">
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

        // Note: git-manager-global.js is already enqueued in wp-git-manager.php
        // No need to enqueue it again here to avoid duplication

        // Note: rtl-support.css, rtl-components.css, and rtl-support.js are already enqueued in GitManager.php
        // No need to enqueue them again here to avoid duplication

        // Only localize the RTL settings if RTL is active and the script is enqueued
        if (RTLSupport::isRTL() && wp_script_is('git-manager-rtl-support', 'enqueued')) {
            wp_localize_script('git-manager-rtl-support', 'gitManagerRTL', RTLSupport::getRTLSettings());
        }
    }
}
