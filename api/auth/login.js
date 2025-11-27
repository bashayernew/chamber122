// api/auth/login.js
import prisma from '../lib/db.js';
import { comparePassword, createToken, setAuthCookie } from '../lib/auth.js';
import { createHandler, parseBody } from '../lib/api-handler.js';

export default createHandler(async (req, res, corsHeaders) => {
  if (req.method !== 'POST') {
    throw { status: 405, message: 'Method not allowed' };
  }

  const body = await parseBody(req);
  const { email, password } = body;

  if (!email || !password) {
    throw { status: 400, message: 'Email and password required' };
  }

  // Find user
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw { status: 401, message: 'Invalid email or password' };
  }

  // Verify password
  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    throw { status: 401, message: 'Invalid email or password' };
  }

  // Create token
  const token = createToken(user.id, email);

  // Set cookie
  setAuthCookie(res, token);

  res.writeHead(200, corsHeaders);
  res.end(JSON.stringify({ 
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    token 
  }));
});
