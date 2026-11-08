import { Component } from 'react';
import ErrorState from './ErrorState.jsx';

class AppErrorBoundary extends Component {
   state = { hasError: false };

   static getDerivedStateFromError() {
      return { hasError: true };
   }

   render() {
      if (this.state.hasError) {
         return (
            <main className="error-route-shell">
               <ErrorState
                  title="JuanAccess hit a problem"
                  message="This page couldn’t be displayed. Reload JuanAccess to try again."
                  retryLabel="Reload JuanAccess"
               />
            </main>
         );
      }

      return this.props.children;
   }
}

export default AppErrorBoundary;
