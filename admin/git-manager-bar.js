jQuery(function ($) {
    let lastRemoteHash = null,
        lastLocalHash = null;
    function gmPostBar(action, data) {
        data = data || {};
        data.action = action;
        if (!data._git_manager_nonce)
            data._git_manager_nonce = WPGitManagerBar.nonce;
        var body = new URLSearchParams();
        Object.keys(data).forEach(function (k) {
            if (Array.isArray(data[k])) {
                data[k].forEach(function (v) {
                    body.append(k + "[]", v);
                });
            } else if (data[k] !== undefined && data[k] !== null) {
                body.append(k, data[k]);
            }
        });
        return fetch(WPGitManagerBar.ajaxurl, {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type":
                    "application/x-www-form-urlencoded; charset=UTF-8",
            },
            body: body.toString(),
        }).then(function (res) {
            return res.json();
        });
    }
    // Track last seen remote hashes per branch to avoid cross-branch noise
    const lastSeenByBranch = {};
    function checkCommits() {
        gmPostBar("git_manager_latest_commit")
            .then(function (resp) {
                if (!(resp && resp.success && resp.data)) return;
                const data = resp.data;
                const currentBranch =
                    typeof WPGitManagerBar !== "undefined" &&
                    WPGitManagerBar.currentBranch
                        ? WPGitManagerBar.currentBranch
                        : data.branch;
                // Only consider notifications for the current branch
                if (data.branch !== currentBranch) {
                    // If we don't know lastSeen for this branch, record it silently
                    if (!lastSeenByBranch[data.branch])
                        lastSeenByBranch[data.branch] = data.hash;
                    // ensure bar shows nothing for non-current branch
                    $("#git-manager-bar-badge").hide();
                    $("#git-manager-bar-commit-info").remove();
                    return;
                }
                // For current branch, detect remote ahead
                lastLocalHash = data.hash;
                const remoteHash = data.remote_hash || null;
                const lastSeen = lastSeenByBranch[currentBranch] || null;
                // If remoteHash is present and different from local, and it wasn't the same as lastSeen,
                // show notification and update lastSeen to prevent repeated alerts
                if (
                    remoteHash &&
                    remoteHash !== data.hash &&
                    remoteHash !== lastSeen
                ) {
                    let info = "";
                    if (data.author && data.subject) {
                        info =
                            `<div style="font-size:12px;color:#fff;padding:4px 0 0 0;">` +
                            `<b>${data.author}</b> &ndash; ${data.subject}` +
                            `</div>`;
                    }
                    $("#git-manager-bar-badge")
                        .show()
                        .attr(
                            "title",
                            `${data.author ? data.author : ""} - ${
                                data.subject ? data.subject : ""
                            }`
                        );
                    if ($("#git-manager-bar-commit-info").length === 0) {
                        $("#git-manager-bar-title").append(
                            `<div id='git-manager-bar-commit-info'>${info}</div>`
                        );
                    } else {
                        $("#git-manager-bar-commit-info").html(info);
                    }
                    lastSeenByBranch[currentBranch] = remoteHash;
                } else {
                    $("#git-manager-bar-badge").hide();
                    $("#git-manager-bar-commit-info").remove();
                    // update lastSeen to current remote to avoid future repeated alerts
                    if (remoteHash)
                        lastSeenByBranch[currentBranch] = remoteHash;
                }
            })
            .catch(function (err) {
                console.error("bar latest_commit failed", err);
            });
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
        gmPostBar("git_manager_fetch")
            .then(function (resp) {
                $(".git-manager-bar-spinner").remove();
                alert(
                    resp && resp.data
                        ? resp.data.replace(/(<([^>]+)>)/gi, "")
                        : "Done"
                );
                checkCommits();
            })
            .catch(function (err) {
                console.error("bar fetch failed", err);
                $(".git-manager-bar-spinner").remove();
            });
    });

    // Pull handler
    $(document).on("click", ".git-manager-bar-pull", function (e) {
        e.preventDefault();
        $("#git-manager-bar-title").append(
            '<span class="git-manager-bar-spinner"></span>'
        );
        gmPostBar("git_manager_pull")
            .then(function (resp) {
                $(".git-manager-bar-spinner").remove();
                alert(WPGitManagerBar.pullText);
                $("#git-manager-bar-badge").hide();
                checkCommits();
            })
            .catch(function (err) {
                console.error("bar pull failed", err);
                $(".git-manager-bar-spinner").remove();
            });
    });
});
