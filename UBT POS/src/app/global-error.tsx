"use client";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body>
                <div style={{ padding: "20px", color: "red", backgroundColor: "white", minHeight: "100vh" }}>
                    <h2>Global Error Boundary</h2>
                    <p>{error.message}</p>
                    <pre style={{ marginTop: "20px", whiteSpace: "pre-wrap", background: "#f5f5f5", padding: "10px", color: "black" }}>
                        {error.stack}
                    </pre>
                    <button onClick={() => reset()}>Qayta urinish</button>
                </div>
            </body>
        </html>
    );
}
