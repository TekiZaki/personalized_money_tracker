// Register.tsx - Remove inline style
import React, { useState } from "react";

interface RegisterProps {
  onRegister: (username: string, password: string) => void;
  onSwitchToLogin: () => void;
}

const Register: React.FC<RegisterProps> = ({ onRegister, onSwitchToLogin }) => {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRegister(username, password);
  };

  return (
    <div className="auth">
      <h1>Register</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoComplete="username"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
        {/* Remove inline style */}
        <button type="submit">Register</button>
      </form>
      <p>
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          style={{
            backgroundColor: "#007bff", // Blue background color
            color: "white", // White text color
            padding: "8px 16px", // Padding to make it look like a button
            border: "none", // Remove default border
            borderRadius: "4px", // Rounded corners
            cursor: "pointer", // Pointer cursor on hover
            transition: "background-color 0.3s ease", // Smooth transition for hover effect
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "#0056b3")
          } // Darker blue on hover
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "#007bff")
          } // Revert to original color on leave
        >
          Login here
        </button>
      </p>
    </div>
  );
};

export default Register;
