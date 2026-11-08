import { useEffect, useRef, useState } from 'react';
import ErrorState from '../../components/ErrorState.jsx';
import Icon from '../../components/Icon.jsx';
import LoadingSkeleton from '../../components/LoadingSkeleton.jsx';
import { usePortalPageReveal } from '../../hooks/usePortalPageReveal.js';
import { getStaffSlotManagement } from '../../services/staffSlotManagement.js';
import { gsap, useGSAP } from '../../utils/portalGsap.js';

function todayInManila() {
   return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
   }).format(new Date());
}

function StaffSlotManagement() {
   const [facilityResult, setFacilityResult] = useState(null);
   const [selectedDate, setSelectedDate] = useState(todayInManila);
   const hasFacilityResult = facilityResult?.date === selectedDate;
   const facility = hasFacilityResult ? facilityResult.facility : null;
   const hasError = hasFacilityResult && facilityResult.error;
   const [selectedSlot, setSelectedSlot] = useState(null);
   const closeButtonRef = useRef(null);
   const slotTriggerRef = useRef(null);
   const boardDragRef = useRef(null);
   const suppressBoardClickRef = useRef(false);
   const pageRef = useRef(null);
   const drawerRef = useRef(null);
   usePortalPageReveal(pageRef, Boolean(facility));

   useGSAP(
      () => {
         if (!selectedSlot || !drawerRef.current) return undefined;
         const media = gsap.matchMedia();
         media.add('(prefers-reduced-motion: reduce)', () =>
            gsap.set(drawerRef.current, { x: 0, autoAlpha: 1 }),
         );
         media.add('(prefers-reduced-motion: no-preference)', () =>
            gsap.fromTo(
               drawerRef.current,
               { x: 28, autoAlpha: 0 },
               { x: 0, autoAlpha: 1, duration: 0.24, ease: 'power2.out' },
            ),
         );
         return () => media.revert();
      },
      {
         scope: drawerRef,
         dependencies: [Boolean(selectedSlot)],
         revertOnUpdate: true,
      },
   );

   useEffect(() => {
      let current = true;

      getStaffSlotManagement(selectedDate)
         .then((data) => {
            if (current)
               setFacilityResult({ date: selectedDate, facility: data });
         })
         .catch(() => {
            if (current) setFacilityResult({ date: selectedDate, error: true });
         });

      return () => {
         current = false;
      };
   }, [selectedDate]);

   useEffect(() => {
      if (!selectedSlot) return undefined;

      const previousOverflow = document.body.style.overflow;
      const closeOnEscape = (event) => {
         if (event.key === 'Escape') setSelectedSlot(null);
         if (event.key === 'Tab') {
            event.preventDefault();
            closeButtonRef.current?.focus();
         }
      };

      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', closeOnEscape);
      closeButtonRef.current?.focus();

      return () => {
         document.body.style.overflow = previousOverflow;
         document.removeEventListener('keydown', closeOnEscape);
         slotTriggerRef.current?.focus();
      };
   }, [selectedSlot]);

   if (hasError) {
      return (
         <ErrorState
            title="Slot management couldn’t load"
            message="Check your connection and reload this page to try again."
         />
      );
   }

   if (!facility) {
      return (
         <LoadingSkeleton variant="slot-management" label="slot management" />
      );
   }

   const selectedEvent = selectedSlot?.event;
   const slotRange = (startIndex, span = 1) =>
      `${facility.times[startIndex]} – ${facility.times[startIndex + span] ?? '5:00 PM'}`;
   const selectedSlotEnd =
      selectedSlot?.startIndex + (selectedEvent?.span ?? 1);
   const selectedSlotActivity =
      selectedSlot?.room.events.filter(
         (event) =>
            event.startIndex < selectedSlotEnd &&
            event.startIndex + event.span > selectedSlot.startIndex,
      ) ?? [];
   const handleBoardPointerDown = (event) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      suppressBoardClickRef.current = false;
      boardDragRef.current = {
         pointerId: event.pointerId,
         startX: event.clientX,
         scrollLeft: event.currentTarget.scrollLeft,
         dragging: false,
      };
   };
   const handleBoardPointerMove = (event) => {
      const drag = boardDragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      const distance = event.clientX - drag.startX;
      if (!drag.dragging && Math.abs(distance) < 4) return;
      if (!drag.dragging) {
         drag.dragging = true;
         suppressBoardClickRef.current = true;
         event.currentTarget.classList.add('is-dragging');
         event.currentTarget.setPointerCapture(event.pointerId);
      }

      event.currentTarget.scrollLeft = drag.scrollLeft - distance;
      event.preventDefault();
   };
   const finishBoardDrag = (event) => {
      if (boardDragRef.current?.pointerId !== event.pointerId) return;
      boardDragRef.current = null;
      event.currentTarget.classList.remove('is-dragging');
   };
   const suppressDraggedCellClick = (event) => {
      if (!suppressBoardClickRef.current) return;
      suppressBoardClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
   };

   return (
      <div className="staff-slot-page" ref={pageRef}>
         <header className="staff-schedule-heading">
            <h1>Slot Management</h1>
            <p>{facility.dateLabel} — facility view</p>
            <label className="staff-date-field">
               Date
               <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
               />
            </label>
         </header>

         <div
            className="staff-slot-board-scroll"
            role="region"
            aria-label="Facility schedule, drag or scroll horizontally to see later times"
            tabIndex="0"
            onPointerDown={handleBoardPointerDown}
            onPointerMove={handleBoardPointerMove}
            onPointerUp={finishBoardDrag}
            onPointerCancel={finishBoardDrag}
            onClickCapture={suppressDraggedCellClick}>
            <table className="staff-slot-board">
               <thead>
                  <tr>
                     <th scope="col">Room</th>
                     {facility.times.map((time) => (
                        <th scope="col" key={time}>
                           {time.replace(' AM', '').replace(' PM', '')}
                        </th>
                     ))}
                  </tr>
               </thead>
               <tbody>
                  {facility.rooms.length ? (
                     facility.rooms.map((room) => {
                        const events = new Map(
                           room.events.map((event) => [
                              event.startIndex,
                              event,
                           ]),
                        );
                        const cells = [];
                        let slotIndex = 0;

                        while (slotIndex < facility.times.length) {
                           const event = events.get(slotIndex);
                           if (event) {
                              cells.push(
                                 <td key={event.id} colSpan={event.span}>
                                    <button
                                       className={`staff-slot-event ${event.tone}`}
                                       type="button"
                                       aria-haspopup="dialog"
                                       aria-label={`${room.name}, ${slotRange(event.startIndex, event.span)}, ${event.patient}${event.detail ? `, ${event.detail}` : ''}`}
                                       title={[event.patient, event.detail]
                                          .filter(Boolean)
                                          .join(' · ')}
                                       onClick={(clickEvent) => {
                                          slotTriggerRef.current =
                                             clickEvent.currentTarget;
                                          setSelectedSlot({
                                             room,
                                             startIndex: event.startIndex,
                                             event,
                                          });
                                       }}>
                                       <strong>{event.patient}</strong>
                                       {event.detail && (
                                          <small>{event.detail}</small>
                                       )}
                                    </button>
                                 </td>,
                              );
                              slotIndex += event.span;
                           } else {
                              const openIndex = slotIndex;
                              cells.push(
                                 <td key={`${room.name}-${openIndex}`}>
                                    <button
                                       className="staff-slot-open"
                                       type="button"
                                       aria-haspopup="dialog"
                                       aria-label={`${room.name}, ${slotRange(openIndex)}, available`}
                                       onClick={(clickEvent) => {
                                          slotTriggerRef.current =
                                             clickEvent.currentTarget;
                                          setSelectedSlot({
                                             room,
                                             startIndex: openIndex,
                                             event: null,
                                          });
                                       }}
                                    />
                                 </td>,
                              );
                              slotIndex += 1;
                           }
                        }

                        return (
                           <tr key={room.name}>
                              <th scope="row">{room.name}</th>
                              {cells}
                           </tr>
                        );
                     })
                  ) : (
                     <tr>
                        <td
                           className="staff-table-empty"
                           colSpan={facility.times.length + 1}>
                           No rooms were returned for this date.
                        </td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>

         <section
            className="staff-slot-waitlist"
            aria-labelledby="slot-waitlist-heading">
            <h2 id="slot-waitlist-heading">Waitlist Monitor</h2>
            <div className="staff-slot-waitlist-scroll">
               <table>
                  <thead>
                     <tr>
                        <th scope="col">Patient</th>
                        <th scope="col">Matched Criteria</th>
                        <th scope="col">Offer Status</th>
                     </tr>
                  </thead>
                  <tbody>
                     {facility.waitlist.length ? (
                        facility.waitlist.map((entry) => (
                           <tr key={entry.id}>
                              <td>{entry.patient}</td>
                              <td>{entry.criteria}</td>
                              <td>
                                 <span
                                    className={`staff-slot-waitlist-status ${entry.tone}`}>
                                    {entry.status}
                                 </span>
                                 {entry.remaining && (
                                    <code className="staff-slot-countdown">
                                       {entry.remaining}
                                    </code>
                                 )}
                              </td>
                           </tr>
                        ))
                     ) : (
                        <tr>
                           <td className="staff-table-empty" colSpan="3">
                              No patients are currently waiting.
                           </td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>
         </section>

         {selectedSlot && (
            <div
               className="staff-detail-backdrop"
               onMouseDown={(event) => {
                  if (event.target === event.currentTarget)
                     setSelectedSlot(null);
               }}>
               <aside
                  className="staff-detail-drawer"
                  ref={drawerRef}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="slot-detail-title">
                  <header className="staff-detail-heading">
                     <h2 id="slot-detail-title">
                        {selectedSlot.room.name} ·{' '}
                        {facility.times[selectedSlot.startIndex]}
                     </h2>
                     <button
                        className="staff-detail-close"
                        type="button"
                        ref={closeButtonRef}
                        aria-label="Close room details"
                        onClick={() => setSelectedSlot(null)}>
                        <Icon name="close" />
                     </button>
                  </header>
                  <div className="staff-detail-body staff-slot-detail-body">
                     <dl className="staff-detail-grid">
                        <div>
                           <dt>Room</dt>
                           <dd>{selectedSlot.room.name}</dd>
                        </div>
                        <div>
                           <dt>Selected Time</dt>
                           <dd>
                              {slotRange(
                                 selectedSlot.startIndex,
                                 selectedEvent?.span ?? 1,
                              )}
                           </dd>
                        </div>
                        <div>
                           <dt>Slot Status</dt>
                           <dd>
                              {selectedEvent
                                 ? selectedEvent.tone === 'muted'
                                    ? 'Blocked'
                                    : 'Scheduled'
                                 : 'Available'}
                           </dd>
                        </div>
                        <div>
                           <dt>Activity</dt>
                           <dd>
                              {selectedEvent
                                 ? [selectedEvent.patient, selectedEvent.detail]
                                      .filter(Boolean)
                                      .join(' · ')
                                 : 'No appointment or block'}
                           </dd>
                        </div>
                     </dl>

                     <section
                        className="staff-slot-room-agenda"
                        aria-labelledby="slot-room-agenda-title">
                        <h3 id="slot-room-agenda-title">
                           Activity during selected time
                        </h3>
                        {selectedSlotActivity.length ? (
                           <ul>
                              {selectedSlotActivity.map((event) => (
                                 <li className={event.tone} key={event.id}>
                                    <time>
                                       {slotRange(event.startIndex, event.span)}
                                    </time>
                                    <span>
                                       <strong>{event.patient}</strong>
                                       {event.detail && (
                                          <small>{event.detail}</small>
                                       )}
                                    </span>
                                 </li>
                              ))}
                           </ul>
                        ) : (
                           <p>
                              No appointment or room block is scheduled for this
                              time.
                           </p>
                        )}
                     </section>

                     <footer className="prior-auth-detail-footer">
                        <button
                           className="button button-quiet"
                           type="button"
                           onClick={() => setSelectedSlot(null)}>
                           Close
                        </button>
                     </footer>
                  </div>
               </aside>
            </div>
         )}
      </div>
   );
}

export default StaffSlotManagement;
