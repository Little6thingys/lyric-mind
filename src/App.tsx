
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// Make sure the file exists at src/pages/HomePage.tsx or adjust the import path accordingly
import HomePage from "./pages/HomePage";
import EditorPage from "./pages/EditorPage";
import VideoExportPage from "./pages/VideoExportPage";
import './App.css';
import './styles/globals.css'; 


function App() {
  return (
    
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/video" element={<VideoExportPage />} />
      </Routes>
    </Router>
  );
}

export default App;

