import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import StatusPill from './StatusPill.jsx';

export function WaitlistRow({ entry }) {
   return (
      <Link
         className={
            'waitlist-row' + (entry.status === 'offered' ? ' highlighted' : '')
         }
         to="/patient/waitlist">
         <span className="waitlist-copy">
            <span className="waitlist-title">
               <strong>{entry.providerName}</strong>
               <StatusPill status={entry.statusClass}>
                  {entry.statusLabel}
               </StatusPill>
            </span>
            <span>{entry.visitLabel}</span>
            <span className={'waitlist-note ' + entry.status}>
               {entry.note}
            </span>
         </span>
         <Icon name="chevron-right" />
      </Link>
   );
}

export function StatCard({ stat }) {
   return (
      <section className="stat-card">
         <span className="stat-icon">
            <Icon name={stat.icon} />
         </span>
         <div className="stat-copy">
            <h2>{stat.title}</h2>
            <strong>{stat.value}</strong>
            <p>{stat.detail}</p>
         </div>
         <Link to={stat.path} className="stat-link">
            {stat.linkLabel} <span aria-hidden="true">→</span>
         </Link>
      </section>
   );
}
