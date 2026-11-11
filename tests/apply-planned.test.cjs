const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup({ selected = ['Monday', 'Wednesday'], unavailable, failSave, pending = false, nativeHidden = false, absenceDays = {}, maintainable = true } = {}) {
    let active = 'Monday';
    let busy = false;
    let selectedDates = [...selected];
    let mutation;
    const elements = new Map();
    const alerts = [];
    const applied = [];
    const visited = [];
    const created = [];
    const calculated = [];
    const dates = ['Monday', 'Tuesday', 'Wednesday'];
    const records = Object.fromEntries(dates.map(shiftDate => [shiftDate, { shiftDate, summary: { attendances: 0 } }]));
    for (const [key, absences] of Object.entries(absenceDays)) {
        Object.assign(records[key], {
            usesClockTimeVariant: true, isWorkingDay: true, attendances_create_mc: true,
            plannedAttendanceSegments: [{ category: 'PLANNED_WORKING_TIME', startTime: '08:00', endTime: '16:00' }],
            absences, summary: { attendances: 0, absences: absences.length }
        });
    }
    // Real ISO dates are required by interval arithmetic; navigation labels are kept
    // for the existing tests, so use an ISO shift date just during calculation below.
    const rows = dates.map(date => ({ getBindingContext: () => ({ getProperty: () => date }) }));
    const original = { id: 'app---timeRecordingView--applyPlannedTimeBtn' };
    const title = {
        id: 'app---timeRecordingView--timeRecordingTitle-main',
        append(button) { elements.set(button.id, button); button.parentElement = title; }
    };
    const table = {
        getSelectedItems: () => rows.filter((_, i) => selectedDates.includes(dates[i])),
        getItems: () => rows,
        fireItemPress({ listItem }) {
            // Navigation is asynchronous; the old day must not receive the action.
            busy = true;
            setTimeout(() => {
                active = listItem.getBindingContext().getProperty();
                visited.push(active);
                busy = false;
            }, 5);
        }
    };
    const controls = {
        table,
        'app---timeRecordingView': {
            getBindingContext: () => ({ getObject: () => records[active] }),
            getModel: () => ({ getProperty: path => path === '/isMaintainable' ? maintainable : pending }),
            getController: () => ({
                byId: () => ({ getBinding: () => ({ requestContexts: async () =>
                    records[active].absences.map(absence => ({ getObject: () => absence })) }) }),
                formatter: { toEnabledApplyPlannedTimeButton: (allowed, day, edits) =>
                    allowed && day.isWorkingDay && !edits && day.summary.absences === 0 },
                getWorkingTimeList: () => ({ getBinding: () => ({}) }),
                createRecord: (_, record) => { created.push(record); return record; },
                handleFieldControlCalculationApplyPlannedTime: record => calculated.push(record),
                publishEvent: (channel, event, data) => {
                    assert.equal(channel, 'timesheetday');
                    assert.equal(event, 'saveTimeSheetChanges');
                    assert.equal(data.event.getSource(), controls[original.id]);
                    controls[original.id].firePress();
                }
            })
        },
        'app---timeSheetSummaryView': { getController: () => ({ oFlexibleColumnLayout: { getBusy: () => busy } }) },
        [original.id]: {
            getVisible: () => !nativeHidden || active !== 'Monday',
            getEnabled: () => active !== unavailable,
            firePress() {
                assert.equal(busy, false);
                applied.push(active);
                selectedDates = [];
                busy = true;
                setTimeout(() => {
                    if (active !== failSave) records[active].summary.attendances += created.length || 1;
                    busy = false;
                }, 5);
            }
        }
    };
    const document = {
        body: {},
        querySelector: selector => {
            if (selector === '[id$="--timeRecordingTitle-main"]') return title;
            if (selector === '[data-help-id="tlm-ts-daysSummaryTable"]') return { id: 'table' };
            if (selector.startsWith('button')) return nativeHidden ? null : original;
            return null;
        },
        getElementById: id => elements.get(id),
        createElement: () => ({ style: {}, addEventListener(_, fn) { this.click = fn; } })
    };
    vm.runInNewContext(fs.readFileSync('sf-time-chrome-extension.js', 'utf8'), {
        document, window: { sap: { ui: { getCore: () => ({ byId: id => controls[id] }) } }, alert: text => alerts.push(text) },
        MutationObserver: class { constructor(fn) { mutation = fn; } observe() {} },
        setTimeout, Date, crypto: require('node:crypto').webcrypto,
        SFTimeIntervals: { complement: (day, absences) =>
            require('../planned-time.js').complement({ ...day, shiftDate: '2026-11-11' }, absences) }
    });
    return { elements, alerts, applied, visited, created, calculated, mutation, button: () => elements.get('sf-time-apply-planned-to-all') };
}

