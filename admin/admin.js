jQuery(document).ready(function ($) {
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
    function checkForNewCommits() {
        var data = {
            action: "git_manager_latest_commit",
            _git_manager_nonce: $("#git_manager_nonce").val(),
        };
        $.post(ajaxurl, data, function (response) {
            if (
                response.success &&
                response.data &&
                response.data.hash &&
                response.data.branch &&
                response.data.remote_hash
            ) {
                var selectedBranch = $("#git-branch-list").val();
                // Only show alert if current branch matches selected branch and remote is ahead
                if (
                    response.data.branch === selectedBranch &&
                    response.data.remote_hash &&
                    response.data.remote_hash !== response.data.hash
                ) {
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
                    // Play a short valid beep (local file)
                    var audio = new Audio("beep.mp3");
                    audio.play();
                } else {
                    $("#git-new-commit-alert").remove();
                }

                // Play a short valid beep (local file)
                var audio = new Audio("beep.mp3");
                audio.play();

                lastCommitHash = response.data.hash;
                lastCommitBranch = response.data.branch;
            }
        });
    }
    setInterval(checkForNewCommits, 20000);
    checkForNewCommits();

    $("#git-status").on("click", function () {
        var data = {
            action: "git_manager_status",
            _git_manager_nonce: $("#git_manager_nonce").val(),
        };
        $.post(ajaxurl, data, function (response) {
            $("#git-manager-output").html(response.data);
        });
    });

    $("#git-manager-roles-form").on("submit", function (e) {
        e.preventDefault();
        var data = $(this).serializeArray();
        data.push({ name: "action", value: "git_manager_save_roles" });
        data.push({
            name: "_git_manager_nonce",
            value: $("#git_manager_nonce").val(),
        });
        $.post(ajaxurl, data, function (response) {
            alert(
                typeof response.data === "string"
                    ? __(response.data, "git-manager")
                    : response.data
            );
        });
    });

    $("#git-settings").on("click", function () {
        $("#git-manager-settings-panel").slideToggle();
    });

    $("#git-manager-form").on("submit", function (e) {
        e.preventDefault();
        var data = {
            action: "git_manager_save_path",
            git_repo_path: $("#git_repo_path").val(),
            _git_manager_nonce: $("#git_manager_nonce").val(),
        };
        $.post(ajaxurl, data, function (response) {
            $("#git-manager-output").html(response.data);
        });
    });

    $("#git-fetch, #git-pull, #git-branch").on("click", function () {
        var action = $(this).attr("id").replace("git-", "");
        var data = {
            action: "git_manager_" + action,
            _git_manager_nonce: $("#git_manager_nonce").val(),
        };
        $.post(ajaxurl, data, function (response) {
            $("#git-manager-output").html(response.data);
            // If this was a pull, also refresh the log to show latest commits
            if (action === "pull" && $("#git-log").length) {
                $("#git-log").trigger("click");
            }
        });
    });

    $("#git-log").on("click", function () {
        var data = {
            action: "git_manager_log",
            _git_manager_nonce: $("#git_manager_nonce").val(),
        };
        $.post(ajaxurl, data, function (response) {
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
                $("#git-manager-output").html(html);
            } else {
                $("#git-manager-output").html(response.data);
            }
        });
    });

    // Troubleshooting button
    $("#git-troubleshoot").on("click", function () {
        var data = {
            action: "git_manager_troubleshoot",
            _git_manager_nonce: $("#git_manager_nonce").val(),
        };
        $("#git-manager-output").html(
            '<div style="color:#888">' +
                __("Running troubleshooting, please wait...", "git-manager") +
                "</div>"
        );
        $.post(ajaxurl, data, function (response) {
            $("#git-manager-output").html(response.data);
        });
    });
});
