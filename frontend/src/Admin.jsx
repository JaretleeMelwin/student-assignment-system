import { useEffect, useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

function Admin({ onLogout }) {
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const username =
    localStorage.getItem("adminUsername") || "Admin";

  const token = localStorage.getItem("adminToken");

  function logout() {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUsername");
    onLogout();
  }

  async function loadData() {
    try {
      setLoading(true);

      const assignmentsResponse = await fetch(
        `${API_URL}/api/assignments`
      );

      const assignmentsData =
        await assignmentsResponse.json();

      setAssignments(assignmentsData);

      const submissionsResponse = await fetch(
        `${API_URL}/api/submissions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (submissionsResponse.status === 401) {
        logout();
        return;
      }

      const submissionsData =
        await submissionsResponse.json();

      setSubmissions(submissionsData);
    } catch (error) {
      console.error(error);
      setMessage("Could not load admin data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function addAssignment(event) {
    event.preventDefault();

    if (!title.trim()) {
      setMessage("Please enter an assignment title.");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/assignments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title,
            description,
            due_date: dueDate || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to create assignment."
        );
      }

      setTitle("");
      setDescription("");
      setDueDate("");
      setMessage("Assignment added successfully.");

      loadData();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteAssignment(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this assignment? Its submissions will also be deleted."
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API_URL}/api/assignments/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to delete assignment."
        );
      }

      setMessage("Assignment deleted successfully.");

      loadData();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function downloadSubmission(id, fileName) {
    try {
      const response = await fetch(
        `${API_URL}/api/submissions/${id}/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();

        throw new Error(
          data.message || "Download failed."
        );
      }

      const blob = await response.blob();

      const downloadUrl =
        window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = fileName;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      setMessage(error.message);
    }
  }

  function formatDate(value) {
    if (!value) return "No due date";

    return new Date(
      `${String(value).slice(0, 10)}T00:00:00`
    ).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="brand">
          <div className="brand-mark">CA</div>

          <div>
            <div className="brand-title">
              Cloud Assignment System
            </div>

            <div className="brand-subtitle">
              Administrator Dashboard
            </div>
          </div>
        </div>

        <div className="admin-header-right">
          <span className="admin-user">
            {username}
          </span>

          <button
            className="logout-button"
            onClick={logout}
          >
            Log out
          </button>
        </div>
      </header>

      <main className="admin-content">
        <section className="admin-welcome">
          <div>
            <span className="section-kicker">
              ADMINISTRATION
            </span>

            <h1>Dashboard</h1>

            <p>
              Manage assignments and review student
              submissions.
            </p>
          </div>
        </section>

        {message && (
          <div className="message info admin-message">
            {message}
          </div>
        )}

        <section className="admin-grid">
          <div className="admin-card">
            <div className="admin-card-heading">
              <div>
                <span className="section-kicker">
                  CREATE
                </span>

                <h2>Add Assignment</h2>
              </div>
            </div>

            <form
              onSubmit={addAssignment}
              className="admin-form"
            >
              <label className="field">
                <span>Assignment title</span>

                <input
                  type="text"
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  placeholder="e.g. Cloud Computing Project"
                />
              </label>

              <label className="field">
                <span>Description</span>

                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  placeholder="Enter assignment instructions..."
                  rows="4"
                />
              </label>

              <label className="field">
                <span>Due date</span>

                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) =>
                    setDueDate(event.target.value)
                  }
                />
              </label>

              <button
                type="submit"
                className="submit-button"
              >
                + Add Assignment
              </button>
            </form>
          </div>

          <div className="admin-card">
            <div className="admin-card-heading">
              <div>
                <span className="section-kicker">
                  OVERVIEW
                </span>

                <h2>System Statistics</h2>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-box">
                <strong>
                  {assignments.length}
                </strong>

                <span>Assignments</span>
              </div>

              <div className="stat-box">
                <strong>
                  {submissions.length}
                </strong>

                <span>Submissions</span>
              </div>
            </div>
          </div>
        </section>

        <section className="admin-card full-admin-card">
          <div className="admin-card-heading">
            <div>
              <span className="section-kicker">
                MANAGE
              </span>

              <h2>Assignments</h2>
            </div>
          </div>

          {loading ? (
            <p>Loading assignments...</p>
          ) : assignments.length === 0 ? (
            <div className="empty-admin">
              No assignments have been created yet.
            </div>
          ) : (
            <div className="admin-assignment-list">
              {assignments.map((assignment) => (
                <div
                  className="admin-assignment"
                  key={assignment.id}
                >
                  <div>
                    <h3>{assignment.title}</h3>

                    <p>
                      {assignment.description ||
                        "No description"}
                    </p>

                    <span>
                      Due:{" "}
                      {formatDate(
                        assignment.due_date
                      )}
                    </span>
                  </div>

                  <button
                    className="delete-button"
                    onClick={() =>
                      deleteAssignment(
                        assignment.id
                      )
                    }
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="admin-card full-admin-card">
          <div className="admin-card-heading">
            <div>
              <span className="section-kicker">
                STUDENT WORK
              </span>

              <h2>Submitted Assignments</h2>
            </div>
          </div>

          {loading ? (
            <p>Loading submissions...</p>
          ) : submissions.length === 0 ? (
            <div className="empty-admin">
              No student submissions yet.
            </div>
          ) : (
            <div className="submission-table-wrapper">
              <table className="submission-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Assignment</th>
                    <th>File</th>
                    <th>Submitted</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {submissions.map((submission) => (
                    <tr key={submission.id}>
                      <td>
                        <strong>
                          {submission.student_name}
                        </strong>
                      </td>

                      <td>
                        {submission.assignment_title}
                      </td>

                      <td>
                        {submission.file_name}
                      </td>

                      <td>
                        {new Date(
                          submission.submitted_at
                        ).toLocaleString()}
                      </td>

                      <td>
                        <button
                          className="download-button"
                          onClick={() =>
                            downloadSubmission(
                              submission.id,
                              submission.file_name
                            )
                          }
                        >
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Admin;