<?php

namespace WPGitManager\View\Components;

use WPGitManager\Infrastructure\RTLSupport;

class Troubleshoot
{
    public function render()
    {
        $rtlClasses        = RTLSupport::getRTLClasses();
        $rtlAttributes     = RTLSupport::getRTLAttributes();
        $rtlDataAttributes = RTLSupport::getRTLDataAttributes();
        $rtlStyles         = RTLSupport::getRTLInlineStyles();

        ?>
        <!-- Troubleshoot Section (hidden by default) -->
        <div class="git-troubleshoot troubleshoot-container <?php echo esc_attr($rtlClasses); ?>"
             id="git-troubleshoot"
             style="display: none; <?php echo esc_attr($rtlStyles); ?>"
             <?php echo esc_attr($rtlAttributes); ?>
             <?php echo esc_attr($rtlDataAttributes); ?>>

            <div class="troubleshoot-header">
                <button class="git-back-btn <?php echo esc_attr(RTLSupport::getIconClass('left')); ?>" id="back-from-troubleshoot">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                        <path d="M19 12H5"/>
                        <path d="M12 19l-7-7 7-7"/>
                    </svg>
                    <?php esc_html_e('Back to Welcome', 'repo-manager'); ?>
                </button>
                <h2 class="troubleshoot-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                    </svg>
                    <?php esc_html_e('Professional Troubleshooting', 'repo-manager'); ?>
                </h2>
            </div>

            <div class="troubleshoot-content">
                <div class="troubleshoot-description">
                    <p><?php esc_html_e('Professional Git troubleshooting tool that will diagnose and fix common issues with your Git setup.', 'repo-manager'); ?></p>
                </div>

                <div class="troubleshoot-actions">
                    <button class="git-action-btn troubleshoot-btn btn-primary" id="run-troubleshoot">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                        </svg>
                        <?php esc_html_e('Run Troubleshooting', 'repo-manager'); ?>
                    </button>
                </div>

                <div class="troubleshoot-output" id="troubleshoot-output" style="display: none;">
                    <div class="output-header">
                        <h3><?php esc_html_e('Troubleshooting Results', 'repo-manager'); ?></h3>
                        <button class="git-action-btn git-secondary-btn troubleshoot-btn btn-secondary" id="copy-troubleshoot-output">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                            </svg>
                            <?php esc_html_e('Copy Results', 'repo-manager'); ?>
                        </button>
                    </div>
                    <div class="output-content" id="troubleshoot-results">
                        <!-- Troubleshooting results will be displayed here -->
                    </div>
                </div>
            </div>
        </div>
        <?php
    }
}
