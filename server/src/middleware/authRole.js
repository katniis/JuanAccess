export const requireStaff = (req, res, next) => {
   if (!req.user || !['staff', 'staff_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Staff access required' });
   }
   return next();
};

export const requireStaffAdmin = (req, res, next) => {
   if (!req.user || req.user.role !== 'staff_admin') {
      return res
         .status(403)
         .json({ error: 'Staff administrator access required' });
   }
   return next();
};
