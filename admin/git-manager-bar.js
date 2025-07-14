jQuery(function ($) {
    let lastRemoteHash = null,
        lastLocalHash = null;
    function checkCommits() {
        $.post(
            WPGitManagerBar.ajaxurl,
            {
                action: "git_manager_latest_commit",
                _git_manager_nonce: WPGitManagerBar.nonce,
            },
            function (resp) {
                if (resp.success && resp.data) {
                    lastLocalHash = resp.data.hash;
                    if (
                        resp.data.remote_hash &&
                        resp.data.remote_hash !== resp.data.hash
                    ) {
                        $("#git-manager-bar-badge").show();
                        lastRemoteHash = resp.data.remote_hash;
                    } else {
                        $("#git-manager-bar-badge").hide();
                    }
                }
            }
        );
    }
    // Initial check and interval
    checkCommits();
    setInterval(checkCommits, 20000);

    // Fetch handler
    $(document).on("click", ".git-manager-bar-fetch", function (e) {
        e.preventDefault();
        $("#git-manager-bar-title").append(
            '<span class="git-manager-bar-spinner"></span>'
        );
        $.post(
            WPGitManagerBar.ajaxurl,
            {
                action: "git_manager_fetch",
                _git_manager_nonce: WPGitManagerBar.nonce,
            },
            function (resp) {
                $(".git-manager-bar-spinner").remove();
                alert(
                    resp && resp.data
                        ? resp.data.replace(/(<([^>]+)>)/gi, "")
                        : "Done"
                );
                checkCommits();
            }
        );
    });

    // Pull handler
    $(document).on("click", ".git-manager-bar-pull", function (e) {
        e.preventDefault();
        $("#git-manager-bar-title").append(
            '<span class="git-manager-bar-spinner"></span>'
        );
        $.post(
            WPGitManagerBar.ajaxurl,
            {
                action: "git_manager_pull",
                _git_manager_nonce: WPGitManagerBar.nonce,
            },
            function (resp) {
                $(".git-manager-bar-spinner").remove();
                alert(WPGitManagerBar.pullText);
                $("#git-manager-bar-badge").hide();
                checkCommits();
            }
        );
    });
});
