import { onOpenMenu } from "./ui";
import { addMuseums } from "./add";
import { editMuseums } from "./edit";
import { trashMuseums } from "./trash";
import { restoreMuseums } from "./restore";
import { permanentlyDeleteMuseums } from "./permanently-delete";

declare const global: any;

// expose triggers
global.onOpen = () => onOpenMenu();

// expose menu handlers
global.addMuseums = () => addMuseums();
global.editMuseums = () => editMuseums();
global.trashMuseums = () => trashMuseums();
global.restoreMuseums = () => restoreMuseums();
global.permanentlyDeleteMuseums = () => permanentlyDeleteMuseums();
