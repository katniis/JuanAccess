import { useId } from 'react';
import Icon from './Icon.jsx';

function StatusHelp({ label, description }) {
   const descriptionId = useId();

   return (
      <span className="info-wrap status-help">
         <button
            className="info-button"
            type="button"
            aria-label={`What ${label} means`}
            aria-describedby={descriptionId}>
            <Icon name="circle-help" />
         </button>
         <span className="tooltip" id={descriptionId} role="tooltip">
            {description}
         </span>
      </span>
   );
}

export default StatusHelp;
