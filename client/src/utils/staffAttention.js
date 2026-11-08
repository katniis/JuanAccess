const formatTime = (value) =>
   value
      ? new Intl.DateTimeFormat('en-US', {
           timeZone: 'Asia/Manila',
           hour: 'numeric',
           minute: '2-digit',
        }).format(new Date(value))
      : '—';

const fullName = (first, last) =>
   [first, last].filter(Boolean).join(' ') || 'Patient record';

export function buildAttentionItems(
   { dashboard, priorAuth, appeals, waitlist },
   limit = 5,
) {
   const items = [];
   for (const item of priorAuth) {
      if (!['needs_draft', 'drafted', 'manual_review'].includes(item.status))
         continue;
      items.push({
         id: `auth-${item.id}`,
         icon: 'file-check',
         title: `${item.status === 'needs_draft' ? 'Prior authorization needs a draft' : item.status === 'manual_review' ? 'Prior authorization needs review' : 'Prior authorization draft ready'}: ${item.visitTypeName}`,
         subtitle: fullName(item.patientFirstName, item.patientLastName),
         status:
            item.status === 'needs_draft'
               ? 'Needs draft'
               : item.status === 'manual_review'
                 ? 'Manual review'
                 : 'Drafted',
         tone: ['needs_draft', 'manual_review'].includes(item.status)
            ? 'due'
            : 'pending',
         sort: new Date(item.scheduledStart).getTime(),
         time: formatTime(item.scheduledStart),
         path: '/staff/prior-auth',
      });
   }
   for (const appeal of appeals) {
      if (!['drafted', 'submitted', 'manual_review'].includes(appeal.status))
         continue;
      items.push({
         id: `appeal-${appeal.id}`,
         icon: 'scale',
         title:
            appeal.status === 'drafted'
               ? 'Appeal draft ready for review'
               : appeal.status === 'manual_review'
                 ? 'Appeal needs manual review'
                 : 'Appeal submitted — decision pending',
         subtitle: fullName(appeal.patientFirstName, appeal.patientLastName),
         status:
            appeal.status === 'drafted'
               ? 'Drafted'
               : appeal.status === 'manual_review'
                 ? 'Manual review'
                 : 'Submitted',
         tone: appeal.status === 'drafted' ? 'due' : 'urgent',
         sort: new Date(appeal.updatedAt).getTime(),
         time: formatTime(appeal.updatedAt),
         path: '/staff/appeals',
      });
   }
   for (const entry of waitlist) {
      if (!['offered', 'waiting'].includes(entry.status)) continue;
      items.push({
         id: `waitlist-${entry.id}`,
         icon: 'clock',
         title:
            entry.status === 'offered'
               ? 'Waitlist offer awaiting response'
               : 'Patient waiting for an appointment',
         subtitle: `${fullName(entry.patientFirstName, entry.patientLastName)} · ${entry.visitTypeName}`,
         status: entry.status === 'offered' ? 'Offered' : 'Waiting',
         tone: entry.status === 'offered' ? 'awaiting' : 'pending',
         sort: entry.offerExpiresAt
            ? new Date(entry.offerExpiresAt).getTime()
            : new Date(entry.createdAt).getTime(),
         time: entry.offerExpiresAt ? formatTime(entry.offerExpiresAt) : '—',
         path: '/staff/slots',
      });
   }
   for (const appointment of dashboard.todayAppointments || []) {
      if (appointment.status !== 'scheduled') continue;
      items.push({
         id: `appointment-${appointment.id}`,
         icon: 'calendar',
         title: `Appointment check-in pending: ${appointment.visitTypeName}`,
         subtitle: `${fullName(appointment.patientFirstName, appointment.patientLastName)} · Dr. ${fullName(appointment.providerFirstName, appointment.providerLastName)}`,
         status: 'Pending',
         tone: 'pending',
         sort: new Date(appointment.scheduledStart).getTime(),
         time: formatTime(appointment.scheduledStart),
         path: `/staff/schedule?provider=${appointment.providerId}`,
      });
   }
   return items.sort((a, b) => a.sort - b.sort).slice(0, limit);
}
