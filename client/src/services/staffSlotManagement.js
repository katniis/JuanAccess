import { staffRequest } from './staffApi.js';
import { getStaffProviders, getProviderSchedule } from './staffSchedule.js';

const clinicTimeZone = 'Asia/Manila';

function manilaMinutes(isoDate) {
   const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: clinicTimeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
   }).formatToParts(new Date(isoDate));
   const values = Object.fromEntries(
      parts.map(({ type, value }) => [type, value]),
   );
   return Number(values.hour) * 60 + Number(values.minute);
}

function timeLabel(minutes) {
   const date = new Date(
      `2020-01-01T${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00+08:00`,
   );
   return new Intl.DateTimeFormat('en-US', {
      timeZone: clinicTimeZone,
      hour: 'numeric',
      minute: '2-digit',
   }).format(date);
}

function eventFor(appointment, times) {
   const startMinute = manilaMinutes(appointment.scheduledStart);
   const endMinute = manilaMinutes(appointment.scheduledEnd);
   const startIndex = Math.max(0, Math.floor((startMinute - 480) / 30));
   const span = Math.max(
      1,
      Math.ceil((endMinute - Math.max(startMinute, 480)) / 30),
   );
   const patient = [appointment.patientFirstName, appointment.patientLastName]
      .filter(Boolean)
      .join(' ');
   const palette = ['aqua', 'violet', 'mint', 'amber'];
   return {
      id: appointment.id,
      appointmentId: appointment.id,
      startIndex,
      span: Math.min(span, times.length - startIndex),
      patient: patient || 'Patient record',
      detail: appointment.visitTypeName || 'Appointment',
      status: appointment.status,
      tone: palette[Number(appointment.id) % palette.length],
      start: timeLabel(startMinute),
      end: timeLabel(endMinute),
   };
}

function displayDate(date) {
   return new Intl.DateTimeFormat('en-US', {
      timeZone: clinicTimeZone,
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
   }).format(new Date(`${date}T12:00:00+08:00`));
}

function waitlistCriteria(entry) {
   const provider = entry.providerFirstName
      ? `Dr. ${entry.providerFirstName} ${entry.providerLastName}`
      : 'Any provider';
   const dates =
      entry.preferredDateStart && entry.preferredDateEnd
         ? `${entry.preferredDateStart}–${entry.preferredDateEnd}`
         : 'Any date';
   return [provider, entry.visitTypeName, dates].filter(Boolean).join(' · ');
}

export async function getStaffSlotManagement(date) {
   const [utilization, { waitlist = [] }, providers] = await Promise.all([
      staffRequest(`/staff/slots/utilization?date=${encodeURIComponent(date)}`),
      staffRequest('/staff/waitlist?status=all'),
      getStaffProviders(),
   ]);
   const schedules = await Promise.all(
      providers.map((provider) => getProviderSchedule(provider.id, { date })),
   );
   const appointments = schedules.flat();
   const appointmentsById = new Map(
      appointments.map((appointment) => [String(appointment.id), appointment]),
   );
   const times = Array.from({ length: 18 }, (_, index) =>
      timeLabel(480 + index * 30),
   );
   const mapResource = (resource) => ({
      ...resource,
      events: resource.appointments
         .map((appointment) => appointmentsById.get(String(appointment.id)))
         .filter(Boolean)
         .map((appointment) => eventFor(appointment, times))
         .filter((event) => event.span > 0),
   });

   return {
      date,
      dateLabel: displayDate(date),
      times,
      rooms: (utilization.rooms || []).map(mapResource),
      waitlist: waitlist.map((entry) => ({
         id: entry.id,
         patient:
            [entry.patientFirstName, entry.patientLastName]
               .filter(Boolean)
               .join(' ') || 'Patient record',
         criteria: waitlistCriteria(entry),
         status: entry.status,
         remaining:
            entry.status === 'offered' && entry.offerExpiresAt
               ? new Intl.DateTimeFormat('en-US', {
                    timeZone: clinicTimeZone,
                    hour: '2-digit',
                    minute: '2-digit',
                 }).format(new Date(entry.offerExpiresAt))
               : null,
         tone:
            entry.status === 'offered'
               ? 'offered'
               : entry.status === 'expired'
                 ? 'expired'
                 : entry.status === 'confirmed'
                   ? 'confirmed'
                   : 'waiting',
      })),
   };
}
