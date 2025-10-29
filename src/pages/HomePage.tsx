import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const [fileName, setFileName] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      // TODO: 上传文件到后端或读取内容
    }
  };

  const handleNewScore = () => {
    setFileName("NewScore.musicxml");
    // TODO: 创建空白 MusicXML
  };

  const goToEditor = () => {
    navigate("/editor", { state: { fileName } });
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>LyricMind</h1>
      <button onClick={handleNewScore}>New Score</button>
      <input type="file" accept=".musicxml" onChange={handleFileUpload} />
      {fileName && (
        <>
          <p>Selected File: {fileName}</p>
          <button onClick={goToEditor}>Open Editor</button>
        </>
      )}
    </div>
  );
}
