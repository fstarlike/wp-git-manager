// Custom submit for repo path with loading and trailing slash fix
jQuery(document).ready(function ($) {
    const { __ } = wp.i18n;
    // small fetch-based POST helper (local to this file)
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
    // Replace branch input with a searchable dropdown + hidden select (keeps compatibility)
    $("#git-branch").after(
        '<select id="git-branch-list" class="form-select d-inline-block" style="display:none;"></select>' +
            '<div class="git-branch-search-wrapper d-inline-block" style="vertical-align:middle;margin-left:10px;position:relative;">' +
            '<input id="git-branch-search" class="git-branch-search-input" placeholder="' +
            __("Loading...", "git-manager") +
            '" autocomplete="off" disabled />' +
            '<div id="git-branch-search-list" class="git-branch-search-list" style="display:none;position:absolute;z-index:50;max-height:220px;overflow:auto;background:#fff;border:1px solid #e0e7ef;border-radius:6px;box-shadow:0 6px 18px rgba(20,30,60,0.08);width:320px;margin-top:6px;left:0;">' +
            "</div>" +
            "</div>" +
            '<button class="btn btn-outline-primary ms-2" id="git-checkout"><i class="fa-solid fa-right-left"></i> ' +
            __("Checkout", "git-manager") +
            "</button>"
    );

    // --- Branch helpers: normalize and dedupe ---
    function normalizeBranchName(name) {
        if (!name) return name;
        name = name.toString();
        // remove common refs/remotes prefixes
        name = name.replace(/^refs\/heads\//, "");
        name = name.replace(/^refs\/remotes\//, "");
        name = name.replace(/^remotes\//, "");
        var parts = name.split("/");
        return parts[parts.length - 1];
    }

    function isRemoteBranchName(name) {
        if (!name) return false;
        return (
            /(^origin\/)|(^remotes\/)|(^refs\/remotes\/)/.test(name) ||
            /\borigin\//.test(name)
        );
    }

    function dedupeBranches(branches) {
        // prefer non-remote branch when duplicate short name exists; otherwise prefer newest by date
        var map = {};
        branches.forEach(function (branch) {
            var key = normalizeBranchName(branch.name);
            if (!key) return;
            if (!map[key]) {
                map[key] = branch;
            } else {
                var existing = map[key];
                var existingRemote = isRemoteBranchName(existing.name);
                var newRemote = isRemoteBranchName(branch.name);
                if (existingRemote && !newRemote) {
                    // prefer the non-remote branch
                    map[key] = branch;
                } else if (existingRemote === newRemote) {
                    // both remote or both non-remote: prefer newer date if available
                    var ed = Date.parse(existing.date || 0) || 0;
                    var nd = Date.parse(branch.date || 0) || 0;
                    if (nd > ed) map[key] = branch;
                }
            }
        });
        // return in original-ish order: iterate input and collect unique normalized keys
        var seen = {};
        var out = [];
        branches.forEach(function (branch) {
            var key = normalizeBranchName(branch.name);
            if (!key || seen[key]) return;
            seen[key] = true;
            out.push(map[key]);
        });
        return out;
    }

    // --- Loading Overlay Functions ---
    function showGitManagerLoading(msg) {
        $("#git-manager-loading-overlay .loading-text").text(
            msg || __("Loading, please wait...", "git-manager")
        );
        $("#git-manager-loading-overlay").addClass("active");
    }
    function hideGitManagerLoading() {
        $("#git-manager-loading-overlay").removeClass("active");
    }

    // --- Save Path Handler ---
    $("#git-manager-form").on("submit", function (e) {
        e.preventDefault();
        var $form = $(this);
        var $btn = $form.find('button[type="submit"]');
        var path = $("#git_repo_path").val();
        // Remove trailing slashes (both / and \\) on client side
        path = path.replace(/[\\/]+$/, "");
        $("#git_repo_path").val(path);
        showGitManagerLoading(__("Saving path...", "git-manager"));
        $btn.prop("disabled", true);
        gmPost("git_manager_save_path", { git_repo_path: path })
            .then(function (response) {
                if (response.success) {
                    $("#git-manager-output-content").html(
                        '<span class="text-success">' +
                            response.data +
                            "</span>"
                    );
                } else {
                    $("#git-manager-output-content").html(
                        '<span class="text-danger">' + response.data + "</span>"
                    );
                }
            })
            .finally(function () {
                $btn.prop("disabled", false).html(
                    '<i class="fa-solid fa-floppy-disk"></i> ' +
                        __("Save Path", "git-manager")
                );
                hideGitManagerLoading();
            })
            .catch(function (err) {
                console.error("save_path failed", err);
            });
    });

    // --- Branches Loader ---
    function loadBranches() {
        var data = {};
        $("#git-branch-list").html(
            "<option disabled selected>" +
                __("Loading...", "git-manager") +
                "</option>"
        );
        // Fetch branches and latest commit in parallel to avoid sequential delay
        Promise.all([
            gmPost("git_manager_get_branches", data),
            gmPost("git_manager_latest_commit"),
        ])
            .then(function (results) {
                var response = results[0];
                var branchResp = results[1];
                if (response.success && response.data && response.data.length) {
                    var currentBranch =
                        branchResp &&
                        branchResp.success &&
                        branchResp.data.branch
                            ? branchResp.data.branch
                            : null;
                    var html = "";
                    var searchHtml = "";
                    // normalize function to compare branch names (strip refs/heads/ and remote prefixes)
                    function normalize(name) {
                        if (!name) return name;
                        name = name.toString();
                        name = name.replace(/^refs\/heads\//, "");
                        var parts = name.split("/");
                        return parts[parts.length - 1];
                    }
                    var normalizedCurrent = normalize(currentBranch);
                    // dedupe branches by short name (prefer local over remote)
                    var branches = dedupeBranches(response.data);
                    branches.forEach(function (branch) {
                        var normalizedBranch = normalize(branch.name);
                        var label =
                            branch.name +
                            " (" +
                            (branch.date ? branch.date.split("T")[0] : "") +
                            ")";
                        if (normalizedBranch === normalizedCurrent) {
                            label += " - " + __("Current", "git-manager");
                        }
                        html +=
                            '<option value="' +
                            branch.name +
                            '"' +
                            (normalizedBranch === normalizedCurrent
                                ? " selected"
                                : "") +
                            ">" +
                            label +
                            "</option>";
                        searchHtml +=
                            '<div class="git-branch-item' +
                            (normalizedBranch === normalizedCurrent
                                ? " selected"
                                : "") +
                            '" data-branch="' +
                            branch.name +
                            '">' +
                            branch.name +
                            "</div>";
                    });
                    $("#git-branch-list").html(html);
                    $("#git-branch-search-list").html(searchHtml).hide();
                    // set search input to current branch short name
                    if (normalizedCurrent) {
                        $("#git-branch-search").val(normalizedCurrent);
                    }
                    // enable search input now that branches are loaded
                    $("#git-branch-search")
                        .prop("disabled", false)
                        .attr(
                            "placeholder",
                            __("Search branch...", "git-manager")
                        );
                } else {
                    $("#git-branch-list").html(
                        "<option>" +
                            __("no branch", "git-manager") +
                            "</option>"
                    );
                    // ensure input is enabled even if no branches
                    $("#git-branch-search")
                        .prop("disabled", false)
                        .attr(
                            "placeholder",
                            __("Search branch...", "git-manager")
                        );
                }
            })
            .catch(function (err) {
                console.error("get_branches failed", err);
                // on error, re-enable input so user can try again
                $("#git-branch-search")
                    .prop("disabled", false)
                    .attr("placeholder", __("Search branch...", "git-manager"));
            });
    }
    loadBranches();
    // When top-level Branches button is clicked, load and render the branch panel in the output area
    $(document).on("click", "#git-branch", function (e) {
        e.preventDefault();
        e.stopImmediatePropagation(); // prevent generic handler in admin.js
        showGitManagerLoading(__("Loading branches...", "git-manager"));
        // Fetch branches + current branch in parallel to minimize UI flash
        Promise.all([
            gmPost("git_manager_get_branches"),
            gmPost("git_manager_latest_commit"),
        ])
            .then(function (results) {
                var response = results[0];
                var branchResp = results[1];
                if (response.success && response.data && response.data.length) {
                    var currentBranch =
                        branchResp &&
                        branchResp.success &&
                        branchResp.data.branch
                            ? branchResp.data.branch
                            : null;
                    var html = '<div class="git-branch-panel">';
                    function normalize(name) {
                        if (!name) return name;
                        name = name.toString();
                        name = name.replace(/^refs\/heads\//, "");
                        var parts = name.split("/");
                        return parts[parts.length - 1];
                    }
                    var normalizedCurrent = normalize(currentBranch);
                    // dedupe branches before rendering
                    var branches = dedupeBranches(response.data);
                    branches.forEach(function (branch) {
                        var normalizedBranch = normalize(branch.name);
                        html +=
                            '<div class="git-branch-item' +
                            (normalizedBranch === normalizedCurrent
                                ? " selected"
                                : "") +
                            '" data-branch="' +
                            branch.name +
                            '">' +
                            '<div class="branch-name">' +
                            branch.name +
                            "</div>" +
                            '<div class="branch-meta"><span class="branch-date">' +
                            (branch.date ? branch.date.split("T")[0] : "") +
                            "</span>" +
                            (normalizedBranch === normalizedCurrent
                                ? '<span class="branch-badge">Current</span>'
                                : "") +
                            "</div>" +
                            "</div>";
                    });
                    // set the search input to current branch short name for convenience
                    if (normalizedCurrent) {
                        $("#git-branch-search").val(normalizedCurrent);
                    }
                    html += "</div>";
                    $("#git-manager-output-content").html(html);
                } else {
                    $("#git-manager-output-content").html(
                        '<div class="git-branch-panel-empty">' +
                            __("No branches found.", "git-manager") +
                            "</div>"
                    );
                }
            })
            .catch(function (err) {
                console.error("get_branches failed", err);
                $("#git-manager-output-content").html(
                    '<div class="git-branch-panel-empty">' +
                        __("Failed to load branches.", "git-manager") +
                        "</div>"
                );
            })
            .finally(function () {
                hideGitManagerLoading();
            });
    });
    // --- Checkout Handler ---
    $(document).on("click", "#git-checkout", function () {
        var branch = $("#git-branch-list").val();
        if (!branch) return alert(__("Branch name required!", "git-manager"));
        var data = {
            action: "git_manager_checkout",
            branch: branch,
            _git_manager_nonce: $("#git_manager_nonce").val(),
        };
        var $btn = $(this);
        showGitManagerLoading(__("Switching branch...", "git-manager"));
        $btn.prop("disabled", true);
        gmPost("git_manager_checkout", { branch: branch })
            .then(function (response) {
                $("#git-manager-output").html(response.data);
                loadBranches(); // reload after checkout
                if (window.jQuery && $("#git-log").length) {
                    $("#git-log").trigger("click");
                }
            })
            .finally(function () {
                $btn.prop("disabled", false).html(
                    '<i class="fa-solid fa-right-left"></i> ' +
                        __("Checkout", "git-manager")
                );
                hideGitManagerLoading();
            })
            .catch(function (err) {
                console.error("checkout failed", err);
            });
    });
    // --- Global AJAX overlay for all main action buttons ---
    $(document).on(
        "click",
        "#git-status, #git-fetch, #git-troubleshoot, #git-pull, #git-branch, #git-log",
        function () {
            showGitManagerLoading();
        }
    );
    // Hide overlay after AJAX completes for these actions
    $(document).ajaxStop(function () {
        hideGitManagerLoading();
    });
    // Custom modal logic (no Bootstrap)
    $(document).on("click", "#git-settings", function (e) {
        e.preventDefault();
        $("#gitManagerSettingsModal").addClass("active");
    });
    $(document).on("click", "#gitManagerSettingsClose", function () {
        $("#gitManagerSettingsModal").removeClass("active");
    });
    // Close modal on outside click
    $(document).on("mousedown", function (e) {
        var modal = $("#gitManagerSettingsModal");
        if (
            modal.hasClass("active") &&
            !$(e.target).closest(".modal-content, #git-settings").length
        ) {
            modal.removeClass("active");
        }
    });
    // Search input interactions: filter, show on focus/click, keyboard nav
    $(document).on("input", "#git-branch-search", function () {
        var q = $(this).val().toLowerCase();
        var $list = $("#git-branch-search-list");
        if (!q) {
            $list.find(".git-branch-item").show().removeClass("active");
        } else {
            $list.find(".git-branch-item").each(function () {
                var name = $(this).data("branch") || "";
                $(this)
                    .toggle(name.toLowerCase().indexOf(q) !== -1)
                    .removeClass("active");
            });
        }
        // show list when typing
        if ($list.children().length) $list.show();
        $(this).attr("aria-expanded", "true");
    });

    // Show the list when the input is focused or clicked
    $(document).on("focus click", "#git-branch-search", function (e) {
        var $list = $("#git-branch-search-list");
        if ($list.children().length) {
            $list.show();
            $(this).attr("aria-expanded", "true");
        }
    });

    // click on branch item selects it and immediately checks it out
    $(document).on("click", ".git-branch-item", function () {
        var b = $(this).data("branch");
        if (!b) return;
        $("#git-branch-list").val(b).trigger("change");
        $("#git-branch-search").val(b);
        $("#git-branch-search-list").hide();
        $("#git-branch-search").attr("aria-expanded", "false");
        // perform checkout immediately for better UX
        try {
            showGitManagerLoading(__("Switching branch...", "git-manager"));
            gmPost("git_manager_checkout", { branch: b })
                .then(function (response) {
                    // show result and refresh branches/log like the manual checkout
                    $("#git-manager-output").html(response.data);
                    loadBranches(); // reload after checkout
                    if (window.jQuery && $("#git-log").length) {
                        $("#git-log").trigger("click");
                    }
                })
                .catch(function (err) {
                    console.error("checkout failed", err);
                })
                .finally(function () {
                    hideGitManagerLoading();
                });
        } catch (e) {
            console.error(e);
        }
    });

    // Keyboard navigation for branch list
    $(document).on("keydown", "#git-branch-search", function (e) {
        var $list = $("#git-branch-search-list");
        var $items = $list.find(".git-branch-item:visible");
        if ($items.length === 0) return;

        var $active = $items.filter(".active").first();
        if (e.key === "ArrowDown") {
            e.preventDefault();
            if ($active.length === 0) {
                $items.removeClass("active");
                $items.first().addClass("active");
            } else {
                var $next = $active.nextAll(".git-branch-item:visible").first();
                if ($next.length) {
                    $active.removeClass("active");
                    $next.addClass("active");
                }
            }
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if ($active.length === 0) {
                $items.removeClass("active");
                $items.last().addClass("active");
            } else {
                var $prev = $active.prevAll(".git-branch-item:visible").first();
                if ($prev.length) {
                    $active.removeClass("active");
                    $prev.addClass("active");
                }
            }
        } else if (e.key === "Enter") {
            e.preventDefault();
            var $sel = $items.filter(".active").first();
            if ($sel.length === 0) $sel = $items.first();
            if ($sel.length) {
                var b = $sel.data("branch");
                $("#git-branch-list").val(b).trigger("change");
                $("#git-branch-search").val(b);
                $list.hide();
                $("#git-branch-search").attr("aria-expanded", "false");
            }
        } else if (e.key === "Escape") {
            $list.hide();
            $("#git-branch-search").attr("aria-expanded", "false");
        }
    });

    // hide dropdown when clicking outside
    $(document).on("click", function (e) {
        if ($(e.target).closest(".git-branch-search-wrapper").length === 0) {
            $("#git-branch-search-list").hide();
            $("#git-branch-search").attr("aria-expanded", "false");
        }
    });
});
