const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("JWT_SECRET is missing from .env");
  process.exit(1);
}

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    );

    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

/* ================================
   ADMIN AUTHENTICATION
================================ */

function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication required.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired login session.",
    });
  }
}

/* ================================
   BASIC
================================ */

app.get("/", (req, res) => {
  res.json({
    message:
      "Student Assignment Submission System API is running!",
  });
});

app.get("/api/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      message: "Database connected successfully.",
      time: result.rows[0].now,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Database connection failed.",
      error: error.message,
    });
  }
});

/* ================================
   LOGIN
================================ */

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password are required.",
      });
    }

    const result = await pool.query(
      "SELECT * FROM admins WHERE username = $1",
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid username or password.",
      });
    }

    const admin = result.rows[0];

    const passwordMatch = await bcrypt.compare(
      password,
      admin.password_hash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid username or password.",
      });
    }

    const token = jwt.sign(
      {
        id: admin.id,
        username: admin.username,
      },
      JWT_SECRET,
      {
        expiresIn: "8h",
      }
    );

    res.json({
      message: "Login successful.",
      token,
      username: admin.username,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Login failed.",
    });
  }
});

/* ================================
   ASSIGNMENTS
================================ */

app.get("/api/assignments", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM assignments ORDER BY id DESC"
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch assignments",
      error: error.message,
    });
  }
});

app.post(
  "/api/assignments",
  authenticateAdmin,
  async (req, res) => {
    try {
      const { title, description, due_date } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({
          message: "Assignment title is required.",
        });
      }

      const result = await pool.query(
        `INSERT INTO assignments
        (title, description, due_date)
        VALUES ($1, $2, $3)
        RETURNING *`,
        [
          title.trim(),
          description || "",
          due_date || null,
        ]
      );

      res.status(201).json({
        message: "Assignment created successfully.",
        assignment: result.rows[0],
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Failed to create assignment.",
      });
    }
  }
);

app.delete(
  "/api/assignments/:id",
  authenticateAdmin,
  async (req, res) => {
    const client = await pool.connect();

    try {
      const assignmentId = req.params.id;

      await client.query("BEGIN");

      const existing = await client.query(
        "SELECT * FROM assignments WHERE id = $1",
        [assignmentId]
      );

      if (existing.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          message: "Assignment not found.",
        });
      }

      await client.query(
        "DELETE FROM submissions WHERE assignment_id = $1",
        [assignmentId]
      );

      await client.query(
        "DELETE FROM assignments WHERE id = $1",
        [assignmentId]
      );

      await client.query("COMMIT");

      res.json({
        message: "Assignment deleted successfully.",
      });
    } catch (error) {
      await client.query("ROLLBACK");

      console.error(error);

      res.status(500).json({
        message: "Failed to delete assignment.",
      });
    } finally {
      client.release();
    }
  }
);

/* ================================
   STUDENT SUBMISSION
================================ */

app.post(
  "/api/assignments/:id/submit",
  upload.single("file"),
  async (req, res) => {
    try {
      const assignmentId = req.params.id;
      const studentName = req.body.studentName;

      if (!studentName || !studentName.trim()) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }

        return res.status(400).json({
          message: "Student name is required.",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          message: "Please upload a file.",
        });
      }

      const assignment = await pool.query(
        "SELECT * FROM assignments WHERE id = $1",
        [assignmentId]
      );

      if (assignment.rows.length === 0) {
        fs.unlinkSync(req.file.path);

        return res.status(404).json({
          message: "Assignment not found.",
        });
      }

      const filePath = `/uploads/${req.file.filename}`;

      await pool.query(
        `INSERT INTO submissions
        (assignment_id, student_name, file_name, file_path)
        VALUES ($1, $2, $3, $4)`,
        [
          assignmentId,
          studentName.trim(),
          req.file.originalname,
          filePath,
        ]
      );

      res.json({
        message: "Assignment submitted successfully.",
      });
    } catch (error) {
      console.error(error);

      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch {}
      }

      res.status(500).json({
        message: "Failed to submit assignment.",
      });
    }
  }
);

/* ================================
   ADMIN SUBMISSIONS
================================ */

app.get(
  "/api/submissions",
  authenticateAdmin,
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          submissions.id,
          submissions.student_name,
          submissions.file_name,
          submissions.file_path,
          submissions.submitted_at,
          assignments.title AS assignment_title
        FROM submissions
        JOIN assignments
          ON submissions.assignment_id = assignments.id
        ORDER BY submissions.submitted_at DESC
      `);

      res.json(result.rows);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Failed to fetch submissions.",
      });
    }
  }
);

/* ================================
   DOWNLOAD SUBMISSION
================================ */

app.get(
  "/api/submissions/:id/download",
  authenticateAdmin,
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT file_path, file_name
         FROM submissions
         WHERE id = $1`,
        [req.params.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Submission not found.",
        });
      }

      const submission = result.rows[0];

      const fileName = path.basename(
        submission.file_path
      );

      const filePath = path.join(
        uploadDir,
        fileName
      );

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          message: "File is no longer available.",
        });
      }

      res.download(
        filePath,
        submission.file_name
      );
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Failed to download file.",
      });
    }
  }
);

/* ================================
   START SERVER
================================ */

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});