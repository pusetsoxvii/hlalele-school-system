require("dotenv").config();
const express  = require("express");
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const cors     = require("cors");

const app = express();
app.use(express.json());
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
].filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  return false;
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) return callback(null, true);
      const err = new Error(`CORS blocked for origin ${origin}`);
      err.statusCode = 403;
      return callback(err);
    },
    credentials: true,
  })
);

// ─────────────────────────────────────────────
// DATABASE
// ─────────────────────────────────────────────
async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set");
  }
  if (mongoose.connection.readyState === 1) return;
  if (mongoose.connection.readyState === 2) {
    await mongoose.connection.asPromise();
    return;
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("MongoDB connected");
}

function formatMongoStartupError(err) {
  if (err && err.code === "ECONNREFUSED" && err.syscall === "querySrv") {
    return [
      "Atlas SRV lookup failed.",
      "Check that the MONGODB_URI in backend/.env is the exact Atlas connection string from the Atlas dashboard.",
      "Then verify Network Access allows this machine's IP, and that your DNS/network can resolve mongodb.net SRV records.",
    ].join(" ");
  }

  return err && err.message ? err.message : "Unknown MongoDB startup error";
}

// ─────────────────────────────────────────────
// MODELS
// ─────────────────────────────────────────────
const StaffSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  username:      { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:      { type: String, required: true },
  role:          { type: String, enum: ["principal","vice_principal","secretary","teacher","class_teacher"], required: true },
  // allow multiple subjects per teacher
  subject:       { type: [String], default: [] },
  assignedGrade: { type: String, default: null },
  assignedClass: { type: String, default: null },
  // additional classes this teacher teaches (besides their primary assigned class)
  teachesClasses: { type: [{ grade: String, class: String }], default: [] },
}, { timestamps: true });

const StudentSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  studentNo:   { type: String, required: true, unique: true },
  grade:       { type: String, required: true },
  class:       { type: String, required: true },
  parentName:  { type: String, default: "" },
  parentPhone: { type: String, default: "" },
}, { timestamps: true });

// type: "ca1".."ca5" = continuous assessment slots, "test" = end-of-term test
const MarkSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  subject:   { type: String, required: true },
  term:      { type: String, required: true },
  type:      { type: String, enum: ["ca", "ca1", "ca2", "ca3", "ca4", "ca5", "test"], required: true },
  score:     { type: Number, min: 0, max: 100, required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
  remark:    { type: String, default: "" },
}, { timestamps: true });
MarkSchema.index({ studentId: 1, subject: 1, term: 1, type: 1 }, { unique: true });

