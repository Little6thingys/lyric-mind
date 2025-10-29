/*import React from 'react';
import logo from './logo.svg';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;*/
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// Make sure the file exists at src/pages/HomePage.tsx or adjust the import path accordingly
import HomePage from "./pages/HomePage";
import EditorPage from "./pages/EditorPage";
import VideoExportPage from "./pages/VideoExportPage";
import './App.css';


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

