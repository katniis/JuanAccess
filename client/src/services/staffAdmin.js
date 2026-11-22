import { staffRequest } from './staffApi.js';

export async function getStaffUsers() {
   const { users = [] } = await staffRequest('/staff/admin/users');
   return users.filter((user) => ['staff', 'staff_admin'].includes(user.role));
}

export async function createStaffInvitation(details) {
   return staffRequest('/staff/admin/invitations', {
      method: 'POST',
      body: {
         email: details.email,
         role: details.role,
         first_name: details.firstName,
         last_name: details.lastName,
      },
   });
}

// Clears the user's Second Factor and signs them out everywhere.
export async function resetStaffSecondFactor(userId) {
   return staffRequest(`/staff/admin/users/${userId}/second-factor/reset`, {
      method: 'POST',
   });
}
