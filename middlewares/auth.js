const merchantOnly = (req, res, next) => {
  if (!req.user?.role || req.user.role !== "merchant") {
    console.warn(`Access denied for user: ${req.user?.id || "unknown"}`);
    return res.status(403).json({ message: "Access denied: Merchants only" });
  }
  next();
};


const adminOnly = (req, res, next) => {
  if (!req.user?.role || req.user.role !== "admin") {
    console.warn(`Access denied for user: ${req.user?.id || "unknown"}`);
    return res.status(403).json({ message: "Access denied: Admins only" });
  }
  next();
};

const userOnly = (req, res, next) => {
  if (!req.user?.role || req.user.role !== "user") {
    console.warn(`Access denied for user: ${req.user?.id || "unknown"}`);
    return res.status(403).json({ message: "Access denied: Users only" });
  }
  next();
};

// ✅ New flexible middleware
const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied: Insufficient permissions" });
    }
    next();
  };
};

module.exports = {
  merchantOnly,
  adminOnly,
  userOnly,
  allowRoles, 
};
