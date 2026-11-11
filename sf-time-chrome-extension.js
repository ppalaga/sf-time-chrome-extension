(() => {
    'use strict';

    const titleSelector = '[id$="--timeRecordingTitle-main"]';
    const tableSelector = '[data-help-id="tlm-ts-daysSummaryTable"]';
    const buttonId = 'sf-time-apply-planned-to-all';
    let running = false;

    const delay = () => new Promise(resolve => setTimeout(resolve, 100));

    async function waitFor(predicate, message) {
        const deadline = Date.now() + 30000;
        do {
            if (predicate()) return;
            await delay();
        } while (Date.now() < deadline);
        throw new Error(message);
    }

    function controls() {
        const core = window.sap?.ui?.getCore();
        const title = document.querySelector(titleSelector);
        const table = document.querySelector(tableSelector);
        const viewId = title?.id.replace(/--timeRecordingTitle-main$/, '');
        const view = core?.byId(viewId);
        const summary = core?.byId(viewId?.replace(/timeRecordingView$/, 'timeSheetSummaryView'));
        const result = {
            button: core?.byId(`${viewId}--applyPlannedTimeBtn`),
            table: core?.byId(table?.id),
            view,
            layout: summary?.getController().oFlexibleColumnLayout,
            visuals: view?.getModel('visuals')
        };
        if (!result.button || !result.table || !result.view || !result.layout || !result.visuals) {
            throw new Error('SuccessFactors time entry controls are not ready.');
        }
        return result;
    }

    function day(view) {
        return view.getBindingContext()?.getObject();
    }

    async function applyAroundAbsences(current) {
        const shift = day(current.view);
        const controller = current.view.getController();
        const binding = controller.byId('recordsAbsence').getBinding('items');
        const contexts = await binding.requestContexts(0, shift.summary.absences);
        if (contexts.length !== shift.summary.absences || day(current.view)?.shiftDate !== shift.shiftDate) {
            throw new Error('Could not load all absences for the selected day.');
        }
        const records = SFTimeIntervals.complement(shift, contexts.map(context => context.getObject()));
        if (!records.length) return 0; // A full day of absence already satisfies the target.

        // The native action disallows any absence. Reuse its other enablement
        // checks, without changing the application's day data or its button state.
        const withoutAbsences = { ...shift, summary: { ...shift.summary, absences: 0 } };
        const permitted = controller.formatter.toEnabledApplyPlannedTimeButton(
            current.visuals.getProperty('/isMaintainable'), withoutAbsences,
            current.visuals.getProperty('/pendingChanges'),
            current.visuals.getProperty('/flexibleApprovalPeriodRecord/flexibleApprovalPeriod'));
        if (!permitted || shift.isCicoEnabled ||
            !(shift.attendances_create_mc || shift.attendanceRecordings_create_mc) ||
            shift.summary.attendances !== 0) {
            throw new Error('Cannot add complementary time to this day. Check permissions and existing work entries.');
        }
        const items = controller.getWorkingTimeList(shift).getBinding('items');
        for (const record of records) {
            // Use the same record creation and field-control flow as the native action.
            const context = controller.createRecord(items, {
                ...record,
                mdfSystemRecordId: crypto.randomUUID().replace(/-/g, ''),
                externalCode: crypto.randomUUID().replace(/-/g, '')
            });
            controller.handleFieldControlCalculationApplyPlannedTime(context);
        }
        controller.publishEvent('timesheetday', 'saveTimeSheetChanges', {
            event: { getSource: () => current.button }
        });
        return records.length;
    }

    async function applyToSelectedDays() {
        if (running) return;
        running = true;
        let completed = 0;
        let total = 0;
        let currentDate = '';
        updateButton();
        try {
            const initial = controls();
            if (initial.layout.getBusy() || initial.visuals.getProperty('/pendingChanges')) {
                throw new Error('Finish saving or discard your current edits first.');
            }
            // The native save action clears selection. Snapshot dates, not DOM IDs or row indexes.
            const dates = [...new Set(initial.table.getSelectedItems().map(item =>
                item.getBindingContext().getProperty('shiftDate')))];
            total = dates.length;
            if (!total) throw new Error('Select at least one day using the checkboxes in the left pane.');

            for (const date of dates) {
                currentDate = date;
                const { table } = controls();
                const item = table.getItems().find(row =>
                    row.getBindingContext()?.getProperty('shiftDate') === date);
                if (!item) throw new Error('The selected day is no longer in the displayed timesheet.');
                table.fireItemPress({ listItem: item, srcControl: item });
                await waitFor(() => {
                    const current = controls();
                    return day(current.view)?.shiftDate === date && !current.layout.getBusy();
                }, 'Timed out opening the selected day.');

                const current = controls();
                if (current.visuals.getProperty('/pendingChanges')) {
                    throw new Error('There are unsaved edits. Finish saving or discard them first.');
                }
                const before = day(current.view).summary.attendances;
                let expectedRecords = 1;
                if (day(current.view).summary.absences > 0) {
                    expectedRecords = await applyAroundAbsences(current);
                    if (!expectedRecords) {
                        completed++;
                        continue;
                    }
                } else {
                    if (!current.button.getVisible() || !current.button.getEnabled()) {
                        throw new Error('Apply Planned Time is unavailable for this day.');
                    }
                    current.button.firePress();
                }
                // triggerAction sets the layout busy synchronously. A confirmation dialog
                // (for example, on an approved timesheet) must be handled by the user.
                if (!current.layout.getBusy()) {
                    throw new Error('The save did not start. Check SuccessFactors for a confirmation or error.');
                }
                await waitFor(() => !current.layout.getBusy(), 'Timed out saving. Check the day before retrying.');
                const saved = day(current.view);
                if (saved?.shiftDate !== date || current.visuals.getProperty('/pendingChanges') ||
                    !(saved.summary.attendances >= before + expectedRecords)) {
                    throw new Error('Could not confirm that planned time was saved. Check SuccessFactors before retrying.');
                }
                completed++;
            }
            window.alert(`Applied planned time to ${completed} selected day(s).`);
        } catch (error) {
            window.alert(`Applied planned time to ${completed} of ${total} selected day(s).` +
                `${currentDate ? ` Stopped at ${currentDate}.` : ''}\n${error.message}`);
        } finally {
            running = false;
            updateButton();
        }
    }

    function updateButton() {
        const button = document.getElementById(buttonId);
        if (!button) return;
        button.disabled = running;
        const text = running ? 'Applying Planned…' : 'Complete selected days';
        if (button.textContent !== text) button.textContent = text;
    }

    function installButton() {
        const title = document.querySelector(titleSelector);
        if (!title || document.getElementById(buttonId)) return;
        const button = document.createElement('button');
        button.id = buttonId;
        button.type = 'button';
        button.title = 'Complete selected days';
        // Do not clone SAP control IDs or data-sap-ui attributes: this is a separate DOM button.
        button.style.cssText = 'background:#188038;color:white;border:1px solid #146c2e;' +
            'border-radius:0.5rem;padding:0.5rem 0.75rem;margin-inline-start:0.5rem;' +
            'font:inherit;white-space:nowrap;cursor:pointer;flex-shrink:0';
        button.addEventListener('click', applyToSelectedDays);
        // The native action and its toolbar can disappear on non-working days.
        // Keep our action in the persistent title row, outside that toolbar.
        title.append(button);
        updateButton();
    }

    // SAP UI5 can render the toolbar after startup or replace it on navigation.
    new MutationObserver(installButton).observe(document.body, { childList: true, subtree: true });
    installButton();
})();
