/* Interval calculations use UTC only as a timezone-free clock/date representation. */
(() => {
    'use strict';
    const DAY = 1440;

    function time(value) {
        const match = /^(\d{2}):(\d{2})(?::00)?$/.exec(value || '');
        if (!match || +match[1] > 23 || +match[2] > 59) {
            throw new Error('A planned period or absence has no usable start/end time.');
        }
        return +match[1] * 60 + +match[2];
    }

    function date(value) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) throw new Error('Missing or invalid recording date.');
        const result = Date.parse(`${value}T00:00:00Z`);
        if (!Number.isFinite(result) || new Date(result).toISOString().slice(0, 10) !== value) {
            throw new Error('Invalid recording date.');
        }
        return result / 60000;
    }

    function interval(record, shiftDate) {
        const start = date(record.startDate || shiftDate) + time(record.startTime);
        const end = record.endDate
            ? date(record.endDate) + time(record.endTime)
            : date(shiftDate) + Number(record.endTimeDayOffset || 0) * DAY + time(record.endTime);
        if (!Number.isFinite(end) || end <= start) throw new Error('Invalid or ambiguous time interval.');
        return { start, end, source: record };
    }

    function subtract(spans, exclusions) {
        return exclusions.reduce((remaining, excluded) => remaining.flatMap(span => {
            if (excluded.end <= span.start || excluded.start >= span.end) return [span];
            const parts = [];
            if (excluded.start > span.start) parts.push({ ...span, end: excluded.start });
            if (excluded.end < span.end) parts.push({ ...span, start: excluded.end });
            return parts;
        }), spans);
    }

    const duration = spans => spans.reduce((sum, span) => sum + span.end - span.start, 0);
    const clock = minutes => new Date(minutes * 60000).toISOString().slice(11, 19);
    const calendarDate = minutes => new Date(minutes * 60000).toISOString().slice(0, 10);

    function complement(shift, absences) {
        if (!Array.isArray(absences) || !absences.length) throw new Error('Absence details are not loaded.');
        // Full-day leave often has a duration but no clock times.
        if (absences.length === 1 && !absences[0].startTime && !absences[0].endTime &&
            (Number(absences[0].durationInMinutes) === 480 ||
                (absences[0].durationInMinutes == null && Number(absences[0].durationInDays) === 1))) return [];
        if (shift.isRecordingInDays || !shift.usesClockTimeVariant) {
            throw new Error('Complementary time requires clock-time recording.');
        }
        const segments = shift.plannedAttendanceSegments || [];
        if (segments.some(segment => segment.dynamicBreakAfter)) {
            throw new Error('Cannot place a dynamic break automatically.');
        }
        let planned = segments.filter(segment => segment.category === 'PLANNED_WORKING_TIME')
            .map(segment => interval(segment, shift.shiftDate)).sort((a, b) => a.start - b.start);
        if (planned.some((span, index) => index && span.start < planned[index - 1].end)) {
            throw new Error('Planned working periods overlap.');
        }
        const breaks = segments.filter(segment => segment.category === 'SCHEDULED_UNPAID_BREAK')
            .map(segment => interval(segment, shift.shiftDate));
        planned = subtract(planned, breaks);
        if (duration(planned) !== 480) throw new Error('The planned working periods must total eight hours, excluding breaks.');
        const absenceSpans = absences.map(absence => interval(absence, shift.shiftDate));
        const remaining = subtract(planned, absenceSpans);
        const covered = 480 - duration(remaining);
        // SAP's credited durations must agree with the covered working periods.
        // This also rejects overlapping leave and leave outside the work schedule.
        const credited = absences.reduce((sum, absence, index) => {
            const minutes = absence.durationInMinutes;
            if (minutes != null && minutes !== '') return sum + Number(minutes);
            if (absence.durationInDays != null && absence.durationInDays !== '') return sum + Number(absence.durationInDays) * 480;
            return sum + duration(planned) - duration(subtract(planned, [absenceSpans[index]]));
        }, 0);
        if (!Number.isFinite(credited) || credited !== covered) {
            throw new Error('Absence durations do not match their coverage of the planned eight-hour day.');
        }
        return remaining.map(span => ({
            assignmentId: span.source.assignmentId,
            physicalStartDate: calendarDate(span.start),
            physicalEndDate: calendarDate(span.end),
            startTime: clock(span.start),
            endTime: clock(span.end),
            durationInMinutes: String(span.end - span.start),
            durationInDays: null,
            attendanceTypeExternalCode: span.source.attendanceTypeExternalCode,
            attendanceTypeName: span.source.attendanceTypeName
        }));
    }

    if (typeof module !== 'undefined' && module.exports) module.exports = { complement };
    else globalThis.SFTimeIntervals = Object.freeze({ complement });
})();
