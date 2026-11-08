export function getHomePathForRole(role) {
   if (role === 'patient') return '/patient';
   if (role === 'staff' || role === 'staff_admin') return '/staff';
   return '/login';
}
