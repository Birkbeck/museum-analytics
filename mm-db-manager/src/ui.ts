export function onOpenMenu(): void {
  SpreadsheetApp.getUi()
    .createMenu("Mapping Museums Database")
    .addItem("Add selected museums in Add", "add_museums")
    .addItem("Commit selected edits in Edit", "edit_museums")
    .addItem("Trash selected museums in Delete", "delete_museums")
    .addItem("Permanently delete selected museums in Trash", "permanently_delete_museums")
    .addItem("Restore selected museums in Trash", "restore_museums")
    .addToUi();
}
