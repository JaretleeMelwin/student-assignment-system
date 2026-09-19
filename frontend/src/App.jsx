import { useEffect, useState } from "react";
import "./index.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function formatDueDate(value) {
  if (!value) return "No due date";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function App() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [studentName, setStudentName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/assignments`)
      .then((response) => {
        if (!response.ok) throw new Error("Failed to fetch assignments");
        return response.json();
      })
      .then((data) => {
        setAssignments(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setMessage("Could not connect to the backend.");
        setLoading(false);
      });
  }, []);

  function openSubmission(assignment) {
    setSelectedAssignment(assignment);
    setSelectedFile(null);
    setStudentName("");
    setMessage("");
  }

  function closeSubmission() {
    setSelectedAssignment(null);
    setSelectedFile(null);
    setStudentName("");
    setMessage("");
  }

  async function submitAssignment(event) {
    event.preventDefault();

    if (!studentName.trim()) {
      setMessage("Please enter your name.");
      return;
    }

    if (!selectedFile) {
      setMessage("Please choose your assignment file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("studentName", studentName.trim());

    try {
      setSubmitting(true);
      setMessage("Uploading your assignment...");

      const response = await fetch(
        `${API_URL}/api/assignments/${selectedAssignment.id}/submit`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to submit assignment.");
      }

      setMessage(data.message || "Assignment submitted successfully.");
      setSelectedFile(null);
      event.target.reset();
    } catch (error) {
      console.error(error);
      setMessage(error.message || "Failed to submit assignment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand">
          <div className="brand-mark">CA</div>
          <div>
            <div className="brand-title">Cloud Assignment System</div>
            <div className="brand-subtitle">Student submission portal</div>
          </div>
        </div>

        <div className="online-badge">
          <span className="online-dot" />
          Online
        </div>
      </header>

      <main className="page">
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">ACADEMIC PORTAL</span>
            <h1>Submit your assignments with confidence.</h1>
            <p>
              View your active assignments, check deadlines, and securely
              upload your project files from one simple portal.
            </p>
          </div>

          <div className="hero-stat">
            <span>Available</span>
            <strong>{assignments.length}</strong>
            <small>assignment{assignments.length === 1 ? "" : "s"}</small>
          </div>
        </section>

        <section className="section-heading">
          <div>
            <span className="section-kicker">ASSIGNMENTS</span>
            <h2>Current assignments</h2>
          </div>
          <p>{loading ? "Loading..." : "Select an assignment to submit."}</p>
        </section>

        {loading && (
          <div className="state-card">
            <div className="spinner" />
            <strong>Loading assignments</strong>
            <span>Please wait a moment...</span>
          </div>
        )}

        {!loading && assignments.length === 0 && (
          <div className="state-card">
            <div className="state-icon">✓</div>
            <strong>No assignments available</strong>
            <span>New assignments will appear here when they are added.</span>
          </div>
        )}

        {!loading && assignments.length > 0 && (
          <div className="assignment-grid">
            {assignments.map((assignment) => (
              <article className="assignment-card" key={assignment.id}>
                <div className="assignment-top">
                  <div className="assignment-icon">📚</div>
                  <span className="status-pill">Open</span>
                </div>

                <h3>{assignment.title}</h3>
                <p className="assignment-description">
                  {assignment.description || "No description provided."}
                </p>

                <div className="deadline">
                  <span>SUBMISSION DEADLINE</span>
                  <strong>{formatDueDate(assignment.due_date)}</strong>
                </div>

                <button
                  className="primary-button"
                  onClick={() => openSubmission(assignment)}
                >
                  Submit Assignment
                  <span>→</span>
                </button>
              </article>
            ))}
          </div>
        )}

        {selectedAssignment && (
          <section className="submission-panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">SUBMISSION</span>
                <h2>{selectedAssignment.title}</h2>
                <p>Complete the details below and upload your project file.</p>
              </div>
              <button className="close-button" onClick={closeSubmission}>
                ×
              </button>
            </div>

            <form onSubmit={submitAssignment} className="submission-form">
              <label className="field">
                <span>Student name</span>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </label>

              <label className="field">
                <span>Assignment file</span>
                <div className="file-box">
                  <input
                    id="assignment-file"
                    type="file"
                    onChange={(e) =>
                      setSelectedFile(e.target.files?.[0] || null)
                    }
                  />
                  <label htmlFor="assignment-file" className="file-button">
                    Choose file
                  </label>
                  <span className="file-name">
                    {selectedFile ? selectedFile.name : "No file selected"}
                  </span>
                </div>
              </label>

              <div className="form-actions">
                <button
                  type="submit"
                  className="submit-button"
                  disabled={submitting}
                >
                  {submitting ? "Uploading..." : "Upload & Submit"}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeSubmission}
                  disabled={submitting}
                >
                  Cancel
                </button>
              </div>

              {message && (
                <div
                  className={`message ${
                    message.toLowerCase().includes("success")
                      ? "success"
                      : "info"
                  }`}
                >
                  {message}
                </div>
              )}
            </form>
          </section>
        )}
      </main>

      <footer className="site-footer">
        <span>Cloud Assignment System</span>
        <span>Student Assignment Submission Portal</span>
      </footer>
    </div>
  );
}

export default App;
