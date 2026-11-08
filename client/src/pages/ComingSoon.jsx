import { Link } from 'react-router-dom';

function ComingSoon({ title }) {
   return (
      <section className="coming-soon">
         <h1>{title}</h1>
         <p>This page will be added in the next step.</p>
         <Link className="button button-primary" to="/patient">
            Back to Dashboard
         </Link>
      </section>
   );
}

export default ComingSoon;
