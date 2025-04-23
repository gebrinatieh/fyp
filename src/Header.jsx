// Header.jsx
import React, { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";

function Header() {
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const toggleDropdown = () => {
    setDropdownVisible((prev) => !prev);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // On successful sign out, onAuthStateChanged in App.jsx should handle redirection.
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "1rem",
        borderBottom: "1px solid #ccc",
      }}
    >
      <h1>Professor Moussallem</h1>
      <div style={{ position: "relative" }}>
        <button
          onClick={toggleDropdown}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          <img
            src="../public/issam.png"
            alt="Profile"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              objectFit: "cover",
            }}
          />
        </button>
        {dropdownVisible && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "100%",
              backgroundColor: "#fff",
              border: "1px solid #ccc",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              zIndex: 1000,
            }}
          >
            <button
              onClick={handleLogout}
              style={{
                display: "block",
                width: "100%",
                padding: "0.5rem 1rem",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Header;
