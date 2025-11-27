const express = require("express");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = 4000;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

const DB_PATH = path.join(process.cwd(), "db.json");
const readDB = () =>
  fs.existsSync(DB_PATH)
    ? JSON.parse(fs.readFileSync(DB_PATH))
    : { users: [], businesses: [] };
const writeDB = (db) =>
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// serve your static files
app.use(express.static(process.cwd()));

// auth middleware
function requireAuth(req, res, next) {
  const token = req.cookies.session;
  if (!token) return res.status(401).json({ ok: false });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ ok: false });
  }
}

// SIGNUP
app.post("/api/auth/signup", async (req, res) => {
  const db = readDB();
  const { email, password, business_name, ...rest } = req.body || {};

  if (!email || !password || !business_name) {
    return res.status(400).json({ ok: false, error: "Missing fields" });
  }

  if (db.users.find((u) => u.email === email)) {
    return res.status(409).json({ ok: false, error: "Email already exists" });
  }

  const password_hash = await bcrypt.hash(password, 10);

  const user = {
    id: crypto.randomUUID(),
    email,
    password_hash,
    role: "provider",
    name: business_name,
  };
  db.users.push(user);

  const business = {
    id: crypto.randomUUID(),
    owner_id: user.id,
    business_name,
    ...rest,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  db.businesses.push(business);

  writeDB(db);

  const token = jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.cookie("session", token, { httpOnly: true, sameSite: "lax" });
  res.json({ ok: true, user: { id: user.id, email: user.email } });
});

// LOGIN
app.post("/api/auth/login", async (req, res) => {
  const db = readDB();
  const { email, password } = req.body || {};

  const user = db.users.find((u) => u.email === email);
  if (!user) return res.status(401).json({ ok: false });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ ok: false });

  const token = jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.cookie("session", token, { httpOnly: true, sameSite: "lax" });
  res.json({ ok: true, user: { id: user.id, email: user.email } });
});

// ME - Allow unauthenticated requests (return null user)
app.get("/api/auth/me", (req, res) => {
  const token = req.cookies.session;
  if (!token) {
    return res.json({ ok: true, user: null });
  }
  try {
    const user = jwt.verify(token, JWT_SECRET);
    res.json({ ok: true, user });
  } catch {
    res.json({ ok: true, user: null });
      }
});

// LOGOUT
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("session");
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
