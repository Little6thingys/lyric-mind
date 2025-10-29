import React, { useEffect, useRef, useState } from "react";
import * as VerovioToolkit from "verovio";
import { saveAs } from "file-saver";
import ChatBotComponent from "../components/ChatBotComponent";


 import * as Tone from "tone";
import { Midi } from "@tonejs/midi";


// UI components
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import {Button} from "../components/ui/Button";
import ScrollArea from "../components/ui/ScrollArea";

export default function EditorPage(): React.ReactElement {
  // -----Settings on the left -----
  const [instrument, setInstrument] = useState("Piano");
  const [timeSig, setTimeSig] = useState("4/4");
  const [keySig, setKeySig] = useState("C");
  const [title, setTitle] = useState("Untitled");
  const [composer, setComposer] = useState("Anonymous");
  const [measureCount, setMeasureCount] = useState(8);

  // ----- Toolbar -----
  const [selectedDuration, setSelectedDuration] = useState("quarter");
  const [insertRest, setInsertRest] = useState(false);
  const [dynamicMark, setDynamicMark] = useState("");
  const [selectedMeasures, setSelectedMeasures] = useState<number[]>([]);

  // ----- Score status -----
  const [xml, setXml] = useState<string>("");
  const [svg, setSvg] = useState<string>("");

  const [xmlOption1, setXmlOption1] = useState<string>("");
  const [svgOption1, setSvgOption1] = useState<string>("");

  const [xmlOption2, setXmlOption2] = useState<string>("");
  const [svgOption2, setSvgOption2] = useState<string>("");

  const currentMeasureRef = useRef(1);
  const measureStateRef = useRef<{ [measure: number]: number }>({});
  const containerRef = useRef<HTMLDivElement | null>(null);

  // ----- Zoom & Pan -----
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // ----- Verovio -----
  const toolkitRef = useRef<VerovioToolkit.toolkit | null>(null);

  //Click single/double click timer (saved with ref to avoid re-rendering overwrite)
  const clickTimerRef = useRef<number | null>(null);

  // ----- debug log -----
  const [logs, setLogs] = useState<string[]>([]);
  function addLog(msg: string) {
    setLogs(prev => [...prev, msg]);
    console.log(msg);
  }

  // ----- initialzation -----
  useEffect(() => {
    const tk = new VerovioToolkit.toolkit();
    tk.setOptions({
      scale: 60,
      pageHeight: 2000,
      pageWidth: 1200,
      svgBoundingBoxes: "true",
      adjustPageHeight: true,
    });
    toolkitRef.current = tk;
    regenerateScore();
    
  }, []);

  useEffect(() => {
    if (!toolkitRef.current) return;
    renderXmlToSvg(xml);
    //renderXmlToSvg(xmlOption1);
    //renderXmlToSvg(xmlOption2);
   
  }, [xml, zoom, offset, selectedMeasures]);


  // ------------------- Generate a blank sheet music-------------------
  function generateBlankMusicXML(
    measureCount: number,
    timeSig: string,
    keySig: string,
    title: string,
    composer: string,
    instrument: string
  ) {
    const [beats, beatType] = timeSig.split("/");
    const fifthsMap: Record<string, number> = { C: 0, G: 1, F: -1, D: 2 };
    let measures = "";
    for (let i = 1; i <= measureCount; i++) {
      measures += `<measure number="${i}">
        ${i === 1 ? `
        <attributes>
          <divisions>1</divisions>
          <key><fifths>${fifthsMap[keySig] || 0}</fifths></key>
          <time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time>
          <clef><sign>G</sign><line>2</line></clef>
        </attributes>` : ""}
      </measure>`;
    }
    return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <work><work-title>${title}</work-title></work>
  <identification><creator type="composer">${composer}</creator></identification>
  <part-list>
    <score-part id="P1"><part-name>${instrument}</part-name></score-part>
  </part-list>
  <part id="P1">
    ${measures}
  </part>
</score-partwise>`;
  }

  function regenerateScore() {
    const newXml = generateBlankMusicXML(
      measureCount,
      timeSig,
      keySig,
      title,
      composer,
      instrument
    );
    setXml(newXml);
    currentMeasureRef.current = 1;

    const [beats] = timeSig.split("/").map(Number);
    const state: { [m: number]: number } = {};
    for (let i = 1; i <= measureCount; i++) state[i] = 0;
    measureStateRef.current = state;
    setSelectedMeasures([]);
  }

  function getDurationInTicks(duration: string): number {
    const durationsInTicks: Record<string, number> = {
      whole: 4,
      half: 2,
      quarter: 1,
      eighth: 0.5,
    };
    return durationsInTicks[duration] || 1;
  }

  // -------------------Click on the sheet music to calculate the pitch-------------------
  function getPitchFromClick(e: React.MouseEvent) {
    const svgRoot = containerRef.current?.querySelector("svg");
    if (!svgRoot) return { step: "C", octave: 4 };

    const staffs = Array.from(svgRoot.querySelectorAll("g.staff")) as SVGGElement[];
    let targetStaff: SVGGElement | null = null;

    const clickY = e.clientY;
    for (const staff of staffs) {
      const bbox = staff.getBoundingClientRect();
      if (clickY >= bbox.top && clickY <= bbox.bottom) {
        targetStaff = staff;
        break;
      }
    }
    if (!targetStaff) targetStaff = staffs[0];

    const bbox = targetStaff.getBoundingClientRect();
    const centerY = bbox.top + bbox.height / 2;
    const lineSpacing = 10;
    const referenceMidi = 67; // G4
    const pxPerHalfStep = lineSpacing / 2;
    const diffRaw = (centerY - clickY) / pxPerHalfStep;
    const diff = Math.round(diffRaw);
    let midi = referenceMidi + diff;
    midi = Math.max(0, Math.min(127, midi));
    const steps = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const step = steps[midi % 12];
    const octave = Math.floor(midi / 12) - 1;
    return { step, octave };
  }

  // ------------------- Click to enter a note -------------------
  function handleScoreSingleClick(e: React.MouseEvent) {
    if (!containerRef.current) return;

    const currentMeasureFilled = measureStateRef.current[currentMeasureRef.current] || 0;
    const maxBeats = 4;
    if (currentMeasureFilled >= maxBeats) {
      return;
    }

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, "application/xml");
    const measure = xmlDoc.querySelector(`measure[number="${currentMeasureRef.current}"]`);
    if (!measure) return;

    const note = xmlDoc.createElement("note");
    if (insertRest) {
      note.appendChild(xmlDoc.createElement("rest"));
    } else {
      const pitchEl = xmlDoc.createElement("pitch");
      const { step, octave } = getPitchFromClick(e);
      const stepNode = xmlDoc.createElement("step");
      stepNode.textContent = step.replace("#", "");
      pitchEl.appendChild(stepNode);
      if (step.includes("#")) {
        const alterNode = xmlDoc.createElement("alter");
        alterNode.textContent = "1";
        pitchEl.appendChild(alterNode);
      }
      const octaveNode = xmlDoc.createElement("octave");
      octaveNode.textContent = String(octave);
      pitchEl.appendChild(octaveNode);
      note.appendChild(pitchEl);
    }

    const durationInTicks = getDurationInTicks(selectedDuration);
    const duration = xmlDoc.createElement("duration");
    duration.textContent = String(durationInTicks);
    const type = xmlDoc.createElement("type");
    type.textContent = selectedDuration;
    note.appendChild(duration);
    note.appendChild(type);

    if (dynamicMark) {
      const notations = xmlDoc.createElement("notations");
      const dynamics = xmlDoc.createElement("dynamics");
      const dyn = xmlDoc.createElement(dynamicMark);
      dynamics.appendChild(dyn);
      notations.appendChild(dynamics);
      note.appendChild(notations);
    }

    measure.appendChild(note);

    measureStateRef.current[currentMeasureRef.current] += durationInTicks;

    if (measureStateRef.current[currentMeasureRef.current] >= maxBeats) {
      if (currentMeasureRef.current < measureCount) currentMeasureRef.current++;
    }

    const serializer = new XMLSerializer();
    setXml(serializer.serializeToString(xmlDoc));
  }

  // ------------------- Helper: Identify measure numbers from an element or SVG element -------------------
  function extractMeasureNumberFromElement(el: Element | null): number | null {
    let cur = el;
    while (cur && cur !== document.documentElement) {
       // 1) Check all properties: if the property name or property value contains measure and the value contains a number -> return
      if (cur.tagName && cur.tagName.toLowerCase() === "g") {
        //Find numbers in attributes
        for (let i = 0; i < cur.attributes.length; i++) {
          const attr = cur.attributes[i];
          const name = attr.name;
          const val = attr.value;
          // Directly pure numbers
          const onlyDigits = val.match(/^\s*(\d+)\s*$/);
          if (onlyDigits) return Number(onlyDigits[1]);
          // The attribute name/value contains the measure keyword and a number
          if (/measure/i.test(name) || /measure/i.test(val)) {
            const d = val.match(/(\d+)/);
            if (d) return Number(d[1]);
          }
        }
        //The id may contain m1 / measure-1, etc.
        const idAttr = cur.getAttribute("id");
        if (idAttr) {
          const d = idAttr.match(/(?:m|measure|measure-)?(\d+)/i);
          if (d) return Number(d[1]);
        }
        // If the class contains measure and numbers
        const classAttr = cur.getAttribute("class");
        if (classAttr && /measure/i.test(classAttr)) {
          const d = classAttr.match(/(\d+)/);
          if (d) return Number(d[1]);
        }
      }
      cur = cur.parentElement;
    }
    return null;
  }

 

// -------------------Updates the section highlight on the page DOM -------------------
function updateMeasureHighlight(selected: number[]) {
  console.log("called updatemeasure",selected);
  if (!containerRef.current) return;
  const svgRoot = containerRef.current.querySelector("svg");
  if (!svgRoot) return;

  // Iterate over all g elements and try to find the subsection
  svgRoot.querySelectorAll("g").forEach((g) => {
    const numAttr = g.getAttribute("measure");
    if (!numAttr) return;
    const num = Number(numAttr);
    if (isNaN(num)) return;

    // Remove the old highlight rect
    const oldRect = g.querySelector("rect[data-highlight]");
    if (oldRect) oldRect.remove();

    //If the section is selected, add a yellow semi-transparent rect
    if (selected.includes(num)) {
      const bbox = g.getBBox(); 
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", bbox.x.toString());
      rect.setAttribute("y", bbox.y.toString());
      rect.setAttribute("width", bbox.width.toString());
      rect.setAttribute("height", bbox.height.toString());
      rect.setAttribute("fill", "yellow");        
      rect.setAttribute("fill-opacity", "0.3");   
      rect.setAttribute("stroke", "red");         
      rect.setAttribute("stroke-width", "1");     
      rect.setAttribute("data-highlight", "true");
      g.insertBefore(rect, g.firstChild);         
    }
  });
}


function injectMeasureAttributes(svgString: string, xmlString: string): string {
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
  const xmlDoc = parser.parseFromString(xmlString, "application/xml");

  const xmlMeasures = Array.from(xmlDoc.getElementsByTagName("measure"))
    .map(m => m.getAttribute("number"))
    .filter((n): n is string => !!n);

  // Cleaning up old measure properties
  Array.from(svgDoc.querySelectorAll("[measure]")).forEach(el => el.removeAttribute("measure"));

  // Select only the outer measure container
  const measureGroups = Array.from(svgDoc.querySelectorAll("g.measure:not(.bounding-box)"));
  let xmlIndex = 0;
  measureGroups.forEach(g => {
    if (xmlIndex < xmlMeasures.length) {
      g.setAttribute("measure", xmlMeasures[xmlIndex]);
      xmlIndex++;
    }
  });

  return new XMLSerializer().serializeToString(svgDoc);
}

function applyMeasureHighlight(svgString: string, selected: number[]): string {
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgString, "image/svg+xml");

  const measureGroups = Array.from(svgDoc.querySelectorAll("g.measure:not(.bounding-box)"));

  measureGroups.forEach(g => {
    const measureNum = g.getAttribute("measure");
    if (!measureNum) return;
    const num = parseInt(measureNum, 10);
    if (isNaN(num)) return;

    const rects = Array.from(g.querySelectorAll("rect"))
      .filter(r => r.hasAttribute("width") && r.hasAttribute("height"))
      .filter(r => parseFloat(r.getAttribute("width") || "0") > 0 && parseFloat(r.getAttribute("height") || "0") > 0);

    if (rects.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    rects.forEach(r => {
      const x = parseFloat(r.getAttribute("x") || "0");
      const y = parseFloat(r.getAttribute("y") || "0");
      const w = parseFloat(r.getAttribute("width") || "0");
      const h = parseFloat(r.getAttribute("height") || "0");
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });

    let highlightRect = g.querySelector("rect[data-highlight]");
    if (selected.includes(num)) {
      if (!highlightRect) {
        highlightRect = svgDoc.createElementNS("http://www.w3.org/2000/svg", "rect");
        highlightRect.setAttribute("data-highlight", "true");
        highlightRect.setAttribute("fill", "yellow");
        highlightRect.setAttribute("fill-opacity", "0.3");
        highlightRect.setAttribute("stroke", "none");
        g.insertBefore(highlightRect, g.firstChild); 
      }
      highlightRect.setAttribute("x", minX.toString());
      highlightRect.setAttribute("y", minY.toString());
      highlightRect.setAttribute("width", (maxX - minX).toString());
      highlightRect.setAttribute("height", (maxY - minY).toString());
    } else if (highlightRect) {
      highlightRect.remove();
    }
  });

  return new XMLSerializer().serializeToString(svgDoc);
}

// Double-click to select a measure
function handleScoreDoubleClick(e: React.MouseEvent) {
  if (!containerRef.current) return;
  const svgRoot = containerRef.current.querySelector("svg");
  if (!svgRoot) return;

  let target = (e.target as Element) as HTMLElement | null;

  // Look up to the outer layer g.measure that actually contains measure, skipping the bounding-box
  while (target && target !== (svgRoot as Element)) {
    if (target.tagName === "g" && target.classList.contains("measure") && !target.classList.contains("bounding-box") && target.hasAttribute("measure")) {
      break;
    }
    target = target.parentElement;
  }

  if (!target || target === (svgRoot as Element)) return;

  const num = Number(target.getAttribute("measure"));
  if (isNaN(num)) return;

  const newSelected = selectedMeasures.includes(num)
    ? selectedMeasures.filter(m => m !== num)
    : [...selectedMeasures, num];

  setSelectedMeasures(newSelected);
  updateMeasureHighlight(newSelected);
  currentMeasureRef.current = num;
}


// ------------------- render function -------------------
function renderXmlToSvg(xmlString: string) {
  try {
    if (!toolkitRef.current) return;

    toolkitRef.current.loadData(xmlString, { inputFormat: "musicxml" });
    let out = toolkitRef.current.renderToSVG(1);

    // First inject the real measure property
    out = injectMeasureAttributes(out, xmlString);

    // Highlight again
    out = applyMeasureHighlight(out, selectedMeasures);

    setSvg(out);
    //setSvgOption1(out);
    //setSvgOption2(out);
  } catch (err) {
    addLog(`Render error: ${err}`);
  }
}


   // ------------------- Click processing, distinguish single/double click -------------------
  function handleScoreClick(e: React.MouseEvent) {
    // Single click uses a timer, if a double click is triggered it will be cleared in the wrapper
    if (clickTimerRef.current) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }

    // Use window.setTimeout to return a number (browser environment)
    clickTimerRef.current = window.setTimeout(() => {
      handleScoreSingleClick(e);
      clickTimerRef.current = null;
    }, 250) as unknown as number;
  }

  function handleScoreDoubleClickWrapper(e: React.MouseEvent) {
    if (clickTimerRef.current) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    handleScoreDoubleClick(e as React.MouseEvent<SVGSVGElement>);
  }

  function handleExport() {
  const fileName = prompt("Please enter the exported file name (without extension)", "edited-score");
  if (!fileName) return;

  const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
  saveAs(blob, `${fileName}.musicxml`);
}

 const fileInputRef = useRef<HTMLInputElement | null>(null);

  
  function handleImport() {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

   


function base64ToArrayBuffer(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

async function playMusicXML(xmlString: string) {
  try {
    const tk = new (window as any).verovio.toolkit();
    tk.setOptions({ scale: 40 });
    tk.loadData(xmlString, { inputFormat: "musicxml" });
    console.error("xmlOption1:", xmlOption1)
   
    const midiData = tk.renderToMIDI();
    const midiArrayBuffer = base64ToArrayBuffer(midiData);
    const midi = new Midi(midiArrayBuffer);

    await Tone.start();

    const synth = new Tone.PolySynth(Tone.Synth).toDestination();

    Tone.Transport.cancel();
    Tone.Transport.stop();
    Tone.Transport.position = 0;

    midi.tracks.forEach(track => {
      track.notes.forEach(note => {
        Tone.Transport.schedule((time) => {
          synth.triggerAttackRelease(note.name, note.duration, time);
        }, note.time);
      });
    });

    Tone.Transport.start();

  } catch (err) {
    console.error("Play MusicXML error:", err);
  }
}



   function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (!content) return;
      setXml(content);
      renderXmlToSvg(content);  
    };
    reader.readAsText(file, "utf-8");
  }


  function handleEditButtonClick() {
  if (selectedMeasures.length === 0) {
    addLog("No measure is selected, skip clearing");
    return;
  }

  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, "application/xml");

    selectedMeasures.forEach((m) => {
      const measureEl = xmlDoc.querySelector(`measure[number="${m}"]`);
      if (measureEl) {
        // Delete all <note> in this section
        const notes = measureEl.querySelectorAll("note");
        notes.forEach((n) => n.remove());
      }
    });

    // update XML
    const serializer = new XMLSerializer();
    const newXml = serializer.serializeToString(xmlDoc);
    setXml(newXml);

    // reset counter
    selectedMeasures.forEach((m) => {
      measureStateRef.current[m] = 0;
    });
  } catch (err) {
    addLog(`error happen in resetting counter: ${err}`);
  }
}


  return (
    <div className=" !text-[12px] flex h-screen gap-2 p-2 relative min-h-screen bg-[url('p2.jpg')] bg-cover bg-center bg-no-repeat" style={{ display: "flex" }}>
      

      {/* left side settings */}
      <div className="flex-[2] flex flex-col gap-2 overflow-y-auto">
        <Card className="p-2 bg-blue-50/80 backdrop-blur-sm shadow-sm border border-blue-100">
          <h3 className="font-bold mb-2">Score Settings</h3>
          <div className="mb-2">
            Instrument:
            <select value={instrument} onChange={(e) => setInstrument(e.target.value)}>
              <option>Piano</option>
              <option>Flute</option>
              <option>Choir</option>
              <option>Violin</option>
            </select>
          </div>
          <div className="mb-2">
            Time Signature:
            <select value={timeSig} onChange={(e) => setTimeSig(e.target.value)}>
              <option>4/4</option>
              <option>3/4</option>
              <option>6/8</option>
            </select>
          </div>
          <div className="mb-2">
            Key Signature:
            <select value={keySig} onChange={(e) => setKeySig(e.target.value)}>
              <option>C</option>
              <option>G</option>
              <option>F</option>
              <option>D</option>
            </select>
          </div>
          <div className="mb-2">
            Total Measures:
            <Input
              type="number"
              value={measureCount}
              onChange={(e) => setMeasureCount(Number(e.target.value))}
            />
          </div>
          <div className="mb-2">
            Title:
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="mb-2">
            Composer:
            <Input value={composer} onChange={(e) => setComposer(e.target.value)} />
          </div>
          <Button onClick={regenerateScore}>Generate Blank Score</Button>
        </Card>

        {/* toolbar */}
        <Card className="p-2 bg-blue-50/80 backdrop-blur-sm shadow-sm border border-blue-100">
          <h3 className="font-bold mb-2">Toolbar</h3>
          <div className="flex gap-2 mb-2">
            <Button onClick={() => setSelectedDuration("whole")}>𝅝</Button>
            <Button onClick={() => setSelectedDuration("half")}>𝅗𝅥</Button>
            <Button onClick={() => setSelectedDuration("quarter")}>𝅘𝅥</Button>
          </div>
          <div className="flex gap-2 mb-2">
            <Button onClick={() => setSelectedDuration("eighth")}>𝅘𝅥𝅮</Button>
            <Button onClick={() => setInsertRest(!insertRest)} className={insertRest ? "bg-blue-400" : ""}>
              Rest
            </Button>
          </div>
          


          <div className="mt-2">
            <Button onClick={handleEditButtonClick}>Clear selected measures</Button> 
          </div>

         {selectedMeasures.length > 0 && (
            <div className="mt-4">
              <p>
               Selected Measures: {Math.min(...selectedMeasures)} - {Math.max(...selectedMeasures)}
              </p>
              <Button
                onClick={() => {
                  setSelectedMeasures([]);
                  if (toolkitRef.current) {
                    const out = toolkitRef.current.renderToSVG(1);
                    setSvg(applyMeasureHighlight(out, []));
                  }
                }}
              >
                Clear Highlights
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* display sheet music */}
      <div className="flex-[8] !text-[12px] flex flex-col justify-center overflow-y-auto p-4 bg-white/10 backdrop-blur-md border border-white/20 shadow-md " style={{ display: "flex" }}>
     
        <div className="mb-2 flex gap-2">
          <Button className="!py-1 !px-2 text-[12px] h-[28px] leading-tight" onClick={handleImport}>Import</Button>
          <Button className="!py-1 !px-2 text-[12px] h-[28px] leading-tight" onClick={handleExport}>Export</Button>
          <Button className="!py-1 !px-2 text-[12px] h-[28px] leading-tight" onClick={() => setZoom((z) => z * 1.2)}>Zoom In</Button>
          <Button className="!py-1 !px-2 text-[12px] h-[28px] leading-tight" onClick={() => setZoom((z) => z / 1.2)}>Zoom Out</Button>
          <Button className="!py-1 !px-2 text-[12px] h-[28px] leading-tight" onClick={() => playMusicXML(xml)}>Play</Button>
        </div>

      {/* hidden file selection */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        accept=".musicxml,.xml"
        onChange={handleFileChange}
      />

        <div
          ref={containerRef}
          className="border flex-1 overflow-auto p-2 cursor-crosshair"
          onClick={handleScoreClick}
          onDoubleClick={handleScoreDoubleClickWrapper}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
            }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>

      </div>
      {/* right side ChatBot */}
    <div className="flex-[3] flex flex-col border overflow-y-auto p-4" style={{ display: "flex" }}>
        <ChatBotComponent
          xml={xml}
          setXml={setXml}
          xmlOption1={xmlOption1}
          setXmlOption1={setXmlOption1}
          xmlOption2={xmlOption2}
          setXmlOption2={setXmlOption2}
          regenerateScore={regenerateScore}
        />
      </div>
    </div>
  );
}
