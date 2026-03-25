const supabase = require('../supabaseClient');

// This function runs before any protected route
// It checks the token sent in the request header
const protect = async (req, res, next) => {
  try {
    // 1. Get the token from the Authorization header
    // Frontend sends: Authorization: Bearer eyJhb...
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
     // 2. Ask Supabase to verify the token
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // 3. Get the user's role from our users table
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    // 4. Attach user info to the request so routes can use it
    // Any route can now access req.user.role, req.user.id etc.
    req.user = { ...user, ...profile };
      // 5. Call next() to continue to the actual route handler
    next();

  } catch (err) {
    res.status(500).json({ error: 'Auth error' });
  }
};

// Extra middleware — only allows admins through
const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = { protect, adminOnly };