import { onOpenMenu } from "./ui";
import { add_museums } from "./add";
import { edit_museums } from "./edit";
import { trash_museums } from "./trash";
import { restore_museums } from "./restore";
import { permanently_delete_museums } from "./permanently_delete";

declare const global: any;

// expose triggers
global.onOpen = () => onOpenMenu();

// expose menu handlers
global.add_museums = () => add_museums();
global.edit_museums = () => edit_museums();
global.trash_museums = () => trash_museums();
global.restore_museums = () => restore_museums();
global.permanently_delete_museums = () => permanently_delete_museums();
