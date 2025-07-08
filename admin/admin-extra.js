jQuery(document).ready(function ($) {
    const { __ } = wp.i18n;
    // Replace branch input with a dropdown loaded from server
    $("#git-branch").after(
        '<select id="git-branch-list" style="width:300px; margin-left:10px;"></select><button class="button" id="git-checkout">' +
            __("Checkout", "git-manager") +
            "</button>"
    );

    function loadBranches() {
        var data = {
            action: "git_manager_get_branches",
            _git_manager_nonce: $("#git_manager_nonce").val(),
        };
        $.post(ajaxurl, data, function (response) {
            if (response.success && response.data.length) {
                // Get current branch
                $.post(
                    ajaxurl,
                    {
                        action: "git_manager_latest_commit",
                        _git_manager_nonce: $("#git_manager_nonce").val(),
                    },
                    function (branchResp) {
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
                    }
                );
            } else {
                $("#git-branch-list").html(
                    "<option>" + __("no branch", "git-manager") + "</option>"
                );
            }
        });
    }
    loadBranches();

    $("#git-checkout").on("click", function () {
        var branch = $("#git-branch-list").val();
        if (!branch) return alert(__("Branch name required!", "git-manager"));
        var data = {
            action: "git_manager_checkout",
            branch: branch,
            _git_manager_nonce: $("#git_manager_nonce").val(),
        };
        $.post(ajaxurl, data, function (response) {
            $("#git-manager-output").html(response.data);
            loadBranches(); // reload after checkout
            // Also refresh the log to show latest commits for the new branch
            if (window.jQuery && $("#git-log").length) {
                $("#git-log").trigger("click");
            }
        });
    });
});
