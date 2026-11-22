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

// Returns { enrolmentCode, expiresAt } once; earlier unused codes stop working.
export async function issueStaffEnrolmentCode(userId) {
   return staffRequest(`/staff/admin/users/${userId}/enrolment-code`, {
      method: 'POST',
   });
}

// Clears the user's Second Factor, signs them out everywhere, and returns a fresh Enrolment Code.
export async function resetStaffSecondFactor(userId) {
   return staffRequest(`/staff/admin/users/${userId}/second-factor/reset`, {
      method: 'POST',
   });
}
