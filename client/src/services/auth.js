const apiBaseUrl = (
   import.meta.env.VITE_API_URL ||
   (import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin)
).replace(/\/$/, '');

async function authRequest(path, body) {
   let response;

   try {
      response = await fetch(`${apiBaseUrl}/auth/${path}`, {
         method: body ? 'POST' : 'GET',
         credentials: 'include',
         ...(body && {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
         }),
      });
   } catch {
      throw new Error(
         'Could not connect to JuanAccess. Check that the server is running.',
      );
   }

   const data = await response.json().catch(() => ({}));
   if (!response.ok) {
      const error = new Error(
         data.message || data.error || 'Authentication failed.',
      );
      error.status = response.status;
      throw error;
   }
   return data;
}

export function getCurrentUser() {
   return authRequest('me');
}

export function signIn(credentials) {
   return authRequest('login', credentials);
}

export function registerPatient(details) {
   return authRequest('register', details);
}

export function acceptStaffInvitation(invitation) {
   return authRequest('accept-invite', invitation);
}

export function signOut() {
   return authRequest('logout', {});
}
