function Bone({ width = '100%', height = 14, radius = 7 }) {
   return (
      <span
         className="skeleton-bone"
         style={{ width, height, borderRadius: radius }}
      />
   );
}

function PageHeading({ actions = false }) {
   return (
      <header className="skeleton-page-heading" aria-hidden="true">
         <div className="skeleton-heading-copy">
            <Bone width="min(270px, 65vw)" height={27} />
            <Bone width="min(210px, 52vw)" height={14} />
         </div>
         {actions && (
            <div className="skeleton-heading-actions">
               <Bone width={122} height={42} radius={12} />
               <Bone width={152} height={42} radius={12} />
            </div>
         )}
      </header>
   );
}

function CardLines({ count = 3 }) {
   return (
      <div className="skeleton-card-lines" aria-hidden="true">
         {Array.from({ length: count }, (_, index) => (
            <div className="skeleton-content-row" key={index}>
               <Bone width={42} height={42} radius={12} />
               <div className="skeleton-row-copy">
                  <Bone width={`${index % 2 ? 47 : 62}%`} />
                  <Bone width={`${index % 2 ? 34 : 44}%`} height={11} />
               </div>
            </div>
         ))}
      </div>
   );
}

function TableSkeleton({ columns = 5, rows = 3 }) {
   return (
      <div
         className="skeleton-table"
         style={{ '--skeleton-columns': columns }}
         aria-hidden="true">
         <div className="skeleton-table-row skeleton-table-head">
            {Array.from({ length: columns }, (_, index) => (
               <Bone
                  key={index}
                  width={`${index === 0 ? 55 : 70}%`}
                  height={10}
               />
            ))}
         </div>
         {Array.from({ length: rows }, (_, row) => (
            <div className="skeleton-table-row" key={row}>
               {Array.from({ length: columns }, (_, column) => (
                  <Bone
                     key={column}
                     width={`${column === 0 ? 72 : 58 + ((row + column) % 3) * 9}%`}
                     height={column === 0 ? 13 : 12}
                  />
               ))}
            </div>
         ))}
      </div>
   );
}

function TabsSkeleton({ count = 5 }) {
   return (
      <div className="skeleton-tabs" aria-hidden="true">
         {Array.from({ length: count }, (_, index) => (
            <Bone
               key={index}
               width={index === 0 ? 106 : 88}
               height={36}
               radius={10}
            />
         ))}
      </div>
   );
}

function Panel({ lines = 3, className = '' }) {
   return (
      <section className={`skeleton-card ${className}`} aria-hidden="true">
         <div className="skeleton-card-heading">
            <Bone width={150} height={17} />
            <Bone width={55} height={12} />
         </div>
         <CardLines count={lines} />
      </section>
   );
}

function PatientDashboardSkeleton() {
   return (
      <div className="skeleton-page skeleton-patient-dashboard">
         <div className="skeleton-dashboard-welcome" aria-hidden="true">
            <div className="skeleton-dashboard-banner">
               <div className="skeleton-row-copy">
                  <Bone width="min(340px, 52vw)" height={27} />
                  <Bone width="min(390px, 58vw)" height={14} />
               </div>
               <div className="skeleton-dashboard-mascot" />
            </div>
            <div className="skeleton-heading-actions">
               <Bone width={122} height={44} radius={12} />
               <Bone width={170} height={44} radius={12} />
            </div>
         </div>
         <div className="skeleton-stat-grid" aria-hidden="true">
            {[0, 1, 2].map((item) => (
               <div className="skeleton-stat-card" key={item}>
                  <Bone width={42} height={42} radius={12} />
                  <Bone width="52%" height={12} />
                  <Bone width="34%" height={23} />
               </div>
            ))}
         </div>
         <div className="skeleton-dashboard-panels">
            <Panel lines={3} />
            <Panel lines={3} />
         </div>
         <div className="skeleton-dashboard-panels skeleton-dashboard-lower">
            <Panel lines={3} />
            <Panel lines={3} />
         </div>
      </div>
   );
}

function StaffDashboardSkeleton() {
   return (
      <div className="skeleton-page skeleton-staff-dashboard">
         <PageHeading />
         <div className="skeleton-kpi-grid" aria-hidden="true">
            {[0, 1, 2, 3].map((item) => (
               <div className="skeleton-kpi-card" key={item}>
                  <Bone width={22} height={22} />
                  <Bone width="58%" height={13} />
                  <Bone width={46} height={36} />
                  <Bone width="72%" height={12} />
               </div>
            ))}
         </div>
         <section className="skeleton-card" aria-hidden="true">
            <div className="skeleton-card-heading">
               <div className="skeleton-row-copy">
                  <Bone width={190} height={17} />
                  <Bone width={145} height={12} />
               </div>
               <Bone width={62} height={12} />
            </div>
            <CardLines count={5} />
         </section>
         <section className="skeleton-card" aria-hidden="true">
            <div className="skeleton-card-heading">
               <Bone width={132} height={17} />
               <Bone width={150} height={34} radius={9} />
            </div>
            <Bone width="100%" height={42} radius={10} />
            <CardLines count={5} />
         </section>
      </div>
   );
}

function BookingSkeleton({ slots = false }) {
   return (
      <div
         className={`skeleton-booking${slots ? ' skeleton-booking-slots' : ''}`}
         aria-hidden="true">
         {slots
            ? Array.from({ length: 3 }, (_, index) => (
                 <div className="skeleton-slot-card" key={index}>
                    <Bone width={48} height={54} radius={12} />
                    <div className="skeleton-row-copy">
                       <Bone width="58%" />
                       <Bone width="35%" height={12} />
                    </div>
                    <Bone width={68} height={40} radius={11} />
                 </div>
              ))
            : Array.from({ length: 8 }, (_, index) => (
                 <div className="skeleton-reason-row" key={index}>
                    <Bone width={17} height={17} radius={99} />
                    <Bone width={`${index % 3 === 0 ? 54 : 68}%`} height={13} />
                 </div>
              ))}
      </div>
   );
}

function WaitlistSkeleton() {
   return (
      <div className="skeleton-waitlist-list" aria-hidden="true">
         {[0, 1, 2].map((item) => (
            <section
               className="skeleton-card skeleton-waitlist-card"
               key={item}>
               <div className="skeleton-waitlist-copy">
                  <Bone width={80} height={24} radius={99} />
                  <Bone width="44%" height={16} />
                  <Bone width="62%" height={13} />
                  <Bone width="56%" height={12} />
               </div>
               <Bone width={54} height={13} />
            </section>
         ))}
      </div>
   );
}

function AppointmentsSkeleton() {
   return (
      <div className="skeleton-page skeleton-appointments">
         <PageHeading />
         <section className="skeleton-appointment-section" aria-hidden="true">
            <Bone width={95} height={11} />
            <TableSkeleton columns={6} rows={1} />
         </section>
         <section className="skeleton-appointment-section" aria-hidden="true">
            <Bone width={132} height={11} />
            <TableSkeleton columns={5} rows={2} />
         </section>
      </div>
   );
}

function ScheduleSkeleton() {
   return (
      <div className="skeleton-page skeleton-schedule">
         <PageHeading />
         <TabsSkeleton />
         <section className="skeleton-provider-summary" aria-hidden="true">
            <Bone width={48} height={48} radius={13} />
            <div className="skeleton-row-copy">
               <Bone width={190} height={15} />
               <Bone width={235} height={13} />
            </div>
            <Bone width={132} height={13} />
         </section>
         <section
            className="skeleton-card skeleton-schedule-list"
            aria-hidden="true">
            {Array.from({ length: 7 }, (_, index) => (
               <div className="skeleton-schedule-row" key={index}>
                  <Bone width={58} height={12} />
                  <Bone width={3} height={32} radius={99} />
                  <div className="skeleton-row-copy">
                     <Bone width={`${index % 2 ? 34 : 47}%`} height={14} />
                     <Bone width="28%" height={12} />
                  </div>
                  <Bone width={16} height={16} radius={99} />
               </div>
            ))}
         </section>
      </div>
   );
}

