export const stages = [
   'needs_draft',
   'drafted',
   'submitted',
   'manual_review',
   'approved',
   'denied',
   'appealed',
   'not_required',
];

const priorAuthGroups = [
   {
      id: 'needs-action',
      label: 'Needs staff action',
      stages: ['needs_draft', 'drafted', 'manual_review'],
   },
   {
      id: 'awaiting-outcome',
      label: 'Awaiting outcome',
      stages: ['submitted'],
   },
   {
      id: 'appeal-in-progress',
      label: 'Appeal in progress',
      stages: ['appealed'],
   },
   {
      id: 'resolved',
      label: 'Resolved',
      stages: ['approved', 'denied', 'not_required'],
   },
];

export function groupStaffPriorAuthRecords(records) {
   return priorAuthGroups.map((group) => ({
      ...group,
      records: records.filter((record) => group.stages.includes(record.status)),
   }));
}
