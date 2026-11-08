import {
   BrowserRouter,
   Link,
   Navigate,
   Route,
   Routes,
   useLocation,
} from 'react-router-dom';
import AuthProvider, { useAuth } from './contexts/AuthContext.jsx';
import AuthPage from './pages/AuthPage.jsx';
import AppErrorBoundary from './components/AppErrorBoundary.jsx';
import ErrorState from './components/ErrorState.jsx';
import ComingSoon from './pages/ComingSoon.jsx';
import PatientLayout from './layouts/PatientLayout.jsx';
import BookAppointment from './pages/patient/BookAppointment.jsx';
import PatientAppointments from './pages/patient/PatientAppointments.jsx';
import PatientDashboard from './pages/patient/PatientDashboard.jsx';
import PatientWaitlist from './pages/patient/PatientWaitlist.jsx';
import UploadBill from './pages/patient/UploadBill.jsx';
import StaffLayout from './layouts/StaffLayout.jsx';
import StaffAppeals from './pages/staff/StaffAppeals.jsx';
import StaffAccess from './pages/staff/StaffAccess.jsx';
import StaffAttention from './pages/staff/StaffAttention.jsx';
import StaffDashboard from './pages/staff/StaffDashboard.jsx';
import StaffDisputeDetail from './pages/staff/StaffDisputeDetail.jsx';
import StaffDisputes from './pages/staff/StaffDisputes.jsx';
import StaffPriorAuth from './pages/staff/StaffPriorAuth.jsx';
import StaffPatientRecord from './pages/staff/StaffPatientRecord.jsx';
import StaffSchedule from './pages/staff/StaffSchedule.jsx';
import StaffSlotManagement from './pages/staff/StaffSlotManagement.jsx';
import { getHomePathForRole } from './utils/authRoutes.js';

function SessionRestoring() {
   return (
      <main className="session-status-screen" role="status" aria-busy="true">
         <section className="session-restore-card">
            <img src="/juanaccess-logo.svg" alt="JuanAccess" />
            <span className="session-restore-spinner" aria-hidden="true" />
            <h1>Restoring your session</h1>
            <p>Checking your secure connection to JuanAccess…</p>
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
                     <Route path="settings" element={<StaffAccess />} />
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
                     <Route
                        path="settings"
                        element={<ComingSoon title="Settings" />}
                     />
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
