"use client";

import React, { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim()) {
      setError("Please provide a display name and email address.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await signIn("credentials", {
        username: username.trim(),
        email: email.trim(),
        redirect: false,
        callbackUrl: "/profile",
      });

      if (res?.error) {
        setError("Invalid credentials or server error. Please try again.");
      } else {
        router.push(res?.url || "/profile");
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="marketing-page" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header className="marketing-nav">
        <Link className="brand" href="/" aria-label="Dealopoly home">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            playing_cards
          </span>
          <span>dealopoly</span>
        </Link>
        <div className="marketing-nav-actions">
          <Link href="/" className="button button--ghost" style={{ padding: "6px 14px", fontSize: "0.85rem" }}>
            Play as Guest →
          </Link>
        </div>
      </header>

      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px" }}>
        <div
          className="glass-panel"
          style={{
            maxWidth: "440px",
            width: "100%",
            padding: "36px 32px",
            borderRadius: "20px",
            background: "rgba(29, 32, 33, 0.85)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(66, 71, 81, 0.4)",
            boxShadow: "0 24px 64px rgba(0, 0, 0, 0.6)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #0055A4 0%, #27A644 100%)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "12px",
                boxShadow: "0 4px 16px rgba(0, 85, 164, 0.4)",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "28px", color: "#fff" }}>
                account_circle
              </span>
            </div>
            <h1 style={{ fontFamily: "var(--display)", fontSize: "1.75rem", fontWeight: 800, margin: "0 0 6px" }}>
              Player Account
            </h1>
            <p style={{ fontSize: "0.88rem", color: "var(--muted)", margin: 0 }}>
              Track wins, stats, match history, and achievements across devices.
            </p>
          </div>

          {error && (
            <div
              style={{
                background: "rgba(255, 180, 171, 0.15)",
                border: "1px solid var(--error)",
                color: "var(--error)",
                padding: "10px 14px",
                borderRadius: "10px",
                fontSize: "0.84rem",
                marginBottom: "20px",
              }}
            >
              {error}
            </div>
          )}

          {/* Quick Player Account Form */}
          <form onSubmit={handleQuickLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label
                htmlFor="username"
                style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--mono)", color: "var(--muted)", marginBottom: "6px" }}
              >
                DISPLAY NAME
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. CardShark"
                required
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  background: "var(--surface)",
                  border: "1px solid var(--outline-variant)",
                  color: "var(--text)",
                  fontFamily: "var(--body)",
                  fontSize: "0.95rem",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label
                htmlFor="email"
                style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--mono)", color: "var(--muted)", marginBottom: "6px" }}
              >
                EMAIL ADDRESS
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="player@example.com"
                required
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  background: "var(--surface)",
                  border: "1px solid var(--outline-variant)",
                  color: "var(--text)",
                  fontFamily: "var(--body)",
                  fontSize: "0.95rem",
                  outline: "none",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="button button--primary"
              style={{ width: "100%", justifyContent: "center", marginTop: "6px", padding: "12px" }}
            >
              {isLoading ? "Signing in…" : "Sign In / Register"}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", margin: "24px 0", gap: "12px" }}>
            <div style={{ flex: 1, height: "1px", background: "var(--line)" }} />
            <span style={{ fontSize: "0.72rem", fontFamily: "var(--mono)", color: "var(--subtle)" }}>OR SOCIAL LOGIN</span>
            <div style={{ flex: 1, height: "1px", background: "var(--line)" }} />
          </div>

          {/* Social Providers */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button
              type="button"
              onClick={() => signIn("github", { callbackUrl: "/profile" })}
              className="button button--secondary"
              style={{ width: "100%", justifyContent: "center", padding: "10px" }}
            >
              <svg style={{ width: "18px", height: "18px", fill: "currentColor" }} viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              Continue with GitHub
            </button>

            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/profile" })}
              className="button button--secondary"
              style={{ width: "100%", justifyContent: "center", padding: "10px" }}
            >
              <svg style={{ width: "18px", height: "18px" }} viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              Continue with Google
            </button>
          </div>

          {/* Guest Link */}
          <div style={{ textAlign: "center", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--line)" }}>
            <Link
              href="/"
              style={{
                fontSize: "0.82rem",
                color: "var(--primary)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              Don&apos;t want an account? <span style={{ textDecoration: "underline" }}>Play as Guest</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