const FeeSchema = new mongoose.Schema({
  studentId:  { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  amount:     { type: Number, required: true },
  paymentMethod: { type: String, enum: ["mpesa", "cash", "bank"], default: "mpesa" },
  mpesaRef:   { type: String, default: undefined, uppercase: true },
  reference:  { type: String, default: "" },
  term:       { type: String, required: true },
  paidBy:     { type: String, default: "" },
  recordedBy: { type: String, default: "" },
  date:       { type: String, default: () => new Date().toLocaleDateString("en-GB") },
}, { timestamps: true });

FeeSchema.index(
  { mpesaRef: 1 },
  {
    unique: true,
    partialFilterExpression: {
      mpesaRef: { $type: "string" },
    },
  }
);

const Staff   = mongoose.model("Staff", StaffSchema);
const Student = mongoose.model("Student", StudentSchema);
const Mark    = mongoose.model("Mark", MarkSchema);
const Fee     = mongoose.model("Fee", FeeSchema);

// ─────────────────────────────────────────────
// SEED
// ─────────────────────────────────────────────
async function seedDefaults() {
  if (await Staff.countDocuments() > 0) return;
  await Staff.insertMany([
    { name: "Principal Hlalele", username: "principal", password: await bcrypt.hash("hlalele2024", 10), role: "principal" },
    { name: "Mrs. Mokoena",      username: "vice",      password: await bcrypt.hash("hlalele2024", 10), role: "vice_principal" },
    { name: "Ms. Tsotetsi",      username: "secretary", password: await bcrypt.hash("hlalele2024", 10), role: "secretary" },
  ]);
  console.log("Default accounts created (password: hlalele2024)");
}

let databaseReadyPromise;

async function prepareDatabase() {
  await connectDatabase();
  await Fee.updateMany(
    { $or: [{ mpesaRef: null }, { mpesaRef: "" }] },
    { $unset: { mpesaRef: "" } }
  );
  try {
    await Fee.collection.dropIndex("mpesaRef_1");
  } catch (err) {
    if (!err || (err.codeName !== "IndexNotFound" && err.code !== 27)) {
      console.warn("Could not drop legacy mpesaRef index:", err.message || err);
    }
  }
  await Fee.syncIndexes();
  await seedDefaults();
}

function ensureDatabaseReady() {
  if (!databaseReadyPromise) {
    databaseReadyPromise = prepareDatabase().catch((err) => {
      databaseReadyPromise = null;
      throw err;
    });
  }
  return databaseReadyPromise;
}

app.use(async (req, res, next) => {
  try {
    await ensureDatabaseReady();
    next();
  } catch (err) {
    next(err);
  }
});

app.use((req, res, next) => {
  const serviceRoute = /^\/(auth|staff|students|marks|fees|health)(\/|$)/;
  if (!req.url.startsWith("/api") && serviceRoute.test(req.url)) {
    req.url = `/api${req.url}`;
  }
  next();
});

// ─────────────────────────────────────────────
// AUTH MIDDLEWARE
// ─────────────────────────────────────────────
function auth(req, res, next) {
  const token = (req.headers.authorization || "").split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error: "Invalid or expired token" }); }
}

function requireRole(...roles) {
  return (req, res, next) =>
    roles.includes(req.user.role) ? next() : res.status(403).json({ error: "Access denied" });
}

