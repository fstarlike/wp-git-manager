<?php

namespace WPGitManager\View\Components;

class WelcomeScreen
{
    public function render()
    {
        ?>
        <!-- Welcome Screen -->
        <div class="git-repo-welcome" id="git-welcome-screen">
            <div class="welcome-content">
                <?php $this->renderWelcomeIcon(); ?>
                <h2><?php echo esc_html__('Welcome to Repo Manager', 'repo-manager'); ?></h2>
                <p><?php echo esc_html__('Manage multiple Git repositories with a professional interface inspired by GitHub Desktop and GitLab.', 'repo-manager'); ?></p>
                <div class="welcome-actions">
                    <button class="git-action-btn git-clone-btn">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" class="git-icon-left">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                        </svg>
                        <?php echo esc_html__('Add Your First Repository', 'repo-manager'); ?>
                    </button>
                    <a href="#" onclick="window.open(this.href); return false;" target="_blank" class="git-action-btn git-secondary-btn git-troubleshoot-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M10 2v2"/>
                            <path d="M14 2v2"/>
                            <path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/>
                            <path d="M6 2v2"/>
                        </svg>
                        <?php echo esc_html__('Buy me a coffee', 'repo-manager'); ?>
                    </a>
                </div>
            </div>
        </div>
        <?php
    }

    private function renderWelcomeIcon()
    {
        ?>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="63.495 58.089 120 120" width="160px" height="160px" class="welcome-icon">
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
