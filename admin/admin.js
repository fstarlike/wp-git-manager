jQuery(document).ready(function ($) {
    // small fetch-based POST helper to replace $.post
    function gmPost(action, data) {
        data = data || {};
        data.action = action;
        var nonceEl = document.getElementById("git_manager_nonce");
        if (nonceEl && !data._git_manager_nonce)
            data._git_manager_nonce = nonceEl.value;
        // attach per-action nonce if provided via localized script
        try {
            var actionNonces =
                (typeof WPGitManagerBar !== "undefined" &&
                    WPGitManagerBar.action_nonces) ||
                (typeof WPGitManager !== "undefined" &&
                    WPGitManager.action_nonces) ||
                null;
            if (
                actionNonces &&
                actionNonces[action] &&
                !data._git_manager_action_nonce
            ) {
                data._git_manager_action_nonce = actionNonces[action];
            }
        } catch (e) {
            // ignore
        }
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
        return fetch(ajaxurl, {
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

    // --- Git Change Watcher (beep and alert on new commit) ---
    // Track last seen commit hash per branch to avoid cross-branch notifications
    const lastGitChangeByBranch = {};
    function checkGitChanges() {
        gmPost("git_manager_check_git_changes")
            .then(function (response) {
                if (
                    !(
                        response &&
                        response.success &&
                        response.data &&
                        response.data.hash
                    )
                )
                    return;
                const hash = response.data.hash;
                const branch = response.data.branch || null; // server may send branch
                if (branch) {
                    const last = lastGitChangeByBranch[branch] || null;
                    if (last && last !== hash) {
                        if (jQuery("#git-change-alert").length === 0) {
                            jQuery("#git-manager-output").prepend(
                                '<div id="git-change-alert" style="background:#ffeaea;color:#b00;padding:10px 15px;margin-bottom:10px;border:1px solid #b00;font-weight:bold;">' +
                                    jQuery.fn.init.wp
                                    ? __(
                                          "New change detected in the repository!",
                                          "git-manager"
                                      )
                                    : "New change detected in the repository!" +
                                          "</div>"
                            );
                        }
                        try {
                            new Audio("admin/beep.mp3").play();
                        } catch (e) {}
                    }
                    lastGitChangeByBranch[branch] = hash;
                } else {
                    // Fallback: single hash when branch not provided
                    const last = lastGitChangeByBranch._default || null;
                    if (last && last !== hash) {
                        if (jQuery("#git-change-alert").length === 0) {
                            jQuery("#git-manager-output").prepend(
                                '<div id="git-change-alert" style="background:#ffeaea;color:#b00;padding:10px 15px;margin-bottom:10px;border:1px solid #b00;font-weight:bold;">' +
                                    "New change detected in the repository!" +
                                    "</div>"
                            );
                        }
                        try {
                            new Audio("admin/beep.mp3").play();
                        } catch (e) {}
                    }
                    lastGitChangeByBranch._default = hash;
                }
            })
            .catch(function (err) {
                console.error("checkGitChanges failed", err);
            });
    }
    setInterval(checkGitChanges, 20000);
    checkGitChanges();
    setTimeout(function () {
        if (document.getElementById("git-status")) {
            $("#git-status").trigger("click");
        }
    }, 200);
    // --- Output Handler for 3 Main States ---
    function renderGitManagerOutput(response, context) {
        // context: 'status', 'log', 'default', etc.
        let html = "";
        // Special case: hide output if status is OK (repo exists, no errors)
        if (context === "status" && response && typeof response === "string") {
            // Check for ".git exists: yes" and absence of error phrases
            const isOk =
                response.includes(".git exists:</b> yes") &&
                !response.includes("not found") &&
                !response.includes("disabled") &&
                !response.includes("was not found") &&
                !response.includes("color:red");
            if (isOk) {
                $("#git-manager-output-content").html("");
                return;
            } else {
                html = response;
            }
        } else if (typeof response === "string") {
            if (
                response.includes("Invalid repository path") ||
                response.includes(
                    "Repository path or .git folder was not found"
                )
            ) {
                html = `<div class="git-manager-instruction-box">
                    <b>${__(
                        "Repository path is not set or invalid.",
                        "git-manager"
                    )}</b><br>
                    ${__(
                        "Please enter and save a valid git repository path.",
                        "git-manager"
                    )}<br>
                    <span style="color:#888;font-size:13px;">(${__(
                        "Use the settings button above.",
                        "git-manager"
                    )})</span>
                </div>`;
            } else if (
                response.includes("This directory is not a git repository") ||
                response.includes(".git directory not found")
            ) {
                html = `<div class="git-manager-instruction-box">
                    <b>${__(
                        "The selected path is not a git repository.",
                        "git-manager"
                    )}</b><br>
                    ${__(
                        "Please create a git repository or change the path.",
                        "git-manager"
                    )}<br>
                    <span style="color:#888;font-size:13px;">(${__(
                        "Run git init in the target folder.",
                        "git-manager"
                    )})</span>
                </div>`;
            } else {
                html = `<div class="git-manager-instruction-box">${response}</div>`;
            }
        } else if (response && response.success === false && response.data) {
            // AJAX error
            html = `<div class="git-manager-instruction-box">${response.data}</div>`;
        } else if (context === "log" && Array.isArray(response)) {
            // Render log as before (should not hit this branch, handled in log click)
            html = response;
        } else if (response && response.data) {
            html = response.data;
        } else {
            html = `<div class="git-manager-instruction-box">${__(
                "Unknown output!",
                "git-manager"
            )}</div>`;
        }
        $("#git-manager-output-content").html(html);
    }

    // --- Loading Overlay Functions ---
    function showGitManagerLoading(msg) {
        $("#git-manager-loading-overlay .loading-text").text(
            msg || "Loading, please wait..."
        );
        $("#git-manager-loading-overlay").addClass("active");
    }
    function hideGitManagerLoading() {
        $("#git-manager-loading-overlay").removeClass("active");
    }
    const { __ } = wp.i18n;
    // Minimal MD5 implementation for gravatar
    function md5cycle(x, k) {
        var a = x[0],
            b = x[1],
            c = x[2],
            d = x[3];
        function ff(a, b, c, d, x, s, t) {
            a = a + ((b & c) | (~b & d)) + x + t;
            return ((a << s) | (a >>> (32 - s))) + b;
        }
        function gg(a, b, c, d, x, s, t) {
            a = a + ((b & d) | (c & ~d)) + x + t;
            return ((a << s) | (a >>> (32 - s))) + b;
        }
        function hh(a, b, c, d, x, s, t) {
            a = a + (b ^ c ^ d) + x + t;
            return ((a << s) | (a >>> (32 - s))) + b;
        }
        function ii(a, b, c, d, x, s, t) {
            a = a + (c ^ (b | ~d)) + x + t;
            return ((a << s) | (a >>> (32 - s))) + b;
        }
        a = ff(a, b, c, d, k[0], 7, -680876936);
        d = ff(d, a, b, c, k[1], 12, -389564586);
        c = ff(c, d, a, b, k[2], 17, 606105819);
        b = ff(b, c, d, a, k[3], 22, -1044525330);
        a = ff(a, b, c, d, k[4], 7, -176418897);
        d = ff(d, a, b, c, k[5], 12, 1200080426);
        c = ff(c, d, a, b, k[6], 17, -1473231341);
        b = ff(b, c, d, a, k[7], 22, -45705983);
        a = ff(a, b, c, d, k[8], 7, 1770035416);
        d = ff(d, a, b, c, k[9], 12, -1958414417);
        c = ff(c, d, a, b, k[10], 17, -42063);
        b = ff(b, c, d, a, k[11], 22, -1990404162);
        a = ff(a, b, c, d, k[12], 7, 1804603682);
        d = ff(d, a, b, c, k[13], 12, -40341101);
        c = ff(c, d, a, b, k[14], 17, -1502002290);
        b = ff(b, c, d, a, k[15], 22, 1236535329);
        a = gg(a, b, c, d, k[1], 5, -165796510);
        d = gg(d, a, b, c, k[6], 9, -1069501632);
        c = gg(c, d, a, b, k[11], 14, 643717713);
        b = gg(b, c, d, a, k[0], 20, -373897302);
        a = gg(a, b, c, d, k[5], 5, -701558691);
        d = gg(d, a, b, c, k[10], 9, 38016083);
        c = gg(c, d, a, b, k[15], 14, -660478335);
        b = gg(b, c, d, a, k[4], 20, -405537848);
        a = gg(a, b, c, d, k[9], 5, 568446438);
        d = gg(d, a, b, c, k[14], 9, -1019803690);
        c = gg(c, d, a, b, k[3], 14, -187363961);
        b = gg(b, c, d, a, k[8], 20, 1163531501);
        a = gg(a, b, c, d, k[13], 5, -1444681467);
        d = gg(d, a, b, c, k[2], 9, -51403784);
        c = gg(c, d, a, b, k[7], 14, 1735328473);
        b = gg(b, c, d, a, k[12], 20, -1926607734);
        a = hh(a, b, c, d, k[5], 4, -378558);
        d = hh(d, a, b, c, k[8], 11, -2022574463);
        c = hh(c, d, a, b, k[11], 16, 1839030562);
        b = hh(b, c, d, a, k[14], 23, -35309556);
        a = hh(a, b, c, d, k[1], 4, -1530992060);
        d = hh(d, a, b, c, k[4], 11, 1272893353);
        c = hh(c, d, a, b, k[7], 16, -155497632);
        b = hh(b, c, d, a, k[10], 23, -1094730640);
        a = hh(a, b, c, d, k[13], 4, 681279174);
        d = hh(d, a, b, c, k[0], 11, -358537222);
        c = hh(c, d, a, b, k[3], 16, -722521979);
        b = hh(b, c, d, a, k[6], 23, 76029189);
        a = hh(a, b, c, d, k[9], 4, -640364487);
        d = hh(d, a, b, c, k[12], 11, -421815835);
        c = hh(c, d, a, b, k[15], 16, 530742520);
        b = hh(b, c, d, a, k[2], 23, -995338651);
        a = ii(a, b, c, d, k[0], 6, -198630844);
        d = ii(d, a, b, c, k[7], 10, 1126891415);
        c = ii(c, d, a, b, k[14], 15, -1416354905);
        b = ii(b, c, d, a, k[5], 21, -57434055);
        a = ii(a, b, c, d, k[12], 6, 1700485571);
        d = ii(d, a, b, c, k[3], 10, -1894986606);
        c = ii(c, d, a, b, k[10], 15, -1051523);
        b = ii(b, c, d, a, k[1], 21, -2054922799);
        a = ii(a, b, c, d, k[8], 6, 1873313359);
        d = ii(d, a, b, c, k[15], 10, -30611744);
        c = ii(c, d, a, b, k[6], 15, -1560198380);
        b = ii(b, c, d, a, k[13], 21, 1309151649);
        a = ii(a, b, c, d, k[4], 6, -145523070);
        d = ii(d, a, b, c, k[11], 10, -1120210379);
        c = ii(c, d, a, b, k[2], 15, 718787259);
        b = ii(b, c, d, a, k[9], 21, -343485551);
        x[0] = add32(a, x[0]);
        x[1] = add32(b, x[1]);
        x[2] = add32(c, x[2]);
        x[3] = add32(d, x[3]);
    }

    function add32(a, b) {
        return (a + b) & 0xffffffff;
    }
    function md5blk(s) {
        var md5blks = [],
            i;
        for (i = 0; i < 64; i += 4) {
            md5blks[i >> 2] =
                s.charCodeAt(i) +
                (s.charCodeAt(i + 1) << 8) +
                (s.charCodeAt(i + 2) << 16) +
                (s.charCodeAt(i + 3) << 24);
        }
        return md5blks;
    }
    function md51(s) {
        var n = s.length,
            state = [1732584193, -271733879, -1732584194, 271733878],
            i,
            length,
            tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (i = 64; i <= n; i += 64) {
            md5cycle(state, md5blk(s.substring(i - 64, i)));
        }
        s = s.substring(i - 64);
        for (i = 0; i < s.length; i++)
            tail[i >> 2] |= s.charCodeAt(i) << (i % 4 << 3);
        tail[i >> 2] |= 0x80 << (i % 4 << 3);
        if (i > 55) {
            md5cycle(state, tail);
            for (i = 0; i < 16; i++) tail[i] = 0;
        }
        tail[14] = n * 8;
        md5cycle(state, tail);
        return state;
    }
    function rhex(n) {
        var s = "",
            j = 0;
        for (; j < 4; j++)
            s +=
                ((n >> (j * 8 + 4)) & 0x0f).toString(16) +
                ((n >> (j * 8)) & 0x0f).toString(16);
        return s;
    }
    function hex(x) {
        for (var i = 0; i < x.length; i++) x[i] = rhex(x[i]);
        return x.join("");
    }
    function md5(s) {
        return hex(md51(s));
    }

    // --- Auto check for new commits every 10 seconds ---
    var lastCommitHash = null;
    var lastCommitBranch = null;
    var lastLocalNotification = 0;
    function checkForNewCommits() {
        gmPost("git_manager_latest_commit")
            .then(function (response) {
                if (
                    response.success &&
                    response.data &&
                    response.data.hash &&
                    response.data.branch &&
                    response.data.remote_hash
                ) {
                    // --- Render Last Commit Box ---
                    var html = "";
                    html += '<span class="commit-label">Last Commit:</span>';
                    html +=
                        '<span class="commit-branch">' +
                        response.data.branch +
                        "</span>";
                    html +=
                        '<span class="commit-hash">' +
                        response.data.hash.substring(0, 8) +
                        "</span>";
                    if (
                        response.data.remote_hash &&
                        response.data.remote_hash !== response.data.hash
                    ) {
                        html +=
                            '<span class="commit-remote">Remote ahead!</span>';
                    }
                    $("#git-last-commit").html(html).fadeIn(200);

                    var selectedBranch = $("#git-branch-list").val();
                    // Only show alert if current branch matches selected branch and remote is ahead
                    if (
                        response.data.branch === selectedBranch &&
                        response.data.remote_hash &&
                        response.data.remote_hash !== response.data.hash
                    ) {
                        var now = Date.now();
                        if (now - lastLocalNotification >= 60000) {
                            lastLocalNotification = now;
                            // use the shared snackbar (if provided by global script) to show a modern notification
                            if (window.gitManagerShowSnackbar) {
                                window.gitManagerShowSnackbar(
                                    __(
                                        "New commits detected on remote! Please Pull to update your local repository.",
                                        "git-manager"
                                    )
                                );
                            } else {
                                // fallback: insert a single alert div (kept minimal)
                                if ($("#git-new-commit-alert").length === 0) {
                                    $("#git-manager-output").prepend(
                                        '<div id="git-new-commit-alert" style="background:#ffeaea;color:#b00;padding:10px 15px;margin-bottom:10px;border:1px solid #b00;font-weight:bold;">' +
                                            __(
                                                "New commits detected on remote! Please <b>Pull</b> to update your local repository.",
                                                "git-manager"
                                            ) +
                                            "</div>"
                                    );
                                }
                            }

                            // try shared beep or local fallback
                            if (window.gitManagerPlayBeep) {
                                window.gitManagerPlayBeep();
                            } else {
                                try {
                                    new Audio(WPGitManager.beepUrl).play();
                                } catch (e) {}
                            }
                        }
                    } else {
                        // remove legacy alert if present
                        $("#git-new-commit-alert").remove();
                    }

                    lastCommitHash = response.data.hash;
                    lastCommitBranch = response.data.branch;
                }
            })
            .catch(function (err) {
                console.error("checkForNewCommits failed", err);
            });
    }
    setInterval(checkForNewCommits, 20000);
    checkForNewCommits();

    $("#git-status").on("click", function () {
        showGitManagerLoading();
        gmPost("git_manager_status")
            .then(function (response) {
                renderGitManagerOutput(response, "status");
            })
            .finally(function () {
                hideGitManagerLoading();
            })
            .catch(function (err) {
                console.error("git-status failed", err);
            });
    });

    $("#git-manager-roles-form").on("submit", function (e) {
        e.preventDefault();
        var data = $(this).serializeArray();
        // convert to key/value object expected by gmPost
        var obj = {};
        data.forEach(function (pair) {
            obj[pair.name] = pair.value;
        });
        gmPost("git_manager_save_roles", obj)
            .then(function (response) {
                alert(
                    typeof response.data === "string"
                        ? __(response.data, "git-manager")
                        : response.data
                );
            })
            .catch(function (err) {
                console.error("save_roles failed", err);
            });
    });

    $("#git-manager-form").on("submit", function (e) {
        e.preventDefault();
        var data = {
            git_repo_path: $("#git_repo_path").val(),
        };
        showGitManagerLoading();
        gmPost("git_manager_save_path", data)
            .then(function (response) {
                renderGitManagerOutput(response, "default");
            })
            .finally(function () {
                hideGitManagerLoading();
            })
            .catch(function (err) {
                console.error("save_path failed", err);
            });
    });

    $("#git-fetch, #git-pull").on("click", function () {
        var action = $(this).attr("id").replace("git-", "");
        showGitManagerLoading();
        gmPost("git_manager_" + action)
            .then(function (response) {
                renderGitManagerOutput(response, "default");
                // If this was a pull, also refresh the log to show latest commits
                if (action === "pull" && $("#git-log").length) {
                    $("#git-log").trigger("click");
                }
            })
            .finally(function () {
                hideGitManagerLoading();
            })
            .catch(function (err) {
                console.error(action + " failed", err);
            });
    });

    $("#git-log").on("click", function () {
        showGitManagerLoading();
        gmPost("git_manager_log")
            .then(function (response) {
                if (response.success && Array.isArray(response.data)) {
                    var html = '<div class="git-commits-list">';
                    response.data.forEach(function (commit) {
                        var avatar =
                            "https://www.gravatar.com/avatar/" +
                            md5(commit.email.trim().toLowerCase()) +
                            "?s=40&d=identicon";
                        html +=
                            '<div class="git-commit-item" style="border-bottom:1px solid #eee;padding:10px 0;display:flex;align-items:flex-start;">';
                        html +=
                            '<img src="' +
                            avatar +
                            '" style="border-radius:50%;margin-right:10px;" width="40" height="40">';
                        html += '<div style="flex:1;">';
                        html +=
                            '<div style="font-weight:bold;">' +
                            commit.subject +
                            "</div>";
                        html +=
                            '<div style="font-size:12px;color:#666;">' +
                            commit.author +
                            " &lt;" +
                            commit.email +
                            "&gt; | " +
                            commit.date +
                            "</div>";
                        html +=
                            '<div style="font-size:12px;color:#888;margin:5px 0;">' +
                            __("Commit:", "git-manager") +
                            ' <span style="font-family:monospace;">' +
                            commit.hash.substring(0, 7) +
                            "</span></div>";
                        if (commit.files && commit.files.length) {
                            html +=
                                '<div style="margin-top:5px;"><b>' +
                                __("Files:", "git-manager") +
                                '</b><ul style="margin:0 0 0 15px;padding:0;font-size:12px;">';
                            commit.files.forEach(function (f) {
                                html += "<li>" + f + "</li>";
                            });
                            html += "</ul></div>";
                        }
                        html += "</div></div>";
                    });
                    html += "</div>";
                    $("#git-manager-output-content").html(html);
                } else {
                    renderGitManagerOutput(response.data, "log");
                }
            })
            .finally(function () {
                hideGitManagerLoading();
            })
            .catch(function (err) {
                console.error("git_log failed", err);
            });
    });

    // Troubleshooting button
    $("#git-troubleshoot").on("click", function () {
        showGitManagerLoading(
            __("Running troubleshooting, please wait...", "git-manager")
        );
        gmPost("git_manager_troubleshoot")
            .then(function (response) {
                $("#git-manager-output").addClass("troubleshoot-mode");
                $("#git-manager-output-content").html(
                    '<div class="troubleshoot-content">' +
                        response.data +
                        "</div>"
                );
            })
            .finally(function () {
                hideGitManagerLoading();
            })
            .catch(function (err) {
                console.error("troubleshoot failed", err);
            });
        // Remove troubleshoot-mode class on next action (any other button click)
        $(document).one(
            "click",
            "#git-status, #git-fetch, #git-pull, #git-branch, #git-log, #git-checkout",
            function () {
                $("#git-manager-output").removeClass("troubleshoot-mode");
                $("#git-manager-output-content").html("");
            }
        );
    });
});