// ─────────────────────────────────────────────
// AUTH ROUTES
// ─────────────────────────────────────────────
app.post("/api/auth/login", async (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: "JWT_SECRET is not set in deployment environment variables" });
    }
    const { username, password } = req.body;
    const user = await Staff.findOne({ username: (username||"").toLowerCase().trim() });
    if (!user || !await bcrypt.compare(password, user.password))
      return res.status(401).json({ error: "Incorrect username or password" });

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name,
        subject: user.subject, assignedGrade: user.assignedGrade, assignedClass: user.assignedClass },
      process.env.JWT_SECRET, { expiresIn: "12h" }
    );
    res.json({ token, user: { id:user._id, name:user.name, username:user.username,
      role:user.role, subject:user.subject, assignedGrade:user.assignedGrade, assignedClass:user.assignedClass } });
  } catch (err) {
    console.error("Login failed:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ─────────────────────────────────────────────
// STAFF ROUTES
// ─────────────────────────────────────────────
app.get("/api/staff", auth, async (req, res) => {
  res.json(await Staff.find({}, "-password").sort({ createdAt: 1 }));
});

// Register teacher — principal only
app.post("/api/staff", auth, requireRole("principal"), async (req, res) => {
  const { name, username, password, role, subject, assignedGrade, assignedClass, teachesClasses } = req.body;
  if (!name||!username||!password||!role)
    return res.status(400).json({ error: "Name, username, password and role are required" });
  if (await Staff.findOne({ username: username.toLowerCase().trim() }))
    return res.status(409).json({ error: "Username already taken" });
  // normalize subject to array (accept string or array)
  const subjects = Array.isArray(subject) ? subject.filter(s=>s) : (subject ? [subject] : []);
  const member = await Staff.create({
    name, username: username.toLowerCase().trim(),
    password: await bcrypt.hash(password, 10),
    role,
    subject: subjects,
    assignedGrade: role === "class_teacher" ? assignedGrade : null,
    assignedClass: role === "class_teacher" ? assignedClass : null,
    teachesClasses: Array.isArray(teachesClasses) ? teachesClasses : [],
  });
  const safe = member.toObject();
  delete safe.password;
  res.status(201).json(safe);
});

// Remove teacher — principal only
app.delete("/api/staff/:id", auth, requireRole("principal"), async (req, res) => {
  const m = await Staff.findById(req.params.id);
  if (!m) return res.status(404).json({ error: "Not found" });
  if (m.role === "principal") return res.status(403).json({ error: "Cannot remove the principal" });
  await m.deleteOne();
  res.json({ message: "Removed" });
});

// Assign/unassign a teacher as class teacher
// Accessible to: principal, vice_principal, secretary
app.patch("/api/staff/:id/assign", auth, requireRole("principal","vice_principal","secretary"), async (req, res) => {
  const { assignedGrade, assignedClass } = req.body;
  const member = await Staff.findById(req.params.id);
  if (!member) return res.status(404).json({ error: "Staff member not found" });
  if (!["teacher","class_teacher"].includes(member.role))
    return res.status(400).json({ error: "Only teachers can be assigned as class teachers" });

  if (assignedGrade && assignedClass) {
    // Check if another teacher is already assigned to this class
    const existing = await Staff.findOne({
      _id: { $ne: member._id },
      role: "class_teacher",
      assignedGrade, assignedClass,
    });
    if (existing)
      return res.status(409).json({ error: `${existing.name} is already class teacher for Grade ${assignedGrade}${assignedClass}` });

    member.role          = "class_teacher";
    member.assignedGrade = assignedGrade;
    member.assignedClass = assignedClass;
  } else {
    // Unassign
    member.role          = "teacher";
    member.assignedGrade = null;
    member.assignedClass = null;
  }
  await member.save();
  const safe = member.toObject();
  delete safe.password;
  res.json(safe);
});

// Manage teachesClasses array (add/remove/replace)
app.patch("/api/staff/:id/teachesClasses", auth, requireRole("principal"), async (req, res) => {
  const { teachesClasses } = req.body;
  if (!Array.isArray(teachesClasses)) return res.status(400).json({ error: "teachesClasses must be an array" });
  const id = req.params.id;
  const member = await Staff.findById(id);
  if (!member) return res.status(404).json({ error: "Staff not found" });
  // Basic validation: each item should have grade and class
  for (const it of teachesClasses) {
    if (!it || typeof it !== 'object' || !it.grade || !it.class) return res.status(400).json({ error: "Each teachesClasses item must have grade and class" });
  }
  member.teachesClasses = teachesClasses;
  await member.save();
  const safe = member.toObject();
  delete safe.password;
  res.json(safe);
});

// Change password — principal only
app.patch("/api/staff/:id/password", auth, requireRole("principal"), async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6)
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  await Staff.findByIdAndUpdate(req.params.id, { password: await bcrypt.hash(password, 10) });
  res.json({ message: "Password updated" });
});

// ─────────────────────────────────────────────
// STUDENT ROUTES
// ─────────────────────────────────────────────
app.get("/api/students", auth, async (req, res) => {
  res.json(await Student.find().sort({ grade:1, class:1, name:1 }));
});

app.post("/api/students", auth, requireRole("principal"), async (req, res) => {
  const { name, studentNo, grade, class: cls, parentName, parentPhone } = req.body;
  if (!name||!studentNo||!grade||!cls)
    return res.status(400).json({ error: "Name, student number, grade and class are required" });
  if (await Student.findOne({ studentNo }))
    return res.status(409).json({ error: "Student number already exists" });
  res.status(201).json(await Student.create({ name, studentNo, grade, class: cls, parentName, parentPhone }));
});

app.delete("/api/students/:id", auth, requireRole("principal"), async (req, res) => {
  await Student.findByIdAndDelete(req.params.id);
  await Mark.deleteMany({ studentId: req.params.id });
  await Fee.deleteMany({ studentId: req.params.id });
  res.json({ message: "Student and all related records removed" });
});

