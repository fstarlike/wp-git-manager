<?php

namespace WPGitManager\View\Components;

use WPGitManager\Infrastructure\RTLSupport;

class Header
{
    public function render()
    {
        ?>
        <div class="repo-manager-header">
            <div class="repo-manager-header-content">
                <div class="repo-manager-logo">
                    <?php $this->renderLogo(); ?>
                    <span class="repo-live-badge" id="git-live-badge" title="Live status"></span>
                    <div class="repo-manager-title">
                        <h1><?php echo esc_html__('Repo Manager for Git', 'repo-manager'); ?></h1>
                        <p><?php echo esc_html__('Professional Git repository management', 'repo-manager'); ?></p>
                    </div>
                </div>
                <div class="repo-manager-actions">
                    <button class="git-action-btn git-clone-btn" title="<?php echo esc_attr__('Add Repository (Ctrl+N)', 'repo-manager'); ?>">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" class="git-icon-left">
                            <path d="M5 12h14"/>
                            <path d="M12 5v14"/>
                        </svg>
                        <?php echo esc_html__('Add Repository', 'repo-manager'); ?>
                    </button>
                    <button class="git-action-btn git-secondary-btn git-theme-switcher" title="<?php echo esc_attr__('Toggle Theme (Ctrl+T)', 'repo-manager'); ?>">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                            <circle cx="12" cy="12" r="4"/>
                            <path d="M12 2v2"/>
                            <path d="M12 20v2"/>
                            <path d="m4.93 4.93 1.41 1.41"/>
                            <path d="m17.66 17.66 1.41 1.41"/>
                            <path d="M2 12h2"/>
                            <path d="M20 12h2"/>
                            <path d="m6.34 17.66-1.41 1.41"/>
                            <path d="m19.07 4.93-1.41 1.41"/>
                        </svg>
                    </button>
                    <?php if (RTLSupport::isRTL()) { ?>
                    <button class="git-action-btn git-secondary-btn git-rtl-toggle" title="<?php echo esc_attr__('Toggle RTL/LTR', 'repo-manager'); ?>">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                            <path d="M8 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h3"/>
                            <path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/>
                            <path d="M12 20v2"/>
                            <path d="M12 14v2"/>
                            <path d="M12 8v2"/>
                            <path d="M12 2v2"/>
                        </svg>
                    </button>
                    <?php } ?>
                </div>
            </div>
        </div>
        <?php
    }

    private function renderLogo()
    {
        ?>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="63.495 58.089 120 120" width="120px" height="120px" class="repo-manager-logo-icon">
            <defs>
                <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1" spreadMethod="pad">
                <stop offset="0" stop-color="#2563eb"/>
                <stop offset="1" stop-color="#3b82f6"/>
                </linearGradient>
            </defs>
            <rect width="120" height="120" rx="24" x="63.495" y="58.089" style="stroke-width: 1; stroke-miterlimit: 1; stroke-linecap: round;" fill="url(#bg)"/>
            <g transform="matrix(3.33299994468689, 0, 0, 3.33299994468689, 85.03018951416016, 80.47609710693361)">
                <path stroke="#fff" d="M 9 19 C 5.283 20.115 3.005 19.703 2.068 17.054 C 1.848 16.432 1.085 16.283 0.572 16.155 M 16.558 22.159 L 16 18.13 C 16.076 17.165 15.465 15.854 14.792 15.159 C 17.932 14.809 23.456 15.349 21.5 8.52 C 21.116 7.178 20.963 5.781 20 4.77 C 20.456 3.549 20.853 1.609 20.339 0.411 C 20.339 0.411 18.73 0.65 16 2.48 C 13.708 1.859 11.292 1.859 9 2.48 C 6.27 0.65 4.768 0.464 4.768 0.464 C 4.254 1.662 4.544 3.549 5 4.77 C 4.03 5.789 3.716 7.16 3.5 8.55 C 2.522 14.85 7.019 14.692 10.159 15.082 C 9.494 15.77 8.933 17.176 9 18.13 L 9 22" style="stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.80018px; fill: none;"/>
            </g>
        </svg>
        <?php
    }
}
