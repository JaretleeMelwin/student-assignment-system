const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// ================================
// PostgreSQL connection
// ================================

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

// ================================
// File upload configuration
// ================================

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },

    filename: function (req, file, cb) {
        const uniqueName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1E9) +
            path.extname(file.originalname);

        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});

// Allow uploaded files to be accessed
app.use("/uploads", express.static(uploadDir));

// ================================
// Test database connection
// ================================

app.get("/api/test-db", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");

        res.json({
            message: "Database connection successful!",
            databaseTime: result.rows[0].now
        });

    } catch (error) {

        console.error("Database connection error:", error);

        res.status(500).json({
            message: "Database connection failed",
            error: error.message
        });
    }
});

// ================================
// Basic API test
// ================================

app.get("/", (req, res) => {
    res.json({
        message: "Student Assignment Submission System API is running!"
    });
});

// ================================
// Get all assignments
// ================================

app.get("/api/assignments", async (req, res) => {

    try {

        const result = await pool.query(
            "SELECT * FROM assignments ORDER BY id DESC"
        );

        res.json(result.rows);

    } catch (error) {

        console.error("Error fetching assignments:", error);

        res.status(500).json({
            message: "Failed to fetch assignments",
            error: error.message
        });
    }
});

// ================================
// Submit assignment
// ================================

app.post(
    "/api/assignments/:id/submit",
    upload.single("file"),
    async (req, res) => {

        try {

            const assignmentId = req.params.id;

            // Check if file was uploaded
            if (!req.file) {
                return res.status(400).json({
                    message: "Please select a file."
                });
            }

            // Get assignment
            const assignment = await pool.query(
                "SELECT * FROM assignments WHERE id = $1",
                [assignmentId]
            );

            if (assignment.rows.length === 0) {

                // Delete uploaded file if assignment doesn't exist
                fs.unlinkSync(req.file.path);

                return res.status(404).json({
                    message: "Assignment not found."
                });
            }

            // Get student name from form
            const studentName = req.body.studentName || "Student";

            // Save submission information
            const result = await pool.query(
                `INSERT INTO submissions
                (assignment_id, student_name, file_name, file_path)
                VALUES ($1, $2, $3, $4)
                RETURNING *`,
                [
                    assignmentId,
                    studentName,
                    req.file.originalname,
                    `/uploads/${req.file.filename}`
                ]
            );

            res.status(201).json({
                message: "Assignment submitted successfully!",
                submission: result.rows[0]
            });

        } catch (error) {

            console.error("Submission error:", error);

            // Delete file if database insertion failed
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }

            res.status(500).json({
                message: "Failed to submit assignment.",
                error: error.message
            });
        }
    }
);

// ================================
// Get submissions
// ================================

app.get("/api/submissions", async (req, res) => {

    try {

        const result = await pool.query(`
            SELECT
                s.id,
                s.student_name,
                s.file_name,
                s.file_path,
                s.submitted_at,
                a.title AS assignment_title
            FROM submissions s
            JOIN assignments a
            ON s.assignment_id = a.id
            ORDER BY s.submitted_at DESC
        `);

        res.json(result.rows);

    } catch (error) {

        console.error("Error fetching submissions:", error);

        res.status(500).json({
            message: "Failed to fetch submissions",
            error: error.message
        });
    }
});

// ================================
// Start server
// ================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {

    console.log(
        `Server running on http://localhost:${PORT}`
    );

});