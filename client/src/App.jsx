import {
   BrowserRouter,
   Link,
   Navigate,
   Route,
   Routes,
   useLocation,
} from 'react-router-dom';
import AuthProvider from './contexts/AuthContext.jsx';
import { useAuth } from './contexts/useAuth.js';
import AuthPage from './pages/AuthPage.jsx';
import AppErrorBoundary from './components/AppErrorBoundary.jsx';
import ErrorState from './components/ErrorState.jsx';
import PatientLayout from './layouts/PatientLayout.jsx';
import BookAppointment from './pages/patient/BookAppointment.jsx';
import PatientAppointments from './pages/patient/PatientAppointments.jsx';
import PatientDashboard from './pages/patient/PatientDashboard.jsx';
import PatientWaitlist from './pages/patient/PatientWaitlist.jsx';
import UploadBill from './pages/patient/UploadBill.jsx';
import PatientSettings from './pages/patient/PatientSettings.jsx';
import StaffLayout from './layouts/StaffLayout.jsx';
import StaffAppeals from './pages/staff/StaffAppeals.jsx';
import StaffSettings from './pages/staff/StaffSettings.jsx';
import StaffAttention from './pages/staff/StaffAttention.jsx';
import StaffDashboard from './pages/staff/StaffDashboard.jsx';
import StaffDisputeDetail from './pages/staff/StaffDisputeDetail.jsx';
import StaffDisputes from './pages/staff/StaffDisputes.jsx';
import StaffPriorAuth from './pages/staff/StaffPriorAuth.jsx';
import StaffPatientRecord from './pages/staff/StaffPatientRecord.jsx';
import StaffSchedule from './pages/staff/StaffSchedule.jsx';
import StaffSlotManagement from './pages/staff/StaffSlotManagement.jsx';
import AccountRecoveryPage from './pages/AccountRecoveryPage.jsx';
import { getHomePathForRole } from './utils/authRoutes.js';

function SessionRestoring() {
   return (
      <main
         className="session-status-screen is-restoring"
         role="status"
         aria-busy="true">
         <section
            className="session-restore"
            aria-labelledby="session-restore-title">
            <img src="/juanaccess-logo.svg" alt="JuanAccess" />
            <div className="session-restore-content">
               <h1 id="session-restore-title">Getting your portal ready</h1>
               <p>
                  We’re securely checking your saved session. The clinic service
                  may take a moment to wake up before your portal opens.
               </p>
               <div
                  className="session-restore-progress"
                  role="progressbar"
                  aria-label="Checking your secure session">
                  <span aria-hidden="true" />
               </div>
               <p className="session-restore-note">
                  Keep this page open. We’ll continue automatically when the
                  check is complete.
               </p>
            </div>
         </section>
      </main>
   );
}

function AuthGateStatus({ loading, authError, retryAuthentication }) {
   if (loading) return <SessionRestoring />;
   if (!authError) return null;

   return (
      <main className="session-status-screen">
         <ErrorState
            title="We couldn’t verify your session"
            message={authError}
            retryLabel="Try again"
            onRetry={retryAuthentication}
         />
      </main>
   );
}

function HomeRoute() {
   const { user, loading, authError, retryAuthentication } = useAuth();
   if (loading || authError)
      return (
         <AuthGateStatus
            loading={loading}
            authError={authError}
            retryAuthentication={retryAuthentication}
         />
      );
   return (
      <Navigate to={user ? getHomePathForRole(user.role) : '/login'} replace />
   );
}

function PublicOnly({ children }) {
   const { user, loading, authError, retryAuthentication } = useAuth();
   if (loading || authError)
      return (
         <AuthGateStatus
            loading={loading}
            authError={authError}
            retryAuthentication={retryAuthentication}
         />
      );
   return user ? (
      <Navigate to={getHomePathForRole(user.role)} replace />
   ) : (
      children
   );
}

function ProtectedRoute({ allowedRoles, children }) {
   const { user, loading, authError, retryAuthentication } = useAuth();
   const location = useLocation();
   if (loading || authError)
      return (
         <AuthGateStatus
            loading={loading}
            authError={authError}
            retryAuthentication={retryAuthentication}
         />
      );
   if (!user)
      return <Navigate to="/login" state={{ from: location }} replace />;
   if (!allowedRoles.includes(user.role)) {
      return <Navigate to={getHomePathForRole(user.role)} replace />;
   }
   return children;
}

function NotFoundRoute() {
   const { user, loading, authError, retryAuthentication } = useAuth();
   if (loading || authError)
      return (
         <AuthGateStatus
            loading={loading}
            authError={authError}
            retryAuthentication={retryAuthentication}
         />
      );

   return (
      <main className="error-route-shell">
         <ErrorState
            title="We couldn’t find that page"
            message="The link may be out of date, or the address may have a typo."
            onRetry={null}>
            <Link
               className="button button-primary"
               to={user ? getHomePathForRole(user.role) : '/login'}>
               {user ? 'Return to your portal' : 'Go to sign in'}
            </Link>
         </ErrorState>
      </main>
   );
}

function App() {
   return (
      <BrowserRouter>
         <AppErrorBoundary>
            <AuthProvider>
               <Routes>
                  <Route path="/" element={<HomeRoute />} />
                  <Route
                     path="/login"
                     element={
                        <PublicOnly>
                           <AuthPage key="signin" mode="signin" />
                        </PublicOnly>
                     }
                  />
                  <Route
                     path="/signin"
                     element={<Navigate to="/login" replace />}
                  />
                  <Route
                     path="/signup"
                     element={
                        <PublicOnly>
                           <AuthPage key="signup" mode="signup" />
                        </PublicOnly>
                     }
                  />
                  <Route
                     path="/accept-invite"
                     element={
                        <PublicOnly>
                           <AuthPage key="invite" mode="invite" />
                        </PublicOnly>
                     }
                  />
                  <Route
                     path="/forgot-password"
                     element={<AccountRecoveryPage mode="forgot" />}
                  />
                  <Route
                     path="/reset-password"
                     element={<AccountRecoveryPage mode="reset" />}
                  />
                  <Route
                     path="/confirm-email"
                     element={<AccountRecoveryPage mode="confirm-email" />}
                  />
                  <Route
                     path="/staff"
                     element={
                        <ProtectedRoute allowedRoles={['staff', 'staff_admin']}>
                           <StaffLayout />
                        </ProtectedRoute>
                     }>
                     <Route index element={<StaffDashboard />} />
                     <Route path="schedule" element={<StaffSchedule />} />
                     <Route path="slots" element={<StaffSlotManagement />} />
                     <Route path="prior-auth" element={<StaffPriorAuth />} />
                     <Route path="appeals" element={<StaffAppeals />} />
                     <Route path="disputes" element={<StaffDisputes />} />
                     <Route
                        path="disputes/:disputeId"
                        element={<StaffDisputeDetail />}
                     />
                     <Route path="attention" element={<StaffAttention />} />
                     <Route path="settings" element={<StaffSettings />} />
                     <Route
                        path="records/:recordType/:recordId"
                        element={<StaffPatientRecord />}
                     />
                  </Route>
                  <Route
                     path="/patient"
                     element={
                        <ProtectedRoute allowedRoles={['patient']}>
                           <PatientLayout />
                        </ProtectedRoute>
                     }>
                     <Route index element={<PatientDashboard />} />
                     <Route path="book" element={<BookAppointment />} />
                     <Route path="waitlist" element={<PatientWaitlist />} />
                     <Route
                        path="appointments"
                        element={<PatientAppointments />}
                     />
                     <Route path="settings" element={<PatientSettings />} />
                     <Route path="bills" element={<UploadBill />} />
                  </Route>
                  <Route path="*" element={<NotFoundRoute />} />
               </Routes>
            </AuthProvider>
         </AppErrorBoundary>
      </BrowserRouter>
   );
}

export default App;
