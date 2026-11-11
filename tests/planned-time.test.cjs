const { test } = require('node:test');
const assert = require('node:assert/strict');
const { complement } = require('../planned-time.js');
const segment = (startTime, endTime, category = 'PLANNED_WORKING_TIME') => ({
    startTime, endTime, category, assignmentId: 'assignment',
    attendanceTypeExternalCode: 'WORK', attendanceTypeName: 'Working Time'
});
const shift = {
    shiftDate: '2026-11-11', usesClockTimeVariant: true,
    plannedAttendanceSegments: [segment('08:00', '12:00'), segment('13:00', '17:00')]
};
const leave = (startTime, endTime, durationInMinutes) => ({ startTime, endTime, durationInMinutes });
const times = records => records.map(record => [record.startTime, record.endTime, record.durationInMinutes]);

test('morning and afternoon leave produce complementary work totaling eight hours', () => {
    assert.deepEqual(times(complement(shift, [leave('08:00', '12:00', '240')])), [['13:00:00', '17:00:00', '240']]);
    assert.deepEqual(times(complement(shift, [leave('13:00', '17:00', '240')])), [['08:00:00', '12:00:00', '240']]);
});

test('midday and multiple absences split work without filling lunch breaks', () => {
    const records = complement(shift, [leave('10:00', '14:00', '180'), leave('15:00', '16:00', '60')]);
    assert.deepEqual(times(records), [
        ['08:00:00', '10:00:00', '120'], ['14:00:00', '15:00:00', '60'], ['16:00:00', '17:00:00', '60']
    ]);
    assert.equal(records.reduce((sum, r) => sum + Number(r.durationInMinutes), 240), 480);
    assert.equal(records[0].attendanceTypeExternalCode, 'WORK');
    assert.equal(records[0].physicalStartDate, shift.shiftDate);
});

test('explicit unpaid breaks are excluded from a continuous planned span', () => {
    const continuous = { ...shift, plannedAttendanceSegments: [segment('08:00', '17:00'), segment('12:00', '13:00', 'SCHEDULED_UNPAID_BREAK')] };
    assert.deepEqual(times(complement(continuous, [leave('08:00', '10:00', '120')])), [
        ['10:00:00', '12:00:00', '120'], ['13:00:00', '17:00:00', '240']
    ]);
});

test('full-day leave produces no work entries', () => {
    for (const absences of [[{ durationInDays: 1 }], [{ durationInMinutes: '480' }], [leave('08:00', '17:00', '480')]]) {
        assert.deepEqual(complement(shift, absences), []);
    }
});

test('ambiguous partial leave and inconsistent durations stop instead of guessing', () => {
    assert.throws(() => complement(shift, [{ durationInMinutes: '120' }]), /usable/);
    assert.throws(() => complement(shift, [leave('08:00', '10:00', '240')]), /durations/);
    assert.throws(() => complement(shift, [leave('08:00', '10:00', '120'), leave('09:00', '11:00', '120')]), /durations/);
    assert.throws(() => complement(shift, [leave('06:00', '07:00', '60')]), /durations/);
    assert.throws(() => complement({ ...shift, plannedAttendanceSegments: [segment('08:00', '12:00')] }, [leave('08:00', '10:00', '120')]), /eight hours/);
});

test('overnight spans preserve the correct physical dates', () => {
    const overnight = { ...shift, plannedAttendanceSegments: [{ ...segment('22:00', '06:00'), endTimeDayOffset: 1 }] };
    const records = complement(overnight, [{ ...leave('23:00', '01:00', '120'), endTimeDayOffset: 1 }]);
    assert.deepEqual(times(records), [['22:00:00', '23:00:00', '60'], ['01:00:00', '06:00:00', '300']]);
    assert.equal(records[1].physicalStartDate, '2026-11-12');
    assert.equal(records[1].physicalEndDate, '2026-11-12');
});
