const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// POST /api/auth/register
// Body: { name, email, password, role }
router.post('/register', async (req, res) => {
  const { name, email, password, role = 'customer' } = req.body;

  try {
    // 1. Create auth account in Supabase
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    
    // 2. Save name + role in our users table
    await supabase.from('users').insert({
      id: data.user.id,
      email,
      name,
      role
    });

    res.status(201).json({ message: 'Registered successfully' });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/auth/login
// Body: { email, password }
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data, error } = await supabase.auth
      .signInWithPassword({ email, password });

    if (error) throw error;

    // Get role from our users table
    const { data: profile } = await supabase
      .from('users')
      .select('name, role')
      .eq('id', data.user.id)
      .single();
        // Return token + user info to frontend
    res.json({
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: profile.name,
        role: profile.role
      }
    });

  } catch (err) {
    res.status(401).json({ error: 'Invalid email or password' });
  }
});

module.exports = router;
