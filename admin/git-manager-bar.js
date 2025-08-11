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
                        let info = "";
                        if (resp.data.author && resp.data.subject) {
                            info =
                                `<div style="font-size:12px;color:#222;padding:4px 0 0 0;">` +
                                `<b>${resp.data.author}</b> &ndash; ${resp.data.subject}` +
                                `</div>`;
                        }
                        $("#git-manager-bar-badge")
                            .show()
                            .attr(
                                "title",
                                `${
                                    resp.data.author ? resp.data.author : ""
                                } - ${
                                    resp.data.subject ? resp.data.subject : ""
                                }`
                            );
                        // Optionally show info below the bar
                        if ($("#git-manager-bar-commit-info").length === 0) {
                            $("#git-manager-bar-title").append(
                                `<div id='git-manager-bar-commit-info'>${info}</div>`
                            );
                        } else {
                            $("#git-manager-bar-commit-info").html(info);
                        }
                        lastRemoteHash = resp.data.remote_hash;
                    } else {
                        $("#git-manager-bar-badge").hide();
                        $("#git-manager-bar-commit-info").remove();
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
