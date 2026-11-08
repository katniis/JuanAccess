import { useRef } from 'react';
import Icon from './Icon.jsx';
import { gsap, useGSAP } from '../utils/portalGsap.js';

function PortalActionProgress({
   title,
   detail,
   steps = [],
   activeStep = 0,
   completedSteps = 0,
   complete = false,
}) {
   const rootRef = useRef(null);
   const spinnerRef = useRef(null);

   useGSAP(
      () => {
         const media = gsap.matchMedia();
         media.add('(prefers-reduced-motion: reduce)', () =>
            gsap.set(rootRef.current, { autoAlpha: 1, y: 0 }),
         );
         media.add('(prefers-reduced-motion: no-preference)', () => {
            gsap.fromTo(
               rootRef.current,
               { autoAlpha: 0, y: 8 },
               {
                  autoAlpha: 1,
                  y: 0,
                  duration: 0.28,
                  ease: 'power2.out',
               },
            );
         });
         return () => media.revert();
      },
      { scope: rootRef },
   );

   useGSAP(
      () => {
         if (complete || !spinnerRef.current) return undefined;
         const media = gsap.matchMedia();
         media.add('(prefers-reduced-motion: reduce)', () =>
            gsap.set(spinnerRef.current, { rotation: 0 }),
         );
         media.add('(prefers-reduced-motion: no-preference)', () => {
            gsap.to(spinnerRef.current, {
               rotation: 360,
               duration: 1.15,
               ease: 'none',
               repeat: -1,
            });
         });
         return () => media.revert();
      },
      { scope: rootRef, dependencies: [complete], revertOnUpdate: true },
   );

   useGSAP(
      () => {
         if (!complete) return undefined;
         const indicator = rootRef.current?.querySelector(
            '.portal-progress-indicator',
         );
         if (!indicator) return undefined;
         const media = gsap.matchMedia();
         media.add('(prefers-reduced-motion: no-preference)', () => {
            gsap.fromTo(
               indicator,
               { scale: 0.85 },
               { scale: 1, duration: 0.28, ease: 'back.out(1.6)' },
            );
         });
         return () => media.revert();
      },
      { scope: rootRef, dependencies: [complete], revertOnUpdate: true },
   );

   useGSAP(
      () => {
         if (complete) return undefined;
         const active = rootRef.current?.querySelector(
            '.portal-progress-step.active',
         );
         if (!active) return undefined;
         const media = gsap.matchMedia();
         media.add('(prefers-reduced-motion: no-preference)', () => {
            gsap.fromTo(
               active,
               { autoAlpha: 0.5, x: 5 },
               { autoAlpha: 1, x: 0, duration: 0.2, ease: 'power2.out' },
            );
         });
         return () => media.revert();
      },
      {
         scope: rootRef,
         dependencies: [activeStep, complete],
         revertOnUpdate: true,
      },
   );

   return (
      <section
         className={'portal-action-progress' + (complete ? ' complete' : '')}
         role="status"
         aria-live="polite"
         aria-busy={!complete}
         ref={rootRef}>
         <span className="portal-progress-indicator" aria-hidden="true">
            {!complete && (
               <span className="portal-progress-spinner" ref={spinnerRef} />
            )}
            <Icon name={complete ? 'check' : 'plus'} />
         </span>
         <div className="portal-progress-copy">
            <p className="portal-progress-kicker">
               {complete ? 'Confirmed' : 'In progress'}
            </p>
            <h2>{title}</h2>
            <p>{detail}</p>
            {steps.length > 0 && (
               <ol className="portal-progress-steps">
                  {steps.map((step, index) => (
                     <li
                        className={
                           'portal-progress-step' +
                           (complete || index < completedSteps
                              ? ' complete'
                              : '') +
                           (index === activeStep && !complete ? ' active' : '')
                        }
                        aria-current={
                           index === activeStep && !complete
                              ? 'step'
                              : undefined
                        }
                        key={step}>
                        <span aria-hidden="true">
                           {complete || index < completedSteps ? (
                              <Icon name="check" />
                           ) : index === activeStep && !complete ? (
                              <span className="portal-progress-step-dot" />
                           ) : (
                              <span />
                           )}
                        </span>
                        {step}
                     </li>
                  ))}
               </ol>
            )}
         </div>
      </section>
   );
}

export default PortalActionProgress;
