// Git Manager: Global commit checker for all admin pages
// Translators: JS i18n
(function () {
    const { __ } = wp.i18n;
    if (!window.gitManagerCommitCheckerLoaded) {
        window.gitManagerCommitCheckerLoaded = true;
        var lastRemoteHash = null;
        var lastBranch = null;
        var polling = false;
        var beepUrl = "beep.mp3"; // must be in same folder as this JS

        function showMaterialSnackbar(message) {
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
            // Material fade-in animation
            var style = document.createElement("style");
            style.innerHTML =
                "@keyframes git-snackbar-in{from{opacity:0;bottom:0;}to{opacity:1;bottom:32px;}}";
            document.head.appendChild(style);
        }

        function playBeep() {
            var audio = new Audio(beepUrl);
            audio.play();
        }

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
            fetch(ajaxurl, { method: "POST", body: data })
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
                        if (
                            lastRemoteHash !== null &&
                            response.data.remote_hash !== lastRemoteHash
                        ) {
                            showMaterialSnackbar(
                                __(
                                    "New commits detected on remote! Please Pull to update your local repository.",
                                    "git-manager"
                                )
                            );
                            playBeep();
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
    }
})();
