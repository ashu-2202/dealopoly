"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { Brand } from "../_components/brand";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { BackButton } from "../_components/back-button";

type AuthMode = "signin" | "signup" | "forgot_password";

function evaluatePasswordStrength(pass: string) {
  const hasMinLength = pass.length >= 8;
  const hasNumberOrSpecial = /[0-9!@#$%^&*(),.?":{}|<>]/.test(pass);
  const hasUpperAndLower = /[a-z]/.test(pass) && /[A-Z]/.test(pass);

  let score = 0;
  if (pass.length > 0) score += 1;
  if (hasMinLength) score += 1;
  if (hasNumberOrSpecial) score += 1;
  if (hasUpperAndLower && pass.length >= 10) score += 1;

  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["#424751", "#ef4444", "#f97316", "#eab308", "#22c55e"];

  return {
    score,
    label: labels[score] || "Weak",
    color: colors[score] || "#ef4444",
    hasMinLength,
    hasNumberOrSpecial,
    hasUpperAndLower,
  };
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();

  const [mode, setMode] = useState<AuthMode>("signin");

  // Sign In fields
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Sign Up fields (4 required fields)
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState("");
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false);

  // Forgot Password fields
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  // Shared state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const strength = evaluatePasswordStrength(signUpPassword);
  const passwordsMatch = signUpPassword.length > 0 && signUpPassword === signUpConfirmPassword;

  // Handle URL errors from NextAuth
  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError) {
      if (urlError === "OAuthAccountNotLinked") {
        setError(
          "An account already exists with this email address using another sign-in method. Please sign in using your original method."
        );
      } else if (urlError === "OAuthCallbackError" || urlError === "Callback") {
        setError(
          "Failed to complete authorization with the provider. Please verify your OAuth app callback URL settings."
        );
      } else if (urlError === "AccessDenied") {
        setError("Access was denied by the provider.");
      } else if (urlError === "Configuration") {
        setError(
          "Authentication configuration error. Please check your OAuth Client ID and Secret in .env."
        );
      } else {
        setError(`Authentication error: ${urlError}`);
      }
    }
  }, [searchParams]);

  // Redirect if authenticated
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/profile");
    }
  }, [status, router]);

  // Clear errors when switching modes
  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setSuccessMsg(null);
    setForgotSuccess(null);
  };

  // Social Login
  const handleSocialLogin = async (provider: "google" | "github") => {
    setError(null);
    try {
      await signIn(provider, { callbackUrl: "/profile" });
    } catch {
      setError(
        `Unable to initiate ${provider} login. Please ensure OAuth credentials are configured in .env.`
      );
    }
  };

  // Handle Sign In Submit
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInEmail.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await signIn("credentials", {
        email: signInEmail.trim(),
        password: signInPassword,
        redirect: false,
        callbackUrl: "/profile",
      });

      if (res?.error) {
        setError("Invalid email or password. Please try again.");
      } else {
        router.push(res?.url || "/profile");
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred during sign in.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Sign Up Submit
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signUpName.trim()) {
      setError("Please provide a display name.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!signUpEmail.trim() || !emailRegex.test(signUpEmail.trim())) {
      setError("Please provide a valid email address.");
      return;
    }

    if (signUpPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (signUpPassword !== signUpConfirmPassword) {
      setError("Passwords do not match. Please verify.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signUpName.trim(),
          email: signUpEmail.trim(),
          password: signUpPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create account.");
        setIsLoading(false);
        return;
      }

      // Auto sign-in after successful registration
      const loginRes = await signIn("credentials", {
        email: signUpEmail.trim(),
        password: signUpPassword,
        redirect: false,
        callbackUrl: "/profile",
      });

      if (loginRes?.error) {
        setSuccessMsg("Account created! Please sign in with your credentials.");
        setMode("signin");
        setSignInEmail(signUpEmail.trim());
      } else {
        router.push(loginRes?.url || "/profile");
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred during account creation.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Forgot Password Submit
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!forgotEmail.trim() || !emailRegex.test(forgotEmail.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send reset link.");
      } else {
        setForgotSuccess(
          data.message || "If an account exists with this email, password reset instructions have been sent."
        );
      }
    } catch {
      setError("An unexpected error occurred while sending the reset link.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="marketing-page"
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <header className="marketing-nav">
        <div style={{ display: "flex", alignItems: "center" }}>
          <Brand />
        </div>
        <div className="marketing-nav-actions">
          <Link
            href="/"
            className="button button--ghost"
            style={{ padding: "6px 14px", fontSize: "0.85rem" }}
          >
            Play as Guest →
          </Link>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 16px",
        }}
      >
        <div
          className="glass-panel"
          style={{
            maxWidth: "460px",
            width: "100%",
            padding: "36px 32px",
            borderRadius: "24px",
            background: "rgba(29, 32, 33, 0.9)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(66, 71, 81, 0.4)",
            boxShadow: "0 24px 64px rgba(0, 0, 0, 0.6)",
          }}
        >
          {/* Header Title */}
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
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
                {mode === "forgot_password" ? "lock_reset" : "account_circle"}
              </span>
            </div>
            <h1
              style={{
                fontFamily: "var(--display)",
                fontSize: "1.75rem",
                fontWeight: 800,
                margin: "0 0 6px",
              }}
            >
              {mode === "signin"
                ? "Welcome Back"
                : mode === "signup"
                ? "Create Account"
                : "Reset Password"}
            </h1>
            <p style={{ fontSize: "0.88rem", color: "var(--muted)", margin: 0 }}>
              {mode === "signin"
                ? "Sign in to access your stats, history, and matches."
                : mode === "signup"
                ? "Join the deal to track wins and play across devices."
                : "Enter your email address to receive a password reset link."}
            </p>
          </div>

          {/* Mode Switcher Tabs (Sign In / Sign Up) */}
          {mode !== "forgot_password" && (
            <div
              style={{
                display: "flex",
                background: "var(--surface)",
                padding: "4px",
                borderRadius: "12px",
                marginBottom: "24px",
                border: "1px solid var(--outline-variant)",
              }}
            >
              <button
                type="button"
                onClick={() => handleModeChange("signin")}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: "8px",
                  border: "none",
                  background: mode === "signin" ? "var(--primary)" : "transparent",
                  color: mode === "signin" ? "#fff" : "var(--muted)",
                  fontWeight: mode === "signin" ? 700 : 500,
                  fontSize: "0.88rem",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("signup")}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: "8px",
                  border: "none",
                  background: mode === "signup" ? "var(--primary)" : "transparent",
                  color: mode === "signup" ? "#fff" : "var(--muted)",
                  fontWeight: mode === "signup" ? 700 : 500,
                  fontSize: "0.88rem",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Feedback Alerts */}
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
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px", flexShrink: 0 }}>
                error
              </span>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                background: "rgba(102, 223, 117, 0.15)",
                border: "1px solid var(--green)",
                color: "var(--green)",
                padding: "10px 14px",
                borderRadius: "10px",
                fontSize: "0.84rem",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px", flexShrink: 0 }}>
                check_circle
              </span>
              <span>{successMsg}</span>
            </div>
          )}

          {/* ============================================================ */}
          {/* 1. SIGN IN FORM */}
          {/* ============================================================ */}
          {mode === "signin" && (
            <form onSubmit={handleSignInSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label
                  htmlFor="signin-email"
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    fontFamily: "var(--mono)",
                    color: "var(--muted)",
                    marginBottom: "6px",
                  }}
                >
                  EMAIL ADDRESS
                </label>
                <input
                  id="signin-email"
                  type="email"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
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

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label
                    htmlFor="signin-password"
                    style={{
                      fontSize: "0.75rem",
                      fontFamily: "var(--mono)",
                      color: "var(--muted)",
                    }}
                  >
                    PASSWORD
                  </label>
                  <button
                    type="button"
                    onClick={() => handleModeChange("forgot_password")}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: "var(--primary)",
                      fontSize: "0.78rem",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    id="signin-password"
                    type={showSignInPassword ? "text" : "password"}
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="Enter your password"
                    style={{
                      width: "100%",
                      padding: "12px 42px 12px 14px",
                      borderRadius: "10px",
                      background: "var(--surface)",
                      border: "1px solid var(--outline-variant)",
                      color: "var(--text)",
                      fontFamily: "var(--body)",
                      fontSize: "0.95rem",
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPassword(!showSignInPassword)}
                    aria-label={showSignInPassword ? "Hide password" : "Show password"}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "var(--muted)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      padding: 0,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                      {showSignInPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="button button--primary"
                style={{
                  width: "100%",
                  justifyContent: "center",
                  marginTop: "6px",
                  padding: "12px",
                  fontSize: "0.95rem",
                }}
              >
                {isLoading ? "Signing in…" : "Sign In"}
              </button>
            </form>
          )}

          {/* ============================================================ */}
          {/* 2. SIGN UP FORM (4 Fields: Name, Email, Password, Confirm)   */}
          {/* ============================================================ */}
          {mode === "signup" && (
            <form onSubmit={handleSignUpSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Field 1: Display Name */}
              <div>
                <label
                  htmlFor="signup-name"
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    fontFamily: "var(--mono)",
                    color: "var(--muted)",
                    marginBottom: "6px",
                  }}
                >
                  DISPLAY NAME
                </label>
                <input
                  id="signup-name"
                  type="text"
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  placeholder="e.g. DealopolyKing"
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

              {/* Field 2: Email Address */}
              <div>
                <label
                  htmlFor="signup-email"
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    fontFamily: "var(--mono)",
                    color: "var(--muted)",
                    marginBottom: "6px",
                  }}
                >
                  EMAIL ADDRESS
                </label>
                <input
                  id="signup-email"
                  type="email"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
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

              {/* Field 3: Password */}
              <div>
                <label
                  htmlFor="signup-password"
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    fontFamily: "var(--mono)",
                    color: "var(--muted)",
                    marginBottom: "6px",
                  }}
                >
                  PASSWORD
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="signup-password"
                    type={showSignUpPassword ? "text" : "password"}
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    required
                    style={{
                      width: "100%",
                      padding: "12px 42px 12px 14px",
                      borderRadius: "10px",
                      background: "var(--surface)",
                      border: "1px solid var(--outline-variant)",
                      color: "var(--text)",
                      fontFamily: "var(--body)",
                      fontSize: "0.95rem",
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    aria-label={showSignUpPassword ? "Hide password" : "Show password"}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "var(--muted)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      padding: 0,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                      {showSignUpPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>

                {/* Password Strength Meter */}
                {signUpPassword.length > 0 && (
                  <div style={{ marginTop: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontSize: "0.7rem", fontFamily: "var(--mono)", color: "var(--muted)" }}>
                        STRENGTH:
                      </span>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: strength.color }}>
                        {strength.label}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "4px", height: "4px" }}>
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          style={{
                            flex: 1,
                            borderRadius: "2px",
                            background: step <= strength.score ? strength.color : "rgba(255,255,255,0.1)",
                            transition: "all 0.3s ease",
                          }}
                        />
                      ))}
                    </div>

                    {/* Requirements checklist */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px", fontSize: "0.72rem" }}>
                      <span style={{ color: strength.hasMinLength ? "#22c55e" : "var(--muted)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                          {strength.hasMinLength ? "check_circle" : "radio_button_unchecked"}
                        </span>
                        At least 8 chars
                      </span>
                      <span style={{ color: strength.hasNumberOrSpecial ? "#22c55e" : "var(--muted)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                          {strength.hasNumberOrSpecial ? "check_circle" : "radio_button_unchecked"}
                        </span>
                        Number or symbol
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Field 4: Confirm Password */}
              <div>
                <label
                  htmlFor="signup-confirm-password"
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    fontFamily: "var(--mono)",
                    color: "var(--muted)",
                    marginBottom: "6px",
                  }}
                >
                  CONFIRM PASSWORD
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="signup-confirm-password"
                    type={showSignUpConfirmPassword ? "text" : "password"}
                    value={signUpConfirmPassword}
                    onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    required
                    style={{
                      width: "100%",
                      padding: "12px 42px 12px 14px",
                      borderRadius: "10px",
                      background: "var(--surface)",
                      border: `1px solid ${
                        signUpConfirmPassword.length > 0
                          ? passwordsMatch
                            ? "#22c55e"
                            : "#ef4444"
                          : "var(--outline-variant)"
                      }`,
                      color: "var(--text)",
                      fontFamily: "var(--body)",
                      fontSize: "0.95rem",
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpConfirmPassword(!showSignUpConfirmPassword)}
                    aria-label={showSignUpConfirmPassword ? "Hide password" : "Show password"}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "var(--muted)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      padding: 0,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                      {showSignUpConfirmPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
                {signUpConfirmPassword.length > 0 && !passwordsMatch && (
                  <span style={{ fontSize: "0.72rem", color: "#ef4444", marginTop: "4px", display: "block" }}>
                    Passwords do not match
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="button button--primary"
                style={{
                  width: "100%",
                  justifyContent: "center",
                  marginTop: "6px",
                  padding: "12px",
                  fontSize: "0.95rem",
                }}
              >
                {isLoading ? "Creating account…" : "Create Account"}
              </button>
            </form>
          )}

          {/* ============================================================ */}
          {/* 3. FORGOT PASSWORD VIEW                                      */}
          {/* ============================================================ */}
          {mode === "forgot_password" && (
            <div>
              {forgotSuccess ? (
                <div style={{ textAlign: "center", padding: "12px 0" }}>
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "50%",
                      background: "rgba(102, 223, 117, 0.15)",
                      color: "var(--green)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "16px",
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "32px" }}>
                      mark_email_read
                    </span>
                  </div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 8px 0" }}>
                    Check Your Inbox
                  </h3>
                  <p style={{ fontSize: "0.88rem", color: "var(--muted)", lineHeight: 1.5, marginBottom: "24px" }}>
                    {forgotSuccess}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleModeChange("signin")}
                    className="button button--primary"
                    style={{ width: "100%", justifyContent: "center", padding: "12px" }}
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <label
                      htmlFor="forgot-email"
                      style={{
                        display: "block",
                        fontSize: "0.75rem",
                        fontFamily: "var(--mono)",
                        color: "var(--muted)",
                        marginBottom: "6px",
                      }}
                    >
                      ACCOUNT EMAIL
                    </label>
                    <input
                      id="forgot-email"
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
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
                    {isLoading ? "Sending reset link…" : "Send Reset Link"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleModeChange("signin")}
                    className="button button--ghost"
                    style={{ width: "100%", justifyContent: "center", padding: "10px" }}
                  >
                    ← Back to Sign In
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* SOCIAL LOGIN DIVIDER & BUTTONS (Visible on Sign In & Sign Up) */}
          {/* ============================================================ */}
          {mode !== "forgot_password" && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  margin: "24px 0 20px 0",
                  gap: "12px",
                }}
              >
                <div style={{ flex: 1, height: "1px", background: "var(--line)" }} />
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontFamily: "var(--mono)",
                    color: "var(--subtle)",
                    letterSpacing: "0.5px",
                  }}
                >
                  OR CONTINUE WITH
                </span>
                <div style={{ flex: 1, height: "1px", background: "var(--line)" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => handleSocialLogin("github")}
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
                  onClick={() => handleSocialLogin("google")}
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
            </>
          )}

          {/* Guest Link */}
          <div
            style={{
              textAlign: "center",
              marginTop: "24px",
              paddingTop: "16px",
              borderTop: "1px solid var(--line)",
            }}
          >
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
              Don&apos;t want an account?{" "}
              <span style={{ textDecoration: "underline" }}>Play as Guest</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