function SlotManagementSkeleton() {
   return (
      <div className="skeleton-page skeleton-slot-management">
         <PageHeading />
         <div className="skeleton-slot-board" aria-hidden="true">
            <div className="skeleton-slot-grid-row skeleton-slot-grid-heading">
               <Bone width={60} height={12} />
               {Array.from({ length: 10 }, (_, index) => (
                  <Bone key={index} width={36} height={11} />
               ))}
            </div>
            {Array.from({ length: 6 }, (_, row) => (
               <div className="skeleton-slot-grid-row" key={row}>
                  <Bone width={64} height={12} />
                  {Array.from({ length: 10 }, (_, column) => (
                     <Bone key={column} height={30} radius={5} />
                  ))}
               </div>
            ))}
         </div>
         <section className="skeleton-card">
            <Bone width={145} height={15} />
            <TableSkeleton columns={3} rows={3} />
         </section>
      </div>
   );
}

function QueueSkeleton() {
   return (
      <div className="skeleton-page skeleton-queue">
         <PageHeading />
         <TabsSkeleton />
         <div className="skeleton-queue-cards" aria-hidden="true">
            {[0, 1].map((item) => (
               <section className="skeleton-card" key={item}>
                  <Bone width={94} height={24} radius={99} />
                  <Bone width="50%" height={16} />
                  <Bone width="66%" height={13} />
                  <Bone width="42%" height={11} />
                  <Bone width="75%" height={11} />
               </section>
            ))}
         </div>
      </div>
   );
}

function DisputesSkeleton() {
   return (
      <div className="skeleton-page skeleton-disputes">
         <PageHeading actions />
         <section className="skeleton-card">
            <TableSkeleton columns={5} rows={4} />
         </section>
      </div>
   );
}

function DisputeDetailSkeleton() {
   return (
      <div className="skeleton-page skeleton-dispute-detail">
         <Bone width={112} height={13} />
         <Bone width="min(310px, 82vw)" height={23} />
         <section className="skeleton-card">
            <TableSkeleton columns={5} rows={5} />
         </section>
         <section className="skeleton-card skeleton-letter">
            <Bone width={180} height={13} />
            <Bone width="88%" height={13} />
            <Bone width="94%" height={13} />
            <Bone width="78%" height={13} />
            <Bone width="86%" height={13} />
         </section>
      </div>
   );
}

function SessionSkeleton() {
   return (
      <div className="skeleton-session" aria-hidden="true">
         <div className="skeleton-session-brand">
            <img src="/juanaccess-logo.svg" alt="" />
            <Bone width={110} height={13} />
         </div>
         <section className="skeleton-session-card">
            <Bone width={190} height={24} />
            <Bone width={245} height={14} />
            <Bone width="100%" height={42} radius={10} />
            <Bone width="100%" height={42} radius={10} />
            <Bone width="100%" height={44} radius={11} />
         </section>
      </div>
   );
}

function BillProcessingSkeleton() {
   return (
      <div className="skeleton-bill-processing" aria-hidden="true">
         <div className="skeleton-processing-file">
            <Bone width={40} height={40} radius={12} />
            <div className="skeleton-row-copy">
               <Bone width={170} height={14} />
               <Bone width={112} height={11} />
            </div>
         </div>
         <div className="skeleton-processing-lines">
            {[0, 1, 2].map((item) => (
               <div className="skeleton-processing-row" key={item}>
                  <Bone width="38%" height={12} />
                  <Bone width="16%" height={12} />
                  <Bone width="20%" height={18} radius={99} />
               </div>
            ))}
         </div>
      </div>
   );
}

const variants = {
   'patient-dashboard': PatientDashboardSkeleton,
   'staff-dashboard': StaffDashboardSkeleton,
   'booking-reasons': () => <BookingSkeleton />,
   'booking-slots': () => <BookingSkeleton slots />,
   'waitlist-list': WaitlistSkeleton,
   appointments: AppointmentsSkeleton,
   schedule: ScheduleSkeleton,
   'slot-management': SlotManagementSkeleton,
   queue: QueueSkeleton,
   disputes: DisputesSkeleton,
   'dispute-detail': DisputeDetailSkeleton,
   session: SessionSkeleton,
   'bill-processing': BillProcessingSkeleton,
};

function LoadingSkeleton({ variant, label = 'page' }) {
   const Content = variants[variant];
   if (!Content) return null;

   return (
      <div className="page-loading" role="status" aria-busy="true">
         <span className="page-loading-announcement">Loading {label}…</span>
         <div aria-hidden="true">
            <Content />
         </div>
      </div>
   );
}

export default LoadingSkeleton;
