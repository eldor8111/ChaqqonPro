"use client";

import { useEffect } from "react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error("Next.js Error caught by ErrorBoundary:", error);
    }, [error]);

    return (
        <div style={{ padding: "20px", color: "red", backgroundColor: "white", minHeight: "100vh" }}>
            <h2>Nimadir xato ketdi! (Error Boundary)</h2>
            <p>{error.message}</p>
            <pre style={{ marginTop: "20px", whiteSpace: "pre-wrap", background: "#f5f5f5", padding: "10px", color: "black" }}>
                {error.stack}
            </pre>
            <button
                onClick={() => reset()}
                style={{ marginTop: "20px", padding: "10px 20px", background: "blue", color: "white" }}
            >
                Qayta urinish
            </button>
        </div>
    );
}
