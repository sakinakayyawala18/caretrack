import { dayKey } from './domain.mjs';
const firstNames = ['Aarav', 'Ananya', 'Vivaan', 'Diya', 'Aditya', 'Ishita', 'Arjun', 'Meera', 'Rohan', 'Kavya', 'Kabir', 'Nisha', 'Dev', 'Priya', 'Rahul', 'Sana', 'Vikram', 'Riya', 'Karan', 'Neha', 'Sahil', 'Tara', 'Varun', 'Aisha', 'Nikhil', 'Pooja', 'Ishan', 'Simran', 'Dhruv', 'Anika', 'Ravi', 'Mira', 'Yash', 'Sakshi', 'Rohit', 'Avni', 'Aman'];
const surnames = ['Sharma', 'Patel', 'Desai', 'Shah', 'Rao', 'Joshi', 'Mehta', 'Kapoor'];
export function createSeed(now = new Date()) {
  const date = dayKey(now);
  const time = (days, hour = 7) => new Date(Date.parse(`${date}T00:00:00+05:30`) + days * 86400000 + hour * 3600000).toISOString();
  // Keep today's demonstration measurements before the current instant.
  const currentTime = new Date(Math.min(Date.parse(time(0)), new Date(now).getTime() - 120000)).toISOString();
  const patients = Array.from({ length: 94 }, (_, index) => {
    const historical = index >= 74;
    const group = index % 10;
    const temperatures = [-4, -3, -2, -1].map((day, i) => ({ at: time(day), value: group < 3 ? 36.5 + ((index + i) % 5) / 10 : group < 7 && day < -2 ? 38.1 + (index % 6) / 10 : group < 7 ? 36.7 : 38.2 + (index % 8) / 10, by: 'Nurse Maya' }));
    const checked = group < 7;
    if (checked) temperatures.push({ at: currentTime, value: 36.6 + (index % 5) / 10, by: 'Nurse Maya' });
    const visited = group === 0 || group === 3 || group === 4;
    const visits = visited ? [{ at: new Date(Date.parse(currentTime) + 30000).toISOString(), note: 'Daily review completed. Continue the recorded treatment plan and daily temperature monitoring.', by: 'Dr. Arjun Mehta' }] : [];
    return { id: `CT-${1001 + index}`, name: `${firstNames[index % firstNames.length]} ${surnames[Math.floor(index / firstNames.length) % surnames.length]}`, age: 19 + (index * 7 % 57), sex: index % 2 ? 'Female' : 'Male', bed: index + 1, status: historical ? (index < 91 ? 'discharged' : 'deceased') : 'active', admittedAt: time(-6 - index % 5), temperatures, visits, approvedAt: !historical && group === 0 ? currentTime : null, outcomeAt: historical ? time(-1 - index % 4, 15) : null };
  });
  return { patients, nextPatientId: 1095, requests: [], activity: [{ id: 'seed', at: new Date(now).toISOString(), role: 'System', message: 'Demo prepared with 74 admitted patients and 20 completed cases.' }] };
}
