import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import VerovioToolkit from 'verovio/esm';

export default function EditorPage() {
  const location = useLocation();
  const { fileName } = location.state || {};
  const [svg, setSvg] = useState<string>("");
  const [tk, setTk] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize Verovio toolkit
    const toolkit = new Verovio.toolkit();
    toolkit.setOptions({
      scale: 40,
      pageHeight: 1000,
      pageWidth: 800,
    });
    setTk(toolkit);

    // Sample MusicXML
    const sampleMusicXML = `<?xml version="1.0" encoding="UTF-8"?>
      <score-partwise version="3.1">
        <part-list/>
        <part id="P1">
          <measure number="1">
            <attributes>
              <divisions>1</divisions>
              <key><fifths>0</fifths></key>
              <time><beats>4</beats><beat-type>4</beat-type></time>
              <clef><sign>G</sign><line>2</line></clef>
            </attributes>
            <note>
              <pitch><step>C</step><octave>4</octave></pitch>
              <duration>1</duration>
              <type>quarter</type>
            </note>
          </measure>
        </part>
      </score-partwise>`;

    toolkit.loadData(sampleMusicXML, { inputFormat: "musicxml" });
    const svgData = toolkit.renderToSVG(1, {});
    setSvg(svgData);
  }, []);

  const handleApplyCommand = () => {
    alert("AI command applied! (Integrate LLaMA backend here)");
    if (tk) {
      // Example: tk.loadData(updatedXML); setSvg(tk.renderToSVG(1));
    }
  };

  const handlePlay = () => alert("Play button clicked! (Use Tone.js to play the score)");
  const handlePause = () => alert("Pause button clicked! (Use Tone.js to pause playback)");

  return (
    <div style={{ display: "flex", padding: 20 }}>
      <div
        ref={containerRef}
        dangerouslySetInnerHTML={{ __html: svg }}
        style={{
          border: "1px solid #ccc",
          padding: 10,
          width: "70%",
          height: "80vh",
          overflow: "auto",
        }}
      />

      <div style={{ marginLeft: 20, width: "30%" }}>
        <h3>AI Chatbot</h3>
        <textarea
          placeholder="Enter instruction (e.g. 'Transpose up one octave')..."
          rows={10}
          style={{ width: "100%", marginBottom: 10 }}
        />
        <button onClick={handleApplyCommand} style={{ width: "100%", marginBottom: 20 }}>
          Apply Command
        </button>

        <h4>Playback</h4>
        <button onClick={handlePlay} style={{ marginRight: 10 }}>Play</button>
        <button onClick={handlePause}>Pause</button>
      </div>
    </div>
  );
}
