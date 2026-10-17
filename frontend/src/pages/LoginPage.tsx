// pages/LoginPage.tsx
// Sign in or create an account (which also creates the organization).

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organization, setOrganization] = useState("");
  const [role, setRole] = useState("supplier");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const body =
        mode === "login"
          ? { email, password }
          : { email, password, organization_name: organization, role };
      const result = await api<{ token: string }>(path, { body });
      await signIn(result.token);
      navigate("/statements");
    } catch (problem) {
      setError((problem as Error).message);
    }
  }

  return (
    <form className="card narrow" onSubmit={submit}>
      <h2>{mode === "login" ? "Sign in" : "Create account"}</h2>
      {mode === "register" && (
        <>
          <input
            placeholder="Organization name"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
          />
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="supplier">Supplier (makes goods)</option>
            <option value="importer">EU importer</option>
            <option value="verifier">Verifier</option>
          </select>
        </>
      )}
      <input placeholder="Email" value={email}
        onChange={(e) => setEmail(e.target.value)} />
      <input placeholder="Password" type="password" value={password}
        onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="error">{error}</p>}
      <button type="submit">
        {mode === "login" ? "Sign in" : "Register"}
      </button>
      <button type="button" className="link"
        onClick={() => setMode(mode === "login" ? "register" : "login")}>
        {mode === "login" ? "Need an account?" : "Have an account?"}
      </button>
    </form>
  );
}
