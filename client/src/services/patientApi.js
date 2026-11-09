const apiBaseUrl = (
   import.meta.env.VITE_API_URL ||
   (import.meta.env.DEV ? 'http://localhost:3000' : '/api')
).replace(/\/$/, '');

export async function patientRequest(path, { method = 'GET', body } = {}) {
   let response;

   try {
      const isFormData = body instanceof FormData;
      response = await fetch(`${apiBaseUrl}${path}`, {
         method,
         credentials: 'include',
         ...(body === undefined
            ? {}
            : isFormData
              ? { body }
              : {
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify(body),
                }),
      });
   } catch {
      throw new Error(
         'Could not connect to JuanAccess. Check that the server is running.',
      );
   }

   const data =
      response.status === 204 ? null : await response.json().catch(() => ({}));

   if (!response.ok) {
      const error = new Error(
         data?.error || data?.message || 'The request could not be completed.',
      );
      error.status = response.status;
      throw error;
   }

   return data;
}
