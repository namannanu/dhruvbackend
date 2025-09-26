const mongoose = require('mongoose');

const HOUR_IN_MS = 1000 * 60 * 60;
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const toDateKey = (value) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return null;
  }
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toIsoString = (value) => {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return null;
  }
  return date.toISOString();
};

const toTimeLabel = (value) => {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return null;
  }
  const hours = date.getHours();
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const normalized = hours % 12 || 12;
  return `${normalized}:${minutes} ${ampm}`;
};

const toTime24 = (value) => {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return null;
  }
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
};

const toObjectIdString = (value) => {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof mongoose.Types.ObjectId) {
    return value.toString();
  }
  if (value._id) {
    return value._id.toString();
  }
  if (value.toString) {
    return value.toString();
  }
  return null;
};

const pickLocationLabel = (record) => {
  if (!record) {
    return null;
  }
  if (record.locationSnapshot) {
    return record.locationSnapshot;
  }
  const jobLocation = record.job && record.job.location ? record.job.location : null;
  if (jobLocation) {
    const cityState = [jobLocation.city, jobLocation.state].filter(Boolean).join(', ');
    if (cityState) {
      return cityState;
    }
    if (jobLocation.address) {
      return jobLocation.address;
    }
  }
  const business = record.business || (record.job && record.job.business) || null;
  if (business && typeof business === 'object' && business.name) {
    return business.name;
  }
  return null;
};

const roundToTwo = (value) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return 0;
  }
  return Math.round((numeric + Number.EPSILON) * 100) / 100;
};

const calculateHoursBetween = (start, end) => {
  if (!start || !end) {
    return null;
  }
  const startDate = start instanceof Date ? start : new Date(start);
  const endDate = end instanceof Date ? end : new Date(end);
  if (Number.isNaN(startDate.valueOf()) || Number.isNaN(endDate.valueOf())) {
    return null;
  }
  const diff = (endDate - startDate) / HOUR_IN_MS;
  if (diff < 0) {
    return 0;
  }
  return roundToTwo(diff);
};

const mapRecordToScheduleEntry = (record, context = {}) => {
  if (!record || !record.scheduledStart) {
    return null;
  }

  const { now = new Date(), startOfToday, endOfToday } = context;
  const scheduledStart = new Date(record.scheduledStart);
  if (Number.isNaN(scheduledStart.valueOf())) {
    return null;
  }

  const scheduledEnd = record.scheduledEnd ? new Date(record.scheduledEnd) : null;
  const dateKey = toDateKey(scheduledStart);
  const dayOfWeek = dayNames[scheduledStart.getDay()] || null;
  const job = record.job || {};
  const business = record.business || {};
  const jobBusiness = job.business || {};

  const plannedHours = scheduledEnd ? calculateHoursBetween(scheduledStart, scheduledEnd) : null;
  const actualHours = typeof record.totalHours === 'number'
    ? roundToTwo(record.totalHours)
    : calculateHoursBetween(record.clockInAt, record.clockOutAt);

  const hourlyRate = typeof record.hourlyRate === 'number'
    ? roundToTwo(record.hourlyRate)
    : (typeof job.hourlyRate === 'number' ? roundToTwo(job.hourlyRate) : null);

  const earnings = typeof record.earnings === 'number'
    ? roundToTwo(record.earnings)
    : (hourlyRate && actualHours ? roundToTwo(hourlyRate * actualHours) : null);

  const location = pickLocationLabel({
    locationSnapshot: record.locationSnapshot,
    job,
    business,
  });

  const effectiveStart = scheduledStart;
  const effectiveEnd = scheduledEnd || scheduledStart;
  const useStartOfToday = startOfToday instanceof Date
    ? startOfToday
    : new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const useEndOfToday = endOfToday instanceof Date
    ? endOfToday
    : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const isPast = effectiveEnd < useStartOfToday;
  const isFuture = effectiveStart > useEndOfToday;
  const isToday = !isPast && !isFuture;
  const isUpcoming = !isPast;
  const isInProgress = !isPast && !isFuture && (
    record.status === 'clocked-in' ||
    (effectiveStart <= now && effectiveEnd >= now)
  );

  return {
    id: toObjectIdString(record._id),
    date: dateKey,
    dayOfWeek,
    status: record.status,
    jobId: toObjectIdString(job._id || job),
    jobTitle: record.jobTitleSnapshot || job.title || 'Untitled Role',
    businessId: toObjectIdString(business._id || business) || toObjectIdString(jobBusiness._id || jobBusiness),
    businessName: business.name || jobBusiness.name || null,
    location,
    scheduledStart: scheduledStart.toISOString(),
    scheduledEnd: scheduledEnd ? scheduledEnd.toISOString() : null,
    scheduledStartTime: toTime24(scheduledStart),
    scheduledEndTime: scheduledEnd ? toTime24(scheduledEnd) : null,
    scheduledStartLabel: toTimeLabel(scheduledStart),
    scheduledEndLabel: scheduledEnd ? toTimeLabel(scheduledEnd) : null,
    clockInAt: toIsoString(record.clockInAt),
    clockOutAt: toIsoString(record.clockOutAt),
    plannedHours,
    actualHours,
    hourlyRate,
    earnings,
    isLate: Boolean(record.isLate),
    notes: record.notes || null,
    isPast,
    isUpcoming,
    isToday,
    isFuture,
    isInProgress,
    isCompleted: record.status === 'completed',
    isMissed: record.status === 'missed',
    isClockedIn: record.status === 'clocked-in'
  };
};

const buildSectionTotals = (entries = []) => {
  if (!entries || entries.length === 0) {
    return {
      count: 0,
      plannedHours: 0,
      actualHours: 0,
      earnings: 0,
      byStatus: {}
    };
  }

  const totals = entries.reduce((acc, entry) => {
    acc.count += 1;
    acc.plannedHours += Number(entry.plannedHours) || 0;
    acc.actualHours += Number(entry.actualHours) || 0;
    acc.earnings += Number(entry.earnings) || 0;
    acc.byStatus[entry.status] = (acc.byStatus[entry.status] || 0) + 1;
    return acc;
  }, {
    count: 0,
    plannedHours: 0,
    actualHours: 0,
    earnings: 0,
    byStatus: {}
  });

  totals.plannedHours = roundToTwo(totals.plannedHours);
  totals.actualHours = roundToTwo(totals.actualHours);
  totals.earnings = roundToTwo(totals.earnings);
  return totals;
};

const buildStatusCounter = () => ({
  scheduled: 0,
  'clocked-in': 0,
  completed: 0,
  missed: 0
});

module.exports = {
  mapRecordToScheduleEntry,
  buildSectionTotals,
  buildStatusCounter,
};
