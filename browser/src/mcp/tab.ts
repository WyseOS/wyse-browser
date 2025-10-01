import type * as playwright from 'playwright';
import { EventEmitter } from 'events';
import type { Context } from './context';

export type FileUploadModalState = {
  type: 'fileChooser';
  description: string;
  fileChooser: playwright.FileChooser;
  clearedBy: string;
};

export type DialogModalState = {
  type: 'dialog';
  description: string;
  dialog: playwright.Dialog;
  clearedBy: string;
};

export type ModalState = FileUploadModalState | DialogModalState;
export const TabEvents = {
    modalState: 'modalState'
};

export type TabEventsInterface = {
    [TabEvents.modalState]: [modalState: ModalState];
};


export class Tab extends EventEmitter<TabEventsInterface> {
    readonly page: playwright.Page;
    readonly context: Context;
    private _modalStates: ModalState[] = [];

    constructor(context: Context, page: playwright.Page, onPageClose: (tab: Tab) => void) {
        super();
        this.context = context;

        this.page = page;

        // page.on('filechooser', chooser => {
        //     this.setModalState({
        //         type: 'fileChooser',
        //         description: 'File chooser',
        //         fileChooser: chooser,
        //         clearedBy: uploadFile.schema.name,
        //     });
        // });
        page.on('dialog', dialog => this._dialogShown(dialog));
    }

    modalStates(): ModalState[] {
        return this._modalStates;
    }

    setModalState(modalState: ModalState) {
        this._modalStates.push(modalState);
        this.emit(TabEvents.modalState, modalState);
    }

    private _dialogShown(dialog: playwright.Dialog) {
        this.setModalState({
            type: 'dialog',
            description: `"${dialog.type()}" dialog with message "${dialog.message()}"`,
            dialog,
            clearedBy: 'dialog' //handleDialog.schema.name
        });
    }
}

