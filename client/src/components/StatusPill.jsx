function StatusPill({ status, children }) {
   return <span className={`status-pill ${status}`}>{children}</span>;
}

export default StatusPill;
