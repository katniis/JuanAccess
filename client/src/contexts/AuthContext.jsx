import { createContext, useContext, useEffect, useState } from 'react';
import {
   acceptStaffInvitation as acceptStaffInvitationRequest,
   getCurrentUser,
   registerPatient as registerPatientRequest,
   signIn as signInRequest,
   signOut as signOutRequest,
} from '../services/auth.js';

const AuthContext = createContext(null);

function AuthProvider({ children }) {
   const [user, setUser] = useState(null);
   const [loading, setLoading] = useState(true);
   const [authError, setAuthError] = useState(null);
   const [authCheckAttempt, setAuthCheckAttempt] = useState(0);

   useEffect(() => {
      let current = true;

      getCurrentUser()
         .then(({ user: currentUser }) => {
            if (current) {
               setUser(currentUser);
               setAuthError(null);
            }
         })
         .catch((error) => {
            if (!current) return;
            if (error.status === 401) {
               setUser(null);
               setAuthError(null);
            } else {
               setAuthError(
                  error.status
                     ? 'We couldn’t verify your session right now. Please try again.'
                     : 'We can’t reach JuanAccess. Check your connection, then try again.',
               );
            }
         })
         .finally(() => {
            if (current) setLoading(false);
         });

      return () => {
         current = false;
      };
   }, [authCheckAttempt]);

   const retryAuthentication = () => {
      setAuthError(null);
      setLoading(true);
      setAuthCheckAttempt((attempt) => attempt + 1);
   };

   const signIn = async (credentials) => {
      const result = await signInRequest(credentials);
      setUser(result.user);
      setAuthError(null);
      return result.user;
   };

   const registerPatient = async (details) => {
      const result = await registerPatientRequest(details);
      setUser(result.user);
      setAuthError(null);
      return result.user;
   };

   const acceptStaffInvitation = async (invitation) => {
      const result = await acceptStaffInvitationRequest(invitation);
      setUser(result.user);
      setAuthError(null);
      return result.user;
   };

   const signOut = async () => {
      try {
         await signOutRequest();
      } catch {
         // Clear the local view even if the server is temporarily unreachable.
      } finally {
         setUser(null);
         setAuthError(null);
      }
   };

   return (
      <AuthContext.Provider
         value={{
            user,
            loading,
            authError,
            retryAuthentication,
            signIn,
            registerPatient,
            acceptStaffInvitation,
            signOut,
         }}>
         {children}
      </AuthContext.Provider>
   );
}

export function useAuth() {
   const context = useContext(AuthContext);
   if (!context) throw new Error('useAuth must be used inside AuthProvider.');
   return context;
}

export default AuthProvider;
