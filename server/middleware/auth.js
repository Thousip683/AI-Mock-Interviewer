import { getAuth } from "@clerk/express";

const auth = (req, res, next) => {
  const endpoint = `${req.method} ${req.originalUrl || req.url}`;
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.warn(`[AUTH] ⚠️ Missing Authorization header on protected route: ${endpoint}`);
  } else if (!authHeader.startsWith('Bearer ')) {
    console.warn(`[AUTH] ⚠️ Authorization header format unexpected (expected "Bearer <token>"): ${endpoint}`);
  }

  try {
    const authData = getAuth(req);

    if (!authData || !authData.userId) {
      console.warn(`[AUTH] ❌ Unauthorized request to ${endpoint} - No valid Clerk userId. (SessionStatus: "${authData?.sessionStatus || 'none'}")`);
      return res.status(401).json({
        error: "Unauthorized",
        message: "You must be logged in to perform this action.",
      });
    }

    req.userId = authData.userId;
    console.log(`[AUTH] ✅ Verified userId: "${authData.userId}" for ${endpoint}`);

    next();
  } catch (err) {
    console.error(`[AUTH] ❌ Authentication error on ${endpoint}: ${err.message}`, err);

    return res.status(401).json({
      error: "Authentication failed",
      message: err.message,
    });
  }
};

export default auth;