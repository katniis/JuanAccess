// Groups today's APE Bookings by Arrival Window. A booking Procedure is still
// needed until it has a Station Assignment or has been recorded as performed.
export function groupApeQueue(bookings, procedures, performed) {
   const done = new Set(
      performed.map((p) => `${p.appointmentId}:${p.procedureCode}`),
   );
   const windows = new Map();
   for (const booking of bookings) {
      if (!windows.has(booking.arrivalWindowId)) {
         windows.set(booking.arrivalWindowId, {
            id: booking.arrivalWindowId,
            name: booking.arrivalWindowName,
            startTime: booking.arrivalWindowStart,
            endTime: booking.arrivalWindowEnd,
            patients: [],
         });
      }
      const own = procedures
         .filter((p) => p.appointmentId === booking.appointmentId)
         .map((p) => ({
            id: p.id,
            procedureCode: p.procedureCode,
            description: p.description,
            allowedProfessions: p.allowedProfessions,
            practitioner: p.practitionerId
               ? {
                    id: p.practitionerId,
                    name: `${p.practitionerFirstName} ${p.practitionerLastName}`,
                 }
               : null,
            assignedAt: p.assignedAt,
            done: done.has(`${booking.appointmentId}:${p.procedureCode}`),
         }));
      windows.get(booking.arrivalWindowId).patients.push({
         appointmentId: booking.appointmentId,
         name: `${booking.patientFirstName} ${booking.patientLastName}`,
         gender: booking.gender,
         packageName: booking.packageName,
         remaining: own.filter((p) => !p.practitioner && !p.done),
         assigned: own.filter((p) => p.practitioner && !p.done),
         done: own.filter((p) => p.done),
      });
   }
   return [...windows.values()];
}
