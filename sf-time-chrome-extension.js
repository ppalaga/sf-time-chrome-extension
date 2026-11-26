(() => {
    'use strict';

    const titleSelector = '[id$="--timeRecordingTitle-main"]';
    const tableSelector = '[data-help-id="tlm-ts-daysSummaryTable"]';
    const headerSelector = '#bizXShellBarContainer';
    const buttonId = 'sf-time-apply-planned-to-all';
    const weekdaysId = 'sf-time-select-weekdays';
    const panelId = 'sf-time-panel';
    const panelWidth = '10rem';
    let running = false;
    let panelVisible = false;

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

    function selectWeekdays(table) {
        for (const item of table.getItems()) {
            const date = item.getBindingContext()?.getProperty('shiftDate');
            if (!date) continue;
            // 0 is Sunday and 6 is Saturday.
            const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
            const select = weekday >= 1 && weekday <= 5;
            // Fire selectionChange, as a click on the row's checkbox does, so that
            // SuccessFactors' own record of the selected days stays in step.
            if (item.getSelected() !== select) table.setSelectedItem(item, select, true);
        }
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
            if (document.getElementById(weekdaysId)?.checked) selectWeekdays(initial.table);
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
            updatePanel();
        }
    }

    function updateButton() {
        const button = document.getElementById(buttonId);
        if (!button) return;
        button.disabled = running;
        button.style.opacity = running ? '0.6' : '1';
        button.style.cursor = running ? 'progress' : 'pointer';
        const text = running ? 'Applying Planned…' : 'Complete selected days';
        if (button.textContent !== text) button.textContent = text;
        const weekdays = document.getElementById(weekdaysId);
        if (weekdays) weekdays.disabled = running;
    }

    function createPanel() {
        // Plain DOM styled inline, without SAP control IDs, classes or data-sap-ui
        // attributes, so that SAP UI5 neither adopts nor re-renders it.
        const panel = document.createElement('aside');
        panel.id = panelId;
        panel.setAttribute('aria-label', 'SF Time extension');
        // SAP UI5 popups start at z-index 10, so they still open above the panel.
        panel.style.cssText = `position:fixed;top:0;right:0;bottom:0;width:${panelWidth};z-index:1;` +
            'box-sizing:border-box;display:none;flex-direction:column;gap:0.75rem;padding:1rem 0.75rem;' +
            'background:var(--sapBackgroundColor,#f5f6f7);color:var(--sapTextColor,#1d2d3e);' +
            'border-inline-start:1px solid var(--sapList_BorderColor,#e5e5e5);' +
            'font-family:var(--sapFontFamily,Arial,Helvetica,sans-serif);font-size:0.875rem';
        const heading = document.createElement('div');
        heading.textContent = 'SF Time';
        heading.style.cssText = 'font-weight:bold;color:var(--sapContent_LabelColor,#556b82)';
        const label = document.createElement('label');
        label.title = 'Before processing, select Monday to Friday and unselect Saturday and Sunday';
        label.style.cssText = 'display:flex;align-items:flex-start;gap:0.375rem;cursor:pointer';
        const weekdays = document.createElement('input');
        weekdays.id = weekdaysId;
        weekdays.type = 'checkbox';
        weekdays.checked = true;
        weekdays.style.cssText = 'margin:0.125rem 0 0;flex-shrink:0;accent-color:#188038;cursor:inherit';
        label.append(weekdays, 'Select Monday-Friday');
        const button = document.createElement('button');
        button.id = buttonId;
        button.type = 'button';
        button.title = 'Apply planned time to the days selected in the time sheet';
        button.style.cssText = 'background:#188038;color:white;border:1px solid #146c2e;' +
            'border-radius:0.5rem;padding:0.5rem 0.75rem;font:inherit';
        button.addEventListener('click', applyToSelectedDays);
        panel.append(heading, label, button);
        document.body.append(panel);
        updateButton();
        // The global header is fixed to the full window width (100vw) and does not
        // narrow with the page, so the panel starts below it instead of covering it.
        const header = document.querySelector(headerSelector);
        if (header) {
            new ResizeObserver(() => {
                panel.style.top = `${Math.max(0, header.getBoundingClientRect().bottom)}px`;
            }).observe(header);
        }
        return panel;
    }

    function updatePanel() {
        // Keep the panel while a batch runs, even if SAP UI5 re-renders the time sheet.
        const show = running || !!document.querySelector(`${titleSelector}, ${tableSelector}`);
        let panel = document.getElementById(panelId);
        if (show === panelVisible && (panel || !show)) return;
        if (show && !panel) panel = createPanel();
        panelVisible = show;
        if (panel) panel.style.display = show ? 'flex' : 'none';
        // Narrow the page rather than cover its right edge. The page origin stays
        // put, so SAP UI5 keeps positioning its popups correctly.
        const root = document.documentElement;
        if (show) root.style.setProperty('width', `calc(100% - ${panelWidth})`, 'important');
        else root.style.removeProperty('width');
    }

    // SAP UI5 can render the time sheet after startup or replace it on navigation.
    new MutationObserver(updatePanel).observe(document.body, { childList: true, subtree: true });
    updatePanel();
})();
