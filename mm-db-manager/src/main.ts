import { onOpenMenu } from "./ui";
import { addMuseums as addMuseums_ } from "./add";
import { editMuseums as editMuseums_ } from "./edit";
import { trashMuseums as trashMuseums_ } from "./trash";
import { restoreMuseums as restoreMuseums_ } from "./restore";
import { permanentlyDeleteMuseums as permanentlyDeleteMuseums_ } from "./permanently-delete";

function onOpenImpl(e?: GoogleAppsScript.Events.SheetsOnOpen): void {
  onOpenMenu();
}
function addMuseums(): void { addMuseums_(); }
function editMuseums(): void { editMuseums_(); }
function trashMuseums(): void { trashMuseums_(); }
function restoreMuseums(): void { restoreMuseums_(); }
function permanentlyDeleteMuseums(): void { permanentlyDeleteMuseums_(); }

Object.assign(globalThis as any, {
  __mm_onOpen: onOpen,
  __mm_addMuseums: addMuseums,
  __mm_editMuseums: editMuseums,
  __mm_trashMuseums: trashMuseums,
  __mm_restoreMuseums: restoreMuseums,
  __mm_permanentlyDeleteMuseums: permanentlyDeleteMuseums,
});
