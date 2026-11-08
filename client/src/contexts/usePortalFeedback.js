import { useContext } from 'react';
import { PortalFeedbackContext } from './portalFeedbackContextValue.js';

export function usePortalFeedback() {
   const context = useContext(PortalFeedbackContext);
   if (!context)
      throw new Error(
         'usePortalFeedback must be used inside PortalFeedbackProvider.',
      );
   return context;
}
