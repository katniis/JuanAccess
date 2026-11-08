import Icon from './Icon.jsx';

function ErrorState({
   title = 'Something went wrong',
   message,
   onRetry = () => window.location.reload(),
   retryLabel = 'Reload page',
   compact = false,
   children,
}) {
   const Heading = compact ? 'h2' : 'h1';

   return (
      <section
         className={'error-state' + (compact ? ' compact' : '')}
         role="alert"
         aria-live="assertive"
         aria-atomic="true">
         <span className="error-state-icon">
            <Icon name="alert" />
         </span>
         <div className="error-state-copy">
            <Heading>{title}</Heading>
            <p>{message}</p>
         </div>
         <div className="error-state-actions">
            {onRetry && (
               <button
                  className="button button-primary"
                  type="button"
                  onClick={onRetry}>
                  {retryLabel}
               </button>
            )}
            {children}
         </div>
      </section>
   );
}

export default ErrorState;
