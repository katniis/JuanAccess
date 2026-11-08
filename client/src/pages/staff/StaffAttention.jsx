import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ErrorState from '../../components/ErrorState.jsx';
import Icon from '../../components/Icon.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton.jsx';
import { buildAttentionItems } from '../../utils/staffAttention.js';
import { getStaffAttentionData } from '../../services/staffDashboard.js';
import { usePortalPageReveal } from '../../hooks/usePortalPageReveal.js';

function StaffAttention() {
   const [items, setItems] = useState(null);
   const [hasError, setHasError] = useState(false);
   const pageRef = useRef(null);
   usePortalPageReveal(pageRef, Boolean(items));
   useEffect(() => {
      let current = true;
      getStaffAttentionData()
         .then((data) => {
            if (current) setItems(buildAttentionItems(data, Infinity));
         })
         .catch(() => {
            if (current) setHasError(true);
         });
      return () => {
         current = false;
      };
   }, []);

   if (hasError)
      return (
         <ErrorState
            title="The attention list couldn’t load"
            message="Check your connection and reload this page to try again."
         />
      );
   if (!items)
      return <LoadingSkeleton variant="queue" label="the attention list" />;

   return (
      <div className="staff-attention-page" ref={pageRef}>
         <header className="staff-schedule-heading">
            <h1>Needs Attention</h1>
            <p>
               Current appointments and workflow records requiring follow-up.
            </p>
         </header>
         {items.length ? (
            <section
               className="staff-card"
               aria-label="Current items needing attention">
               <div className="staff-attention-list">
                  {items.map((item) => (
                     <article className="staff-attention-row" key={item.id}>
                        <span className="staff-attention-icon">
                           <Icon name={item.icon} />
                        </span>
                        <div className="staff-attention-copy">
                           <strong>{item.title}</strong>
                           <span>{item.subtitle}</span>
                        </div>
                        <div className="staff-attention-meta">
                           <span className={`staff-tag ${item.tone}`}>
                              {item.status}
                           </span>
                           <time>{item.time}</time>
                        </div>
                        <Link
                           className="button button-outline staff-review-button"
                           to={item.path}>
                           Review
                        </Link>
                     </article>
                  ))}
               </div>
            </section>
         ) : (
            <section className="prior-auth-empty">
               Nothing needs attention right now.
            </section>
         )}
      </div>
   );
}

export default StaffAttention;
