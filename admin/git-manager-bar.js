jQuery(function ($) {
    let lastRemoteHash = null,
        lastLocalHash = null;
    function gmPostBar(action, data) {
        data = data || {};
        data.action = action;
        if (!data._git_manager_nonce)
            data._git_manager_nonce = WPGitManagerBar.nonce;
        // attach per-action nonce if provided
        try {
            if (
                WPGitManagerBar &&
                WPGitManagerBar.action_nonces &&
                WPGitManagerBar.action_nonces[action] &&
                !data._git_manager_action_nonce
            ) {
                data._git_manager_action_nonce =
                    WPGitManagerBar.action_nonces[action];
            }
        } catch (e) {}
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
    // Track notification state per branch to avoid cross-branch noise and preserve badge until pull
    const lastSeenByBranch = {};
    const notifiedRemoteByBranch = {};
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
                // If remoteHash is present and different from local, show badge and info.
                // Play beep/notify only the first time we see this specific remoteHash for this branch.
                if (remoteHash && remoteHash !== data.hash) {
                    let info = "";
                    if (data.author && data.subject) {
                        // truncate subject to keep bar compact; full subject stored in title for tooltip
                        var maxLen = 60; // assume 60 chars is reasonable
                        var subj = data.subject.toString();
                        var shortSubj =
                            subj.length > maxLen
                                ? subj.slice(0, maxLen - 1) + "\u2026"
                                : subj;
                        var safeAuthor = data.author.toString();
                        info = `<span class="bar-commit-meta" title="${(
                            safeAuthor +
                            " - " +
                            subj
                        ).replace(
                            /"/g,
                            "&quot;"
                        )}"><b>${safeAuthor}</b> &ndash; ${shortSubj}</span>`;
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
                    // mark that we've seen this remoteHash (but don't treat it as acknowledgement)
                    lastSeenByBranch[currentBranch] =
                        lastSeenByBranch[currentBranch] || null;
                    if (notifiedRemoteByBranch[currentBranch] !== remoteHash) {
                        // first time notifying for this remote hash on this branch
                        notifiedRemoteByBranch[currentBranch] = remoteHash;
                        // optionally could play a sound or trigger additional UI here (global snackbar handles site-wide)
                    }
                } else {
                    // If remote no longer ahead (remoteHash missing or equal to local), clear badge and notification state
                    $("#git-manager-bar-badge").hide();
                    $("#git-manager-bar-commit-info").remove();
                    if (!remoteHash || remoteHash === data.hash) {
                        notifiedRemoteByBranch[currentBranch] = null;
                        lastSeenByBranch[currentBranch] = remoteHash || null;
                    }
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
                // clear notified state for current branch so badge won't reappear for the same remote until next remote change
                try {
                    var current = WPGitManagerBar.currentBranch || null;
                    if (
                        current &&
                        typeof notifiedRemoteByBranch !== "undefined"
                    ) {
                        notifiedRemoteByBranch[current] = null;
                    }
                } catch (e) {}
                // Do not automatically reload status or check commits after pull
                // User can manually refresh or the periodic checker will run on its own
            })
            .catch(function (err) {
                console.error("bar pull failed", err);
                $(".git-manager-bar-spinner").remove();
            });
    });
});
