import { useEffect, useState } from "react";

const API_URL =
    import.meta.env.VITE_API_URL || "http://localhost:5000";

function App() {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [studentName, setStudentName] = useState("");

    const [message, setMessage] = useState("");

    // ================================
    // Get assignments
    // ================================

    useEffect(() => {
        fetch(`${API_URL}/api/assignments`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Failed to fetch assignments");
                }

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

    // ================================
    // Open submission form
    // ================================

    function openSubmission(assignment) {
        setSelectedAssignment(assignment);
        setSelectedFile(null);
        setStudentName("");
        setMessage("");
    }

    // ================================
    // Submit assignment
    // ================================

    async function submitAssignment(event) {
        event.preventDefault();

        if (!selectedFile) {
            setMessage("Please select a file.");
            return;
        }

        if (!studentName.trim()) {
            setMessage("Please enter your name.");
            return;
        }

        const formData = new FormData();

        formData.append("file", selectedFile);
        formData.append("studentName", studentName.trim());

        try {
            setMessage("Uploading...");

            const response = await fetch(
                `${API_URL}/api/assignments/${selectedAssignment.id}/submit`,
                {
                    method: "POST",
                    body: formData,
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to submit assignment."
                );
            }

            setMessage(data.message || "Assignment submitted successfully.");

            setSelectedFile(null);

            // Reset file input
            event.target.reset();

        } catch (error) {
            console.error(error);

            setMessage(
                error.message || "Failed to submit assignment."
            );
        }
    }

    // ================================
    // UI
    // ================================

    return (
        <div
            style={{
                minHeight: "100vh",
                padding: "40px",
                fontFamily: "Arial, sans-serif",
                backgroundColor: "#f5f7fa",
                boxSizing: "border-box",
            }}
        >
            <div
                style={{
                    maxWidth: "900px",
                    margin: "0 auto",
                }}
            >
                <h1
                    style={{
                        textAlign: "center",
                        marginBottom: "40px",
                    }}
                >
                    Student Assignment Submission System
                </h1>

                {/* Loading */}

                {loading && (
                    <p style={{ textAlign: "center" }}>
                        Loading assignments...
                    </p>
                )}

                {/* Assignments */}

                {!loading && assignments.length === 0 && (
                    <p style={{ textAlign: "center" }}>
                        No assignments available.
                    </p>
                )}

                {!loading &&
                    assignments.map((assignment) => (
                        <div
                            key={assignment.id}
                            style={{
                                marginBottom: "25px",
                                padding: "25px",
                                backgroundColor: "white",
                                border: "1px solid #ddd",
                                borderRadius: "12px",
                                boxShadow:
                                    "0 2px 8px rgba(0,0,0,0.08)",
                            }}
                        >
                            <h2 style={{ marginTop: 0 }}>
                                {assignment.title}
                            </h2>

                            <p>
                                {assignment.description}
                            </p>

                            <p>
                                <strong>Due:</strong>{" "}
                                {new Date(
                                    assignment.due_date
                                ).toLocaleString()}
                            </p>

                            <button
                                onClick={() =>
                                    openSubmission(assignment)
                                }
                                style={{
                                    padding: "10px 18px",
                                    border: "none",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    backgroundColor: "#2563eb",
                                    color: "white",
                                    fontSize: "15px",
                                }}
                            >
                                Submit Assignment
                            </button>
                        </div>
                    ))}

                {/* Submission Form */}

                {selectedAssignment && (
                    <div
                        style={{
                            marginTop: "30px",
                            padding: "30px",
                            backgroundColor: "white",
                            border: "2px solid #333",
                            borderRadius: "12px",
                        }}
                    >
                        <h2>
                            Submit:{" "}
                            {selectedAssignment.title}
                        </h2>

                        <form onSubmit={submitAssignment}>
                            {/* Student Name */}

                            <div
                                style={{
                                    marginBottom: "20px",
                                }}
                            >
                                <label>
                                    <strong>
                                        Student Name:
                                    </strong>
                                </label>

                                <br />

                                <input
                                    type="text"
                                    value={studentName}
                                    onChange={(e) =>
                                        setStudentName(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Enter your name"
                                    style={{
                                        marginTop: "8px",
                                        padding: "10px",
                                        width: "100%",
                                        maxWidth: "400px",
                                        boxSizing: "border-box",
                                    }}
                                />
                            </div>

                            {/* File */}

                            <div
                                style={{
                                    marginBottom: "20px",
                                }}
                            >
                                <label>
                                    <strong>
                                        Select Assignment File:
                                    </strong>
                                </label>

                                <br />

                                <input
                                    type="file"
                                    onChange={(e) =>
                                        setSelectedFile(
                                            e.target.files[0]
                                        )
                                    }
                                    style={{
                                        marginTop: "8px",
                                    }}
                                />
                            </div>

                            {/* Buttons */}

                            <button
                                type="submit"
                                style={{
                                    padding: "10px 18px",
                                    border: "none",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    backgroundColor: "#16a34a",
                                    color: "white",
                                    fontSize: "15px",
                                }}
                            >
                                Upload & Submit
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedAssignment(null);
                                    setSelectedFile(null);
                                    setStudentName("");
                                    setMessage("");
                                }}
                                style={{
                                    marginLeft: "10px",
                                    padding: "10px 18px",
                                    border: "1px solid #999",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    backgroundColor: "white",
                                    fontSize: "15px",
                                }}
                            >
                                Cancel
                            </button>
                        </form>

                        {/* Message */}

                        {message && (
                            <p
                                style={{
                                    marginTop: "20px",
                                    padding: "10px",
                                    backgroundColor: "#f1f5f9",
                                    borderRadius: "6px",
                                }}
                            >
                                {message}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;