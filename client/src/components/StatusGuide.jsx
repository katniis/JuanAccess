import { useId } from 'react';
import Icon from './Icon.jsx';
import StatusPill from './StatusPill.jsx';
import {
   insuranceStatusGuide,
   priorAuthorizationStatusGuide,
} from '../services/patientAppointments.js';

const guides = {
   insurance: {
      label: 'Insurance',
      title: 'Insurance statuses',
      description:
         'The coverage status recorded by the clinic for this appointment.',
      statuses: insuranceStatusGuide,
   },
   priorAuth: {
      label: 'Prior auth',
      title: 'Prior authorization statuses',
      description:
         'The approval status from your insurer for this appointment.',
      statuses: priorAuthorizationStatusGuide,
   },
};

function StatusGuide({
   type,
   align = 'start',
   showLabel = false,
   statusLabel,
   description,
}) {
   const guide = guides[type];
   const descriptionId = useId();
   const statusSpecific = Boolean(description);
   const guideClassName =
      'info-wrap status-guide' +
      (align === 'end' ? ' align-end' : '') +
      (statusSpecific ? ' status-specific' : '');

   return (
      <span className={guideClassName}>
         <button
            className="status-guide-trigger"
            type="button"
            aria-label={
               statusLabel
                  ? `${guide.label} status: ${statusLabel}`
                  : `${guide.label} status guide`
            }
            aria-describedby={descriptionId}>
            <Icon name="info" />
            {showLabel && <span>{guide.label} guide</span>}
         </button>
         <div
            className="status-guide-popover"
            id={descriptionId}
            role="tooltip">
            <h3>{statusLabel || guide.title}</h3>
            <p>{description || guide.description}</p>
            {!statusSpecific && (
               <ul>
                  {guide.statuses.map((status) => (
                     <li key={status.label}>
                        <StatusPill status={status.pill}>
                           {status.label}
                        </StatusPill>
                        <span>{status.description}</span>
                     </li>
                  ))}
               </ul>
            )}
         </div>
      </span>
   );
}

export default StatusGuide;
