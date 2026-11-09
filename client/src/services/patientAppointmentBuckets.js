export function partitionPatientAppointments(appointments, now = Date.now()) {
   const groups = {
      upcoming: [],
      past: [],
      cancelled: [],
      needsReview: [],
   };

   for (const appointment of appointments) {
      const scheduledStart = new Date(appointment.scheduledStart).getTime();

      if (appointment.status === 'cancelled') {
         groups.cancelled.push(appointment);
      } else if (!Number.isFinite(scheduledStart)) {
         groups.needsReview.push(appointment);
      } else if (appointment.status === 'scheduled' && scheduledStart >= now) {
         groups.upcoming.push(appointment);
      } else if (
         ['completed', 'no_show'].includes(appointment.status) &&
         scheduledStart < now
      ) {
         groups.past.push(appointment);
      } else {
         groups.needsReview.push(appointment);
      }
   }

   groups.upcoming.sort(compareByStart(1));
   for (const key of ['past', 'cancelled', 'needsReview']) {
      groups[key].sort(compareByStart(-1));
   }

   return groups;
}

function compareByStart(direction) {
   return (a, b) => {
      const aStart = new Date(a.scheduledStart).getTime();
      const bStart = new Date(b.scheduledStart).getTime();
      const aValid = Number.isFinite(aStart);
      const bValid = Number.isFinite(bStart);

      if (!aValid) return bValid ? 1 : 0;
      if (!bValid) return -1;
      return direction * (aStart - bStart);
   };
}
