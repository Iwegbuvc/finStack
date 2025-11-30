// middlewares/roleAuth.js
const merchantOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "merchant") {
    return res.status(403).json({ message: "Access denied: Merchants only" });
  }
  next();
};

const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied: Admins only" });
  }
  next();
};

const userOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "user") {
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
