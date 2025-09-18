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
      nextErrors.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email)) {
      nextErrors.email = "Entrez un email valide";
    }
    if (!formValues.password) {
      nextErrors.password = "Le mot de passe est requis";
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
      console.log('Tentative de connexion avec:', { email: formValues.email });
      const session = await account.createEmailPasswordSession(formValues.email, formValues.password);
      console.log('Connexion réussie:', session);
      setMessage("Connexion réussie !");
      setTimeout(() => {
        onLogin();
      }, 1000);
    } catch (error) {
      console.error('Détails de l\'erreur de connexion:', error);
      
      // Gestion d'erreurs plus spécifique
      let errorMessage = "Échec de la connexion. Veuillez vérifier vos identifiants.";
      
      if (error.code === 401) {
        errorMessage = "Email ou mot de passe invalide. Veuillez vérifier vos identifiants.";
      } else if (error.code === 400) {
        errorMessage = "Requête invalide. Veuillez vérifier le format de votre email.";
      } else if (error.code === 429) {
        errorMessage = "Trop de tentatives de connexion. Veuillez réessayer plus tard.";
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
        <h1 className="login-title">Bon retour</h1>
        <p className="login-subtitle">Connectez-vous à votre compte</p>
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="login-field">
            <label htmlFor="email" className="login-label">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="vous@exemple.com"
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
              placeholder="Votre mot de passe"
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
            {submitting ? "Connexion..." : "Se connecter"}
          </button>
          {message && <div className={`login-message ${message.includes('successful') ? 'success' : 'error'}`}>{message}</div>}
        </form>
        <div className="login-footer">
          <p>Vous n'avez pas de compte ? <Link to="/register" className="register-link">S'inscrire</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login;