// App.jsx
import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebaseConfig";
import Login from "./login";
import Signup from "./Signup";
import Layout from "./Layout";
import Chat from "./chat";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={!user ? <Login /> : <Navigate to="/chat/1" />}
        />
        <Route
          path="/signup"
          element={!user ? <Signup /> : <Navigate to="/chat/1" />}
        />
        {user && (
          <Route path="/chat" element={<Layout />}>
            <Route path=":chatId" element={<Chat />} />
          </Route>
        )}
        <Route
          path="*"
          element={<Navigate to={user ? "/chat/1" : "/login"} />}
        />
      </Routes>
    </Router>
  );
}

export default App;
