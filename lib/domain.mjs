export const CAPACITY = 74;
export const FEVER = 38;
export const TIME_ZONE = 'Asia/Kolkata';
export const ROLES = ['Nurse', 'Doctor', 'Admin', 'Management'];
const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
export function dayKey(date = new Date()) {
  return dayFormatter.format(new Date(date));
}
export function todayReading(patient, now = new Date()) {
  return patient.temperatures.find(t => dayKey(t.at) === dayKey(now));
}
export function todayVisit(patient, now = new Date()) {
  return patient.visits.find(v => dayKey(v.at) === dayKey(now));
}
export function recovery(patient, now = new Date()) {
  const readings = [...patient.temperatures].sort((a, b) => new Date(a.at) - new Date(b.at));
  let start = null;
  let previousDay = null;
  for (const reading of readings) {
    const currentDay = dayKey(reading.at);
    const gap = previousDay ? (Date.parse(currentDay) - Date.parse(previousDay)) / 86400000 : 0;
    if (reading.value >= FEVER) start = null;
    else if (!start || gap > 1) start = reading.at;
    previousDay = currentDay;
  }
  const current = todayReading(patient, now);
  const hours = start ? Math.max(0, (new Date(now) - new Date(start)) / 3600000) : 0;
  const eligible = Boolean(current && current.value < FEVER && hours >= 72);
  return { hours, days: Math.min(3, Math.floor(hours / 24)), eligible, hasToday: Boolean(current) };
}
export function metrics(state, now = new Date()) {
  const active = state.patients.filter(p => p.status === 'active');
  const discharged = state.patients.filter(p => p.status === 'discharged').length;
  const deceased = state.patients.filter(p => p.status === 'deceased').length;
  const completed = discharged + deceased;
  return { active: active.length, available: CAPACITY - active.length, temperatures: active.filter(p => todayReading(p, now)).length, visits: active.filter(p => todayVisit(p, now)).length, ready: active.filter(p => recovery(p, now).eligible).length, approvals: active.filter(p => p.approvedAt).length, discharged, deceased, completed, recoveryRate: completed ? discharged / completed * 100 : null, mortalityRate: completed ? deceased / completed * 100 : null };
}
function assert(condition, message) { if (!condition) throw new Error(message); }
const permissions = { temperature: ['Nurse'], visit: ['Doctor'], approve: ['Doctor'], discharge: ['Admin'], admit: ['Admin'], death: ['Doctor'] };
export function applyAction(state, action, now = new Date()) {
  assert(permissions[action.type]?.includes(action.role), 'This action is unavailable for the selected role.');
  assert(typeof action.requestId === 'string' && action.requestId.length >= 8, 'A request ID is required.');
  if (state.requests.includes(action.requestId)) return state;
  const at = new Date(now).toISOString();
  let patient = state.patients.find(p => p.id === action.patientId);
  let message;
  if (action.type === 'admit') {
    const name = String(action.name || '').trim();
    const age = Number(action.age);
    const bed = Number(action.bed);
    assert(name.length >= 2 && name.length <= 80, 'Enter a name between 2 and 80 characters.');
    assert(Number.isInteger(age) && age >= 0 && age <= 120, 'Enter an age from 0 to 120.');
    assert(Number.isInteger(bed) && bed >= 1 && bed <= CAPACITY, 'Choose a valid bed.');
    assert(!state.patients.some(p => p.status === 'active' && p.bed === bed), 'This bed is occupied. Refresh and choose another bed.');
    patient = { id: `CT-${state.nextPatientId++}`, name, age, sex: ['Female', 'Male', 'Other'].includes(action.sex) ? action.sex : 'Other', bed, status: 'active', admittedAt: at, temperatures: [], visits: [], approvedAt: null, outcomeAt: null };
    state.patients.push(patient);
    message = `Admitted ${name} to bed ${String(bed).padStart(2, '0')}`;
  } else {
    assert(patient && patient.status === 'active', 'This patient is no longer admitted. Refresh to see the latest status.');
    if (action.type === 'temperature') {
      const value = Number(action.value);
      assert(action.value !== '' && Number.isFinite(value) && value >= 34 && value <= 43, 'Enter a temperature between 34°C and 43°C.');
      assert(!todayReading(patient, now), 'A temperature has already been recorded today.');
      patient.temperatures.push({ value: Math.round(value * 10) / 10, at, by: 'Nurse Maya' });
      if (value >= FEVER) patient.approvedAt = null;
      message = `Recorded ${value.toFixed(1)}°C for ${patient.name}`;
    }
    if (action.type === 'visit') {
      assert(todayReading(patient, now), 'Record today’s temperature before the doctor visit.');
      assert(!todayVisit(patient, now), 'A doctor visit has already been recorded today.');
      const note = String(action.note || '').trim();
      assert(note.length >= 3 && note.length <= 1000, 'Enter a review or treatment note between 3 and 1,000 characters.');
      patient.visits.push({ at, note, by: 'Dr. Arjun Mehta' });
      message = `Completed doctor review for ${patient.name}`;
    }
    if (action.type === 'approve') {
      assert(recovery(patient, now).eligible, 'Three full fever-free days with daily readings and today’s temperature are required.');
      assert(todayVisit(patient, now), 'Complete today’s doctor review before approving discharge.');
      assert(!patient.approvedAt, 'Discharge has already been approved.');
      patient.approvedAt = at;
      message = `Approved discharge for ${patient.name}; admin notified`;
    }
    if (action.type === 'discharge') {
      assert(patient.approvedAt && recovery(patient, now).eligible && todayVisit(patient, now), 'Current temperature checks, today’s doctor review, and discharge approval are required.');
      patient.status = 'discharged';
      patient.outcomeAt = at;
      message = `Discharged ${patient.name}; bed ${String(patient.bed).padStart(2, '0')} is available`;
    }
    if (action.type === 'death') {
      const note = String(action.note || '').trim();
      assert(note.length >= 5 && note.length <= 1000, 'Add an outcome note between 5 and 1,000 characters.');
      patient.status = 'deceased';
      patient.outcomeAt = at;
      patient.outcomeNote = note;
      patient.approvedAt = null;
      message = `Recorded deceased outcome for ${patient.name}; bed ${String(patient.bed).padStart(2, '0')} released`;
    }
  }
  state.activity.unshift({ id: action.requestId, at, role: action.role, patientId: patient.id, message });
  state.requests.push(action.requestId);
  return state;
}
