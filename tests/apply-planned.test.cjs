const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup({ selected = ['Monday', 'Wednesday'], unavailable, failSave, pending = false } = {}) {
    let active = 'Monday';
    let busy = false;
    let selectedDates = [...selected];
    let mutation;
    const elements = new Map();
    const alerts = [];
    const applied = [];
    const visited = [];
    const dates = ['Monday', 'Tuesday', 'Wednesday'];
    const records = Object.fromEntries(dates.map(shiftDate => [shiftDate, { shiftDate, summary: { attendances: 0 } }]));
    const rows = dates.map(date => ({ getBindingContext: () => ({ getProperty: () => date }) }));
    const original = { id: 'app---timeRecordingView--applyPlannedTimeBtn', after(button) { elements.set(button.id, button); } };
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
            getModel: () => ({ getProperty: () => pending })
        },
        'app---timeSheetSummaryView': { getController: () => ({ oFlexibleColumnLayout: { getBusy: () => busy } }) },
        [original.id]: {
            getVisible: () => true,
            getEnabled: () => active !== unavailable,
            firePress() {
                assert.equal(busy, false);
                applied.push(active);
                selectedDates = [];
                busy = true;
                setTimeout(() => {
                    if (active !== failSave) records[active].summary.attendances++;
                    busy = false;
                }, 5);
            }
        }
    };
    const document = {
        body: {},
        querySelector: selector => selector.startsWith('button') ? original : { id: 'table' },
        getElementById: id => elements.get(id),
        createElement: () => ({ style: {}, addEventListener(_, fn) { this.click = fn; } })
    };
    vm.runInNewContext(fs.readFileSync('sf-time-chrome-extension.js', 'utf8'), {
        document, window: { sap: { ui: { getCore: () => ({ byId: id => controls[id] }) } }, alert: text => alerts.push(text) },
        MutationObserver: class { constructor(fn) { mutation = fn; } observe() {} },
        setTimeout, Date
    });
    return { elements, alerts, applied, visited, mutation, button: () => elements.get('sf-time-apply-planned-to-all') };
}

test('installs once, reinstalls after toolbar replacement, and uses a green button', () => {
    const app = setup();
    const first = app.button();
    assert.equal(first.textContent, 'Apply Planned to all');
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
