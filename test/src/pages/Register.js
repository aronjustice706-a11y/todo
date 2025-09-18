import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./Register.css";
import { account } from "../appwrite/config";
const Register=()=>{
	const [formValues, setFormValues] = useState({ name: "", email: "", password: "" });
	const [errors, setErrors] = useState({});
	const [submitting, setSubmitting] = useState(false);
	const [message, setMessage] = useState("");

	const handleChange = (event) => {
		const { name, value } = event.target;
		setFormValues((prev) => ({ ...prev, [name]: value }));
	};

	// Fonction d'inscription Appwrite

	const registerUser = async (name, email, password) => {
		try {
			const response = await account.create('unique()', email, password, name);
			return response;
		} catch (error) {
			console.log('Erreur d\'inscription:', error);
			// Retourner un message d'erreur spécifique
            
			if (error.message) {
				throw new Error(error.message);
			} else {
				throw new Error('Échec de l\'inscription. Veuillez vérifier votre connexion et réessayer.');
			}
		}
	};


	const validate = () => {
		const nextErrors = {};
		if (!formValues.name.trim()) {
			nextErrors.name = "Le nom est requis";
		}
		if (!formValues.email.trim()) {
			nextErrors.email = "L'email est requis";
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email)) {
			nextErrors.email = "Entrez un email valide";
		}
		if (!formValues.password) {
			nextErrors.password = "Le mot de passe est requis";
		} else if (formValues.password.length < 6) {
			nextErrors.password = "Le mot de passe doit contenir au moins 6 caractères";
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
			// Créer l'utilisateur dans Appwrite
			const appwriteUser = await registerUser(formValues.name, formValues.email, formValues.password);
			setMessage("Inscription réussie ! Vous pouvez maintenant vous connecter.");
			setFormValues({ name: "", email: "", password: "" });
		} catch (error) {
			setMessage(error.message || "Échec de l'inscription. Veuillez réessayer.");
		} finally {
			setSubmitting(false);
		}
	};


	return(
		<div className="register-page">
			<div className="register-card">
				<h1 className="register-title">Créer un compte</h1>
				<p className="register-subtitle">Inscrivez-vous avec votre email et mot de passe</p>
				<form className="register-form" onSubmit={handleSubmit} noValidate>
					<div className="register-field">
						<label htmlFor="name" className="register-label">Nom</label>
						<input
							id="name"
							name="name"
							type="text"
							placeholder="Votre nom"
							value={formValues.name}
							onChange={handleChange}
							className="register-input"
							autoComplete="name"
						/>
						{errors.name && <div className="register-error">{errors.name}</div>}
					</div>

					<div className="register-field">
						<label htmlFor="email" className="register-label">Email</label>
						<input
							id="email"
							name="email"
							type="email"
							placeholder="vous@exemple.com"
							value={formValues.email}
							onChange={handleChange}
							className="register-input"
							autoComplete="email"
						/>
						{errors.email && <div className="register-error">{errors.email}</div>}
					</div>

					<div className="register-field">
						<label htmlFor="password" className="register-label">Mot de passe</label>
						<input
							id="password"
							name="password"
							type="password"
							placeholder="Minimum 6 caractères"
							value={formValues.password}
							onChange={handleChange}
							className="register-input"
							autoComplete="new-password"
						/>
						{errors.password && <div className="register-error">{errors.password}</div>}
					</div>

					<button
						type="submit"
						className="register-button"
						disabled={submitting}
					>
						{submitting ? "Création du compte..." : "Créer le compte"}
					</button>
					{message && <div className={`register-message ${message.includes('successful') ? 'success' : 'error'}`}>{message}</div>}
				</form>
				<div className="register-footer">
					<p>Vous avez déjà un compte ? <Link to="/login" className="login-link">Se connecter</Link></p>
				</div>
			</div>
		</div>
	);
}
export default Register;