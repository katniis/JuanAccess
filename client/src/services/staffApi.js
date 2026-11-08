const apiBaseUrl = (
   import.meta.env.VITE_API_URL ||
   (import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin)
).replace(/\/$/, '');

export async function staffRequest(path, { method = 'GET', body } = {}) {
   let response;
   try {
      response = await fetch(`${apiBaseUrl}${path}`, {
         method,
         credentials: 'include',
         ...(body !== undefined && {
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
         data?.error || data?.message || 'The request could not be completed.',
      );
      error.status = response.status;
      error.data = data;
      throw error;
   }
   return data;
}
