<?php

namespace WPGitManager\View\Components;

class Sidebar
{
    public function render()
    {
        ?>
        <!-- Sidebar -->
        <div class="git-repo-sidebar">
            <div class="git-repo-sidebar-header">
                <h3><?php echo esc_html__('Repositories', 'repo-manager'); ?></h3>
                <button class="git-sidebar-add-btn git-clone-btn" title="<?php echo esc_attr__('Add Repository', 'repo-manager'); ?>">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" class="git-icon-left">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                </button>
            </div>
            <div class="git-repo-list" id="git-repo-list">
                <!-- Repository cards will be loaded here -->
                <div class="git-repo-empty">
                    <p><?php echo esc_html__('Loading repositories...', 'repo-manager'); ?></p>
                </div>
            </div>
        </div>
        <?php
    }
}
