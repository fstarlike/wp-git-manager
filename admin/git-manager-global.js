// Git Manager: Global commit checker for all admin pages
// Translators: JS i18n
(function () {
    const { __ } = wp.i18n;
    if (!window.gitManagerCommitCheckerLoaded) {
        window.gitManagerCommitCheckerLoaded = true;
        var lastRemoteHash = null;
        var lastBranch = null;
        var polling = false;
        var beepUrl = WPGitManagerGlobal.beepUrl; // must be in same folder as this JS

        // debug load
        try {
            console.log(
                "[Git Manager] git-manager-global loaded",
                WPGitManagerGlobal || null
            );
        } catch (e) {}

        // expose a shared snackbar function and add a short cooldown to avoid rapid repeats
        window.gitManagerLastSnackbarTime =
            window.gitManagerLastSnackbarTime || 0;
        window.gitManagerShowSnackbar =
            window.gitManagerShowSnackbar ||
            function (message) {
                var cooldown = 60 * 1000; // 60s cooldown between visible snackbars
                if (Date.now() - window.gitManagerLastSnackbarTime < cooldown)
                    return;
                if (document.getElementById("git-commit-snackbar")) return;
                var snackbar = document.createElement("div");
                snackbar.id = "git-commit-snackbar";
                snackbar.innerHTML =
                    '<div style="display:flex;align-items:center;">' +
                    '<span style="flex:1;font-size:15px;">' +
                    message +
                    "</span>" +
                    '<button id="git-commit-snackbar-close" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer;margin-left:10px;">&times;</button>' +
                    "</div>";
                snackbar.style.cssText =
                    "position:fixed;z-index:99999;left:50%;bottom:32px;transform:translateX(-50%);background:#323232;color:#fff;padding:18px 28px;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.18);font-family:inherit;min-width:320px;max-width:90vw;display:flex;align-items:center;animation:git-snackbar-in 0.3s;";
                document.body.appendChild(snackbar);
                document.getElementById("git-commit-snackbar-close").onclick =
                    function () {
                        snackbar.remove();
                    };
                // Material fade-in animation (add style once)
                if (!document.getElementById("git-commit-snackbar-style")) {
                    var style = document.createElement("style");
                    style.id = "git-commit-snackbar-style";
                    style.innerHTML =
                        "@keyframes git-snackbar-in{from{opacity:0;bottom:0;}to{opacity:1;bottom:32px;}}";
                    document.head.appendChild(style);
                }
                window.gitManagerLastSnackbarTime = Date.now();
            };

        // create a single Audio instance and reuse it (helps with some autoplay policies)
        (function () {
            var sharedAudio = null;
            try {
                sharedAudio = new Audio(beepUrl);
            } catch (e) {
                sharedAudio = null;
            }
            window.gitManagerPlayBeep =
                window.gitManagerPlayBeep ||
                function () {
                    try {
                        if (sharedAudio) {
                            // rewind and play; catch promise rejection
                            sharedAudio.currentTime = 0;
                            var p = sharedAudio.play();
                            if (p && p.catch) p.catch(function () {});
                        } else {
                            var a = new Audio(beepUrl);
                            var p = a.play();
                            if (p && p.catch) p.catch(function () {});
                        }
                    } catch (e) {}
                };
        })();

        function checkCommits() {
            if (polling) return;
            polling = true;
            var data = new FormData();
            data.append("action", "git_manager_latest_commit");
            data.append(
                "_git_manager_nonce",
                window.gitManagerNonce && window.gitManagerNonce.nonce
                    ? window.gitManagerNonce.nonce
                    : ""
            );
            // attach action-specific nonce if available
            try {
                if (
                    window.WPGitManagerGlobal &&
                    WPGitManagerGlobal.action_nonces &&
                    WPGitManagerGlobal.action_nonces[
                        "git_manager_latest_commit"
                    ]
                ) {
                    data.append(
                        "_git_manager_action_nonce",
                        WPGitManagerGlobal.action_nonces[
                            "git_manager_latest_commit"
                        ]
                    );
                }
            } catch (e) {
                // ignore
            }
            fetch(WPGitManagerGlobal.ajaxurl || ajaxurl, {
                method: "POST",
                body: data,
            })
                .then(function (r) {
                    return r.json();
                })
                .then(function (response) {
                    // Debug: log hashes and branch
                    console.log(
                        "[Git Manager] latest_commit response:",
                        response
                    );
                    if (
                        response.success &&
                        response.data &&
                        response.data.remote_hash &&
                        response.data.remote_hash !== response.data.hash
                    ) {
                        // Notify immediately if this is the first check (lastRemoteHash === null)
                        // or if remote_hash has changed since the last check
                        if (
                            lastRemoteHash === null ||
                            response.data.remote_hash !== lastRemoteHash
                        ) {
                            // build a polished, safe message with author, truncated subject and branch hint
                            function esc(s) {
                                if (!s) return "";
                                return String(s)
                                    .replace(/&/g, "&amp;")
                                    .replace(/</g, "&lt;")
                                    .replace(/>/g, "&gt;");
                            }
                            var message = __(
                                "New commits detected on remote! Please Pull to update your local repository.",
                                "git-manager"
                            );
                            try {
                                if (
                                    response.data.author &&
                                    response.data.subject
                                ) {
                                    var author = esc(
                                        response.data.author.toString()
                                    );
                                    var subj = response.data.subject.toString();
                                    if (subj.length > 80)
                                        subj = subj.slice(0, 77) + "\u2026";
                                    subj = esc(subj);
                                    var branchLabel = response.data.branch
                                        ? esc(response.data.branch.toString())
                                        : "";
                                    message = author + ": " + subj;
                                    if (branchLabel)
                                        message +=
                                            " - " +
                                            __(
                                                "New commits on branch",
                                                "git-manager"
                                            ) +
                                            " " +
                                            branchLabel +
                                            ".";
                                    message +=
                                        " " +
                                        __(
                                            "Please Pull to update your local repository or open Git Manager to review changes.",
                                            "git-manager"
                                        );
                                }
                            } catch (e) {}
                            var changeObj = {
                                hash: response.data.remote_hash,
                                branch: response.data.branch || null,
                                author: response.data.author || null,
                                subject: response.data.subject || null,
                                message: message || null,
                                ts: Date.now(),
                            };
                            try {
                                localStorage.setItem(
                                    "gitManagerRemoteChange",
                                    JSON.stringify(changeObj)
                                );
                            } catch (e) {}
                            // show locally as well
                            if (window.gitManagerShowSnackbar)
                                window.gitManagerShowSnackbar(message);
                            if (window.gitManagerPlayBeep)
                                window.gitManagerPlayBeep();
                        }
                        lastRemoteHash = response.data.remote_hash;
                        lastBranch = response.data.branch;
                    } else if (
                        response.success &&
                        response.data &&
                        !response.data.remote_hash
                    ) {
                        // Warn if remote_hash is empty (no tracking branch or fetch failed)
                        console.warn(
                            __(
                                "[Git Manager] No remote tracking branch or fetch failed. remote_hash is empty.",
                                "git-manager"
                            )
                        );
                    }
                    polling = false;
                })
                .catch(function (err) {
                    console.error("[Git Manager] AJAX error:", err);
                    polling = false;
                });
        }

        setInterval(checkCommits, 20000);
        checkCommits();
        // Listen for remote-change broadcasts from other tabs/pages
        window.addEventListener("storage", function (e) {
            if (e.key !== "gitManagerRemoteChange") return;
            try {
                var obj = JSON.parse(e.newValue);
                if (!obj) return;
                var msg =
                    obj.message ||
                    (obj.author && obj.subject
                        ? obj.author + " - " + obj.subject
                        : __("New commits detected on remote!", "git-manager"));
                if (window.gitManagerShowSnackbar)
                    window.gitManagerShowSnackbar(msg);
                if (window.gitManagerPlayBeep) window.gitManagerPlayBeep();
            } catch (e) {}
        });
    }
})();
