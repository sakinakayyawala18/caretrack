import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeed } from '../lib/seed.mjs';
import { applyAction, metrics, recovery, todayReading } from '../lib/domain.mjs';
const now = new Date('2026-11-12T10:00:00Z');
let request = 0;
function action(type, role, fields = {}) { return { type, role, requestId: `test-request-${++request}`, ...fields }; }
test('74 occupied beds and initial 85% recovery / 15% mortality', () => {
  const state = createSeed(now);
  const result = metrics(state, now);
  assert.equal(result.active, 74);
  assert.equal(result.available, 0);
  assert.equal(result.recoveryRate, 85);
  assert.equal(result.mortalityRate, 15);
  assert.ok(result.ready > 0);
});
test('nurse → doctor → approval → admin → new admission', () => {
  const state = createSeed(now);
  const patient = state.patients[1];
  patient.temperatures.pop();
  applyAction(state, action('temperature', 'Nurse', { patientId: patient.id, value: 36.8 }), now);
  assert.ok(todayReading(patient, now));
  applyAction(state, action('visit', 'Doctor', { patientId: patient.id, note: 'Review complete. Continue care plan.' }), now);
  applyAction(state, action('approve', 'Doctor', { patientId: patient.id }), now);
  assert.equal(metrics(state, now).available, 0);
  applyAction(state, action('discharge', 'Admin', { patientId: patient.id }), now);
  assert.equal(metrics(state, now).available, 1);
  assert.equal(metrics(state, now).discharged, 18);
  applyAction(state, action('admit', 'Admin', { name: 'Demo Patient', age: 28, sex: 'Female', bed: patient.bed }), now);
  assert.equal(metrics(state, now).available, 0);
  assert.equal(state.patients.at(-1).temperatures.length, 0);
});
test('reject duplicate readings, early visits, invalid values, unauthorized actions and occupied beds', () => {
  const state = createSeed(now);
  assert.throws(() => applyAction(state, action('temperature', 'Nurse', { patientId: 'CT-1001', value: 36.8 }), now), /already/);
  assert.throws(() => applyAction(state, action('visit', 'Doctor', { patientId: 'CT-1008', note: 'Review.' }), now), /temperature/);
  for (const value of ['', 20, 50, 'nope']) assert.throws(() => applyAction(state, action('temperature', 'Nurse', { patientId: 'CT-1008', value }), now));
  assert.throws(() => applyAction(state, action('temperature', 'Admin', { patientId: 'CT-1008', value: 36.8 }), now), /unavailable/);
  assert.throws(() => applyAction(state, action('admit', 'Admin', { name: 'Demo Patient', age: 20, bed: 1 }), now), /occupied/);
});
test('72 elapsed hours, daily continuity and today’s measurement are enforced', () => {
  const patient = createSeed(now).patients[1];
  assert.equal(recovery(patient, now).eligible, true);
  patient.temperatures = patient.temperatures.slice(-3);
  assert.equal(recovery(patient, now).eligible, false);
  const missing = createSeed(now).patients[1];
  missing.temperatures.splice(2, 1);
  assert.equal(recovery(missing, now).eligible, false);
  const stale = createSeed(now).patients[1];
  stale.temperatures.pop();
  assert.equal(recovery(stale, now).eligible, false);
  const fever = createSeed(now).patients[1];
  fever.temperatures.at(-1).value = 38;
  assert.equal(recovery(fever, now).eligible, false);
});
test('discharge requires approval and current checks', () => {
  const state = createSeed(now);
  assert.throws(() => applyAction(state, action('discharge', 'Admin', { patientId: 'CT-1002' }), now), /approval/);
  const tomorrow = new Date(now.getTime() + 86400000);
  assert.throws(() => applyAction(state, action('discharge', 'Admin', { patientId: 'CT-1001' }), tomorrow), /Current/);
});
test('idempotent retries do not duplicate an admission', () => {
  const state = createSeed(now);
  applyAction(state, action('discharge', 'Admin', { patientId: 'CT-1001' }), now);
  const admit = action('admit', 'Admin', { name: 'Retry Patient', age: 22, bed: 1 });
  applyAction(state, admit, now);
  applyAction(state, admit, now);
  assert.equal(state.patients.filter(p => p.name === 'Retry Patient').length, 1);
});
test('recording a deceased outcome frees the bed and raises mortality warning', () => {
  const state = createSeed(now);
  applyAction(state, action('death', 'Doctor', { patientId: 'CT-1008', note: 'Fictional outcome for demonstration.' }), now);
  const result = metrics(state, now);
  assert.equal(result.available, 1);
  assert.equal(result.deceased, 4);
  assert.ok(result.mortalityRate > 15);
});
test('a new fever clears an older approval', () => {
  const state = createSeed(now);
  const tomorrow = new Date(now.getTime() + 86400000);
  applyAction(state, action('temperature', 'Nurse', { patientId: 'CT-1001', value: 38.2 }), tomorrow);
  assert.equal(state.patients[0].approvedAt, null);
});