test('installs once, reinstalls after toolbar replacement, and uses a green button', () => {
    const app = setup();
    const first = app.button();
    assert.equal(first.textContent, 'Complete selected days');
    assert.match(first.style.cssText, /background:#188038/);
    app.mutation();
    assert.equal(app.button(), first);
    app.elements.clear();
    app.mutation();
    assert.notEqual(app.button(), first);
});

test('applies only the snapshotted selection sequentially despite native selection clearing', async () => {
    const app = setup();
    const run = app.button().click();
    assert.equal(app.button().disabled, true);
    await app.button().click(); // Ignore repeated clicks while saving.
    await run;
    assert.deepEqual(app.applied, ['Monday', 'Wednesday']);
    assert.deepEqual(app.visited, ['Monday', 'Wednesday']);
    assert.equal(app.button().disabled, false);
    assert.match(app.alerts[0], /2 selected day/);
});

test('empty selection and pending edits do not apply anything', async () => {
    for (const options of [{ selected: [] }, { pending: true }]) {
        const app = setup(options);
        await app.button().click();
        assert.deepEqual(app.applied, []);
        assert.equal(app.alerts.length, 1);
    }
});

test('unavailable days stop processing and report partial completion', async () => {
    const app = setup({ unavailable: 'Wednesday' });
    await app.button().click();
    assert.deepEqual(app.applied, ['Monday']);
    assert.match(app.alerts[0], /1 of 2.*Stopped at Wednesday/);
});

test('failed save does not advance to the next selected day', async () => {
    const app = setup({ failSave: 'Monday' });
    await app.button().click();
    assert.deepEqual(app.applied, ['Monday']);
    assert.match(app.alerts[0], /Could not confirm/);
    assert.equal(app.button().disabled, false);
});


test('button is installed outside the native toolbar even when the native action is absent', async () => {
    const app = setup({ nativeHidden: true, selected: ['Wednesday'] });
    assert.equal(app.button().parentElement.id, 'app---timeRecordingView--timeRecordingTitle-main');
    assert.equal(app.button().textContent, 'Complete selected days');
    // Starting on a day with no rendered native button must still allow navigation
    // to a checked working day and lookup of its UI5 action.
    await app.button().click();
    assert.deepEqual(app.applied, ['Wednesday']);
    assert.match(app.alerts[0], /1 selected day/);
    app.elements.clear();
    app.mutation();
    assert.equal(app.button().textContent, 'Complete selected days');
});


test('absence days create complementary entries and save through the existing flow', async () => {
    const app = setup({ selected: ['Monday'], nativeHidden: true, unavailable: 'Monday', absenceDays: {
        Monday: [{ startTime: '10:00', endTime: '12:00', durationInMinutes: '120' }]
    } });
    await app.button().click();
    assert.deepEqual(app.created.map(r => [r.startTime, r.endTime, r.durationInMinutes]), [
        ['08:00:00', '10:00:00', '120'], ['12:00:00', '16:00:00', '240']
    ]);
    assert.equal(app.calculated.length, 2);
    assert.notEqual(app.created[0].externalCode, app.created[1].externalCode);
    assert.deepEqual(app.applied, ['Monday']);
    assert.match(app.alerts[0], /1 selected day/);
});

test('full-day absence needs no save and processing continues to the next day', async () => {
    const app = setup({ absenceDays: { Monday: [{ durationInMinutes: '480' }] } });
    await app.button().click();
    assert.deepEqual(app.created, []);
    assert.deepEqual(app.applied, ['Wednesday']);
    assert.match(app.alerts[0], /2 selected day/);
});

test('absence handling preserves permission checks and rejects ambiguous partial leave', async () => {
    for (const options of [
        { maintainable: false, absenceDays: { Monday: [{ startTime: '10:00', endTime: '12:00', durationInMinutes: '120' }] } },
        { absenceDays: { Monday: [{ durationInMinutes: '120' }] } }
    ]) {
        const app = setup(options);
        await app.button().click();
        assert.deepEqual(app.created, []);
        assert.deepEqual(app.applied, []);
        assert.match(app.alerts[0], /Stopped at Monday/);
    }
});
