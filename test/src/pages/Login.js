import React, { useState } from "react";
import { Link } from "react-router-dom";
import { account } from "../appwrite/config";
import "./Login.css";

const Login = ({ onLogin }) => {
  const [formValues, setFormValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!formValues.email.trim()) {
      nextErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email)) {
      nextErrors.email = "Enter a valid email";
    }
    if (!formValues.password) {
      nextErrors.password = "Password is required";
    }
    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    
    setSubmitting(true);
    try {
      console.log('Attempting login with:', { email: formValues.email });
      const session = await account.createEmailPasswordSession(formValues.email, formValues.password);
      console.log('Login successful:', session);
      setMessage("Login successful!");
      setTimeout(() => {
        onLogin();
      }, 1000);
    } catch (error) {
      console.error('Login error details:', error);
      
      // Gestion d'erreurs plus spécifique
      let errorMessage = "Login failed. Please check your credentials.";
      
      if (error.code === 401) {
        errorMessage = "Invalid email or password. Please check your credentials.";
      } else if (error.code === 400) {
        errorMessage = "Invalid request. Please check your email format.";
      } else if (error.code === 429) {
        errorMessage = "Too many login attempts. Please try again later.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setMessage(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">Welcome Back</h1>
        <p className="login-subtitle">Sign in to your account</p>
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="login-field">
            <label htmlFor="email" className="login-label">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={formValues.email}
              onChange={handleChange}
              className="login-input"
              autoComplete="email"
            />
            {errors.email && <div className="login-error">{errors.email}</div>}
          </div>

          <div className="login-field">
            <label htmlFor="password" className="login-label">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Your password"
              value={formValues.password}
              onChange={handleChange}
              className="login-input"
              autoComplete="current-password"
            />
            {errors.password && <div className="login-error">{errors.password}</div>}
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={submitting}
          >
            {submitting ? "Signing in..." : "Sign In"}
          </button>
          {message && <div className={`login-message ${message.includes('successful') ? 'success' : 'error'}`}>{message}</div>}
        </form>
        <div className="login-footer">
          <p>Don't have an account? <Link to="/register" className="register-link">Sign up</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login;