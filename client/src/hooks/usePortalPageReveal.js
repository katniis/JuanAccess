import { gsap, useGSAP } from '../utils/portalGsap.js';

export function usePortalPageReveal(scopeRef, ready, celebrate = false) {
   useGSAP(
      () => {
         if (!ready || !scopeRef.current) return undefined;

         const media = gsap.matchMedia();
         media.add('(prefers-reduced-motion: reduce)', () =>
            gsap.set(scopeRef.current, { autoAlpha: 1 }),
         );
         media.add('(prefers-reduced-motion: no-preference)', () => {
            gsap.fromTo(
               scopeRef.current,
               { autoAlpha: 0 },
               {
                  autoAlpha: 1,
                  duration: celebrate ? 0.38 : 0.32,
                  ease: 'power2.out',
               },
            );
            if (celebrate) {
               const successIcon =
                  scopeRef.current.querySelector('.success-icon');
               if (successIcon) {
                  gsap.fromTo(
                     successIcon,
                     { scale: 0.72, rotation: -10 },
                     {
                        scale: 1,
                        rotation: 0,
                        duration: 0.48,
                        ease: 'back.out(1.7)',
                        delay: 0.08,
                     },
                  );
               }
            }
         });
         return () => media.revert();
      },
      {
         scope: scopeRef,
         dependencies: [ready, celebrate],
         revertOnUpdate: true,
      },
   );
}
