import { useEffect, useRef } from 'react';
import Icon from './Icon.jsx';
import { gsap, useGSAP } from '../utils/portalGsap.js';

function Toast({ toast, onDismiss, onExitComplete }) {
   const toastRef = useRef(null);
   const dismissRef = useRef(onDismiss);

   useEffect(() => {
      dismissRef.current = onDismiss;
   }, [onDismiss]);

   useEffect(() => {
      if (toast.isLeaving) return undefined;
      const timeout = window.setTimeout(
         () => dismissRef.current(),
         toast.type === 'error' ? 6000 : 4500,
      );
      return () => window.clearTimeout(timeout);
   }, [toast.id, toast.isLeaving, toast.type]);

   useGSAP(
      () => {
         const element = toastRef.current;
         if (!element) return undefined;

         const media = gsap.matchMedia();
         media.add('(prefers-reduced-motion: reduce)', () => {
            gsap.set(element, {
               autoAlpha: toast.isLeaving ? 0 : 1,
               x: 0,
               scale: 1,
            });
            if (toast.isLeaving) window.requestAnimationFrame(onExitComplete);
         });
         media.add('(prefers-reduced-motion: no-preference)', () => {
            if (toast.isLeaving) {
               gsap.to(element, {
                  autoAlpha: 0,
                  x: 24,
                  scale: 0.97,
                  duration: 0.2,
                  ease: 'power2.in',
                  onComplete: onExitComplete,
               });
            } else {
               gsap.fromTo(
                  element,
                  { autoAlpha: 0, x: 22, scale: 0.97 },
                  {
                     autoAlpha: 1,
                     x: 0,
                     scale: 1,
                     duration: 0.28,
                     ease: 'power3.out',
                  },
               );
            }
         });
         return () => media.revert();
      },
      {
         scope: toastRef,
         dependencies: [toast.isLeaving],
         revertOnUpdate: true,
      },
   );

   return (
      <div
         ref={toastRef}
         className={'toast ' + toast.type}
         role={toast.type === 'error' ? 'alert' : 'status'}>
         <span className="toast-icon">
            <Icon name={toast.type === 'success' ? 'check' : 'info'} />
         </span>
         <p>{toast.message}</p>
         <button
            type="button"
            aria-label="Dismiss notification"
            onClick={onDismiss}>
            <Icon name="close" />
         </button>
      </div>
   );
}

export default Toast;
