// Bootstrap 5 + jQuery enhancements: responsive menu, responsive tables, contextual row colours, mobile-friendly modals.
$(function () {
  const menu = document.getElementById("ribbonMenu");

  // Collapse the module menu after choosing a page on phones and tablets (below the lg breakpoint).
  $(document).on("click", "[data-view]", function () {
    if (menu && window.innerWidth < 992) bootstrap.Collapse.getOrCreateInstance(menu, { toggle: false }).hide();
  });

  function enhance() {
    $("main table, .modal table").each(function () {
      const $t = $(this);
      if (!$t.parent().hasClass("table-responsive")) $t.wrap('<div class="table-responsive"></div>');
      // Bootstrap table design: zebra stripes, hover state, compact spacing, and aligned cells.
      // table-striped is the standard Bootstrap zebra-stripe class requested for documentation.
      $t.addClass("table table-striped table-hover table-sm align-middle");
      $t.children("tbody").addClass("table-group-divider");
      $t.children("thead").addClass("sticky-top");
      // Keep status colours on badges only; never tint the entire row by status.
      $t.find("tbody tr").removeClass("table-danger table-warning table-success table-secondary table-info");
    });
    // Modals: full screen on phones, scrollable body on every screen.
    $(".modal-dialog").addClass("modal-fullscreen-sm-down modal-dialog-scrollable");
  }

  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; enhance(); });
  }).observe(document.body, { childList: true, subtree: true });
  enhance();
});

// Clicking anywhere on a compact date field opens the browser's date picker (the native icon is hidden).
$(document).on("click", ".tap-date-range input[type=date]", function () { try { this.showPicker(); } catch (e) {} });