// ─────────────────────────────────────────────
// MARKS ROUTES
// ─────────────────────────────────────────────
app.get("/api/marks", auth, async (req, res) => {
  const filter = {};
  if (req.query.grade || req.query.class) {
    const students = await Student.find({
      ...(req.query.grade ? { grade: req.query.grade } : {}),
      ...(req.query.class ? { class: req.query.class } : {}),
    }, "_id");
    filter.studentId = { $in: students.map(s => s._id) };
  }
  if (req.query.term)    filter.term    = req.query.term;
  if (req.query.subject) filter.subject = req.query.subject;
  if (req.query.type)    filter.type    = req.query.type;
  res.json(await Mark.find(filter));
});

// Batch upsert — entries include type: "ca" | "test"
app.post("/api/marks/batch", auth, requireRole("teacher","class_teacher","principal","vice_principal"), async (req, res) => {
  const { entries } = req.body;
  if (!Array.isArray(entries) || entries.length === 0)
    return res.status(400).json({ error: "entries must be a non-empty array" });

  const ops = entries.map(e => ({
    updateOne: {
      filter: { studentId: e.studentId, subject: e.subject, term: e.term, type: e.type },
      update: { $set: { score: e.score, teacherId: req.user.id, remark: e.remark ?? "" } },
      upsert: true,
    }
  }));
  await Mark.bulkWrite(ops);
  res.json({ message: `${ops.length} marks saved` });
});

// ─────────────────────────────────────────────
// FEES ROUTES
// ─────────────────────────────────────────────
app.get("/api/fees", auth, async (req, res) => {
  const filter = {};
  if (req.query.studentId) filter.studentId = req.query.studentId;
  res.json(await Fee.find(filter).sort({ createdAt: -1 }));
});

app.post("/api/fees", auth, requireRole("principal","secretary"), async (req, res) => {
  const { studentId, amount, paymentMethod = "mpesa", mpesaRef, reference, term, paidBy } = req.body;
  const method = String(paymentMethod || "mpesa").toLowerCase();
  if (!studentId||!amount||!term)
    return res.status(400).json({ error: "Student, amount and term are required" });
  if (!["mpesa", "cash", "bank"].includes(method))
    return res.status(400).json({ error: "Payment method must be M-Pesa, cash, or bank" });
  const normalizedRef = typeof mpesaRef === "string" ? mpesaRef.trim().toUpperCase() : "";
  const normalizedReference = typeof reference === "string" ? reference.trim() : "";
  if (method === "mpesa" && !normalizedRef)
    return res.status(400).json({ error: "M-Pesa reference is required for M-Pesa payments" });
  if (method === "mpesa" && await Fee.findOne({ mpesaRef: normalizedRef }))
    return res.status(409).json({ error: "This M-Pesa reference already exists" });
  if (!await Student.findById(studentId))
    return res.status(404).json({ error: "Student not found" });
  const payload = {
    studentId,
    amount: parseFloat(amount),
    paymentMethod: method,
    term,
    paidBy,
    recordedBy: req.user.name,
    date: new Date().toLocaleDateString("en-GB"),
    reference: method === "mpesa" ? normalizedRef : normalizedReference,
  };
  if (method === "mpesa") payload.mpesaRef = normalizedRef;
  res.status(201).json(await Fee.create(payload));
});

app.delete("/api/fees/:id", auth, requireRole("principal"), async (req, res) => {
  await Fee.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

// ─────────────────────────────────────────────
// HEALTH
// ─────────────────────────────────────────────
app.get("/api/health", (_, res) => res.json({ status: "ok", school: "Hlalele High School" }));

app.use((err, req, res, next) => {
  console.error("Unhandled API error:", err);
  if (res.headersSent) return next(err);
  const status = err.statusCode || 500;
  const message =
    status === 403
      ? err.message
      : process.env.NODE_ENV === "production"
        ? "Internal server error"
        : formatMongoStartupError(err);
  res.status(status).json({ error: message });
});

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  await ensureDatabaseReady();
  app.listen(PORT, () => console.log(`Hlalele API on port ${PORT}`));
}

if (require.main === module) {
  bootstrap().catch(err => {
    console.error("Fatal startup error:", formatMongoStartupError(err));
    process.exit(1);
  });
}

module.exports = app;
