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
    // Replace branch input with a styled dropdown and button
    $("#git-branch").after(
        '<select id="git-branch-list" class="form-select d-inline-block" style="width:220px;margin-left:10px;vertical-align:middle;margin: 0;padding-right: 22px !important;"></select>' +
            '<button class="btn btn-outline-primary ms-2" id="git-checkout"><i class="fa-solid fa-right-left"></i> ' +
            __("Checkout", "git-manager") +
            "</button>"
    );

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
        gmPost("git_manager_get_branches", data)
            .then(function (response) {
                if (response.success && response.data.length) {
                    // Get current branch
                    gmPost("git_manager_latest_commit")
                        .then(function (branchResp) {
                            var currentBranch =
                                branchResp.success && branchResp.data.branch
                                    ? branchResp.data.branch
                                    : null;
                            var html = "";
                            response.data.forEach(function (branch) {
                                html +=
                                    '<option value="' +
                                    branch.name +
                                    '"' +
                                    (branch.name === currentBranch
                                        ? " selected"
                                        : "") +
                                    ">" +
                                    branch.name +
                                    " (" +
                                    branch.date.split("T")[0] +
                                    ")</option>";
                            });
                            $("#git-branch-list").html(html);
                        })
                        .catch(function (err) {
                            console.error("latest_commit failed", err);
                        });
                } else {
                    $("#git-branch-list").html(
                        "<option>" +
                            __("no branch", "git-manager") +
                            "</option>"
                    );
                }
            })
            .catch(function (err) {
                console.error("get_branches failed", err);
            });
    }
    loadBranches();
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
});
