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

	// Appwrite registration function

	const registerUser = async (name, email, password) => {
		try {
			const response = await account.create('unique()', email, password, name);
			return response;
		} catch (error) {
			console.log('Registration error:', error);
			// Return specific error message
            
			if (error.message) {
				throw new Error(error.message);
			} else {
				throw new Error('Registration failed. Please check your connection and try again.');
			}
		}
	};


	const validate = () => {
		const nextErrors = {};
		if (!formValues.name.trim()) {
			nextErrors.name = "Name is required";
		}
		if (!formValues.email.trim()) {
			nextErrors.email = "Email is required";
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email)) {
			nextErrors.email = "Enter a valid email";
		}
		if (!formValues.password) {
			nextErrors.password = "Password is required";
		} else if (formValues.password.length < 6) {
			nextErrors.password = "Password must be at least 6 characters";
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
			setMessage("Registration successful! You can now login.");
			setFormValues({ name: "", email: "", password: "" });
		} catch (error) {
			setMessage(error.message || "Registration failed. Please try again.");
		} finally {
			setSubmitting(false);
		}
	};


	return(
		<div className="register-page">
			<div className="register-card">
				<h1 className="register-title">Create account</h1>
				<p className="register-subtitle">Sign up with your email and password</p>
				<form className="register-form" onSubmit={handleSubmit} noValidate>
					<div className="register-field">
						<label htmlFor="name" className="register-label">Name</label>
						<input
							id="name"
							name="name"
							type="text"
							placeholder="Your name"
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
							placeholder="you@example.com"
							value={formValues.email}
							onChange={handleChange}
							className="register-input"
							autoComplete="email"
						/>
						{errors.email && <div className="register-error">{errors.email}</div>}
					</div>

					<div className="register-field">
						<label htmlFor="password" className="register-label">Password</label>
						<input
							id="password"
							name="password"
							type="password"
							placeholder="Minimum 6 characters"
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
						{submitting ? "Creating account..." : "Create account"}
					</button>
					{message && <div className={`register-message ${message.includes('successful') ? 'success' : 'error'}`}>{message}</div>}
				</form>
				<div className="register-footer">
					<p>Already have an account? <Link to="/login" className="login-link">Sign in</Link></p>
				</div>
			</div>
		</div>
	);
}
export default Register;