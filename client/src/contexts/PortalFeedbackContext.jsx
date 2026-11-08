import { useCallback, useRef, useState } from 'react';
import Toast from '../components/Toast.jsx';
import { PortalFeedbackContext } from './portalFeedbackContextValue.js';

export function PortalFeedbackProvider({ children }) {
   const [toasts, setToasts] = useState([]);
   const toastsRef = useRef([]);
   const pendingRef = useRef([]);
   const idRef = useRef(0);

   const commitToasts = useCallback((next) => {
      toastsRef.current = next;
      setToasts(next);
   }, []);

   const dismiss = useCallback(
      (id) => {
         const toast = toastsRef.current.find((item) => item.id === id);
         if (!toast || toast.isLeaving) return;
         commitToasts(
            toastsRef.current.map((item) =>
               item.id === id ? { ...item, isLeaving: true } : item,
            ),
         );
      },
      [commitToasts],
   );

   const notify = useCallback(
      ({ type = 'info', message }) => {
         const toast = { id: ++idRef.current, type, message, isLeaving: false };
         if (toastsRef.current.length < 3 && pendingRef.current.length === 0) {
            commitToasts([...toastsRef.current, toast]);
         } else {
            pendingRef.current.push(toast);
            const oldest = toastsRef.current.find((item) => !item.isLeaving);
            if (oldest && !toastsRef.current.some((item) => item.isLeaving))
               dismiss(oldest.id);
         }
      },
      [commitToasts, dismiss],
   );

   const finishToast = useCallback(
      (id) => {
         const next = toastsRef.current.filter((item) => item.id !== id);
         if (pendingRef.current.length && next.length < 3) {
            next.push(pendingRef.current.shift());
         }
         commitToasts(next);
         if (pendingRef.current.length && next.length >= 3) {
            const oldest = next.find((item) => !item.isLeaving);
            if (oldest) window.requestAnimationFrame(() => dismiss(oldest.id));
         }
      },
      [commitToasts, dismiss],
   );

   return (
      <PortalFeedbackContext.Provider value={{ notify }}>
         {children}
         <div className="toast-region" role="region" aria-label="Notifications">
            {toasts.map((toast) => (
               <Toast
                  key={toast.id}
                  toast={toast}
                  onDismiss={() => dismiss(toast.id)}
                  onExitComplete={() => finishToast(toast.id)}
               />
            ))}
         </div>
      </PortalFeedbackContext.Provider>
   );
}
