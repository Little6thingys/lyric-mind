import React, { useRef, useEffect, useState } from "react"; 
import * as VerovioToolkit from "verovio";
import { createPortal } from "react-dom";
import Card from "./ui/Card";
import ScrollArea from "./ui/ScrollArea";
import Input from "./ui/Input";
import { Button } from "./ui/Button";


 import * as Tone from "tone";
import { Midi } from "@tonejs/midi";

interface ChatBotComponentProps {
  xml: string;
  setXml: (xml: string) => void;
  xmlOption1: string;
  setXmlOption1: (xml: string) => void;
  xmlOption2: string;
  setXmlOption2: (xml: string) => void;
  regenerateScore: () => void;
}

export default function ChatBotComponent({ xml, setXml, xmlOption1, setXmlOption1, xmlOption2, setXmlOption2,regenerateScore }: ChatBotComponentProps) {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [aiJustReplied, setAiJustReplied] = useState(false);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tempText, setTempText] = useState("");

  const regions = ["Highlighted sections", "Measures x-y", "All"];
  const categories = ["Melody", "Rhythm", "Harmony", "Style"];

  const melodyExamples = [
    "Make the melody more cheerful",
    "Raise the pitch by one octave",
    "Make the melody smoother",
  ];


  // ------------------- Verovio Toolkit -------------------
  const toolkitRef = useRef<VerovioToolkit.toolkit | null>(null);
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
  }, []);

  // ------------------- SVG states -------------------
  const [svgOriginal, setSvgOriginal] = useState<string>("");
  const [svgOption1, setSvgOption1] = useState<string>("");
  const [svgOption2, setSvgOption2] = useState<string>("");

  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedExample, setSelectedExample] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "bot"; text: string }[]
  >([]);

 const combinedText = `Modify ${selectedRegion || "*"} ${selectedCategory || "*"}, ${selectedExample || "*"}, ${input}`;

  const [listening, setListening] = useState(false);
  let recognition: any = null;
  if (typeof window !== "undefined") {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) recognition = new SR();
  }
  
  //Compare Dialog status
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const handleOpenCompare = () => setIsCompareOpen(true);
  const handleCloseCompare = () => setIsCompareOpen(false);

  const [widths, setWidths] = useState([33.3, 33.3, 33.3]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeDivider = useRef<number | null>(null);

  const handleMouseDown = (index: number) => (activeDivider.current = index);
  const handleMouseUp = () => (activeDivider.current = null);
  const handleMouseMove = (e: MouseEvent) => {
    if (activeDivider.current === null || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const totalWidth = rect.width;
    const x = e.clientX - rect.left;
    const index = activeDivider.current;
    const leftPercent = (x / totalWidth) * 100;

    const newWidths = [...widths];
    if (index === 0) {
      const sum = widths[0] + widths[1];
      const newLeft = Math.max(10, Math.min(sum - 10, leftPercent));
      newWidths[0] = newLeft;
      newWidths[1] = sum - newLeft;
    } else if (index === 1) {
      const sum = widths[1] + widths[2];
      const prevTotal = widths[0];
      const newMid = Math.max(10, Math.min(sum - 10, (x / totalWidth) * 100 - prevTotal));
      newWidths[1] = newMid;
      newWidths[2] = sum - newMid;
    }
    setWidths(newWidths);
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  });

   
  useEffect(() => {
    setSvgOriginal(convertXmlToSvg(xml));
    setSvgOption1(convertXmlToSvg(xmlOption1));
    setSvgOption2(convertXmlToSvg(xmlOption2));
  }, [xml, xmlOption1, xmlOption2]);

   // ------------------- Convert XML to SVG -------------------
  function injectMeasureAttributes(svgString: string, xmlString: string): string {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
    const xmlDoc = parser.parseFromString(xmlString, "application/xml");
    const xmlMeasures = Array.from(xmlDoc.getElementsByTagName("measure"))
      .map((m) => m.getAttribute("number"))
      .filter((n): n is string => !!n);

    Array.from(svgDoc.querySelectorAll("[measure]")).forEach((el) => el.removeAttribute("measure"));

    const measureGroups = Array.from(svgDoc.querySelectorAll("g.measure:not(.bounding-box)"));
    let xmlIndex = 0;
    measureGroups.forEach((g) => {
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
    measureGroups.forEach((g) => {
      const measureNum = g.getAttribute("measure");
      if (!measureNum) return;
      const num = parseInt(measureNum, 10);
      if (isNaN(num)) return;

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
      } else if (highlightRect) {
        highlightRect.remove();
      }
    });

    return new XMLSerializer().serializeToString(svgDoc);
  }


   function convertXmlToSvg(xmlString: string): string {
    if (!toolkitRef.current || !xmlString) return "";
    toolkitRef.current.loadData(xmlString, { inputFormat: "musicxml" });
    let svgOut = toolkitRef.current.renderToSVG(1);
    svgOut = injectMeasureAttributes(svgOut, xmlString);
    svgOut = applyMeasureHighlight(svgOut, []);
    return svgOut;
  }

  const startSpeechRecognition = () => {
    if (!recognition) {
      alert("Your browser does not support speech recognition. Please use Chrome.");
      return;
    }
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };
    recognition.onerror = (err: any) => {
      console.error("Speech recognition error:", err);
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
    };
    recognition.start();
    setListening(true);
  };

  const stopSpeechRecognition = () => {
    if (recognition) recognition.stop();
    setListening(false);
  };

  async function sendChatMessage() {
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { role: "user", text: input }]);
   
    setIsLoading(true);
    setAiJustReplied(false);
    setOptions([]);

    try {
      const backendPort = process.env.REACT_APP_BACKEND_PORT || 5000;
      const res = await fetch("http://127.0.0.1:5000/api/llama3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input, xml }),
      });

      const data = await res.json();
      setOptions([...data.options]);

      setIsLoading(false);
      setAiJustReplied(true);
      setTimeout(() => setAiJustReplied(false), 2000);

      if (data.options.length >= 2) {
        setXmlOption1(data.options[0]);
        setXmlOption2(data.options[1]);
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Here are 2 options for your modification:" },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "assistant", text: "Error calling Llama3" }]);
    }
  }

  const handleDoubleClick = () => {
    setTempText(input); 
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    setInput(tempText); 
    setIsDialogOpen(false);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
  };

  function selectOption(idx: number) {
    if (options[idx]) {
      setXml(options[idx]);
      console.log(options[idx]);
    }
  }
  

function base64ToArrayBuffer(base64:string) {
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

 const handleAskAI = async () => {
    setIsLoading(true);
    setAiJustReplied(false);
    setOptions([]);
 }

 const handlePlay = (xmlData: string | null) => {
  if (!xmlData) {
    alert("No music to play!");
    return;
  }
  try {
    playMusicXML(xmlData);
  } catch (err) {
    console.error("Error playing XML:", err);
  }
};

  return (
     <Card className="flex flex-col w-full max-w-4xl mx-auto mt-4 p-4 shadow-lg rounded-lg bg-white text-[12px] bg-blue-50/80 backdrop-blur-sm shadow-sm border border-blue-100">

        <Card className="w-full bg-blue-50/80 backdrop-blur-sm shadow-sm border border-blue-100">
          <h2 className="text-[14px] font-bold text-gray-900">Select Range</h2>
          <div className="flex flex-wrap gap-2 mt-2">
            {regions.map((r) => (
              <Button className="w-32 !text-[12px] !px-1 py-0.5" 
                key={r}
                variant={selectedRegion === r ? "default" : "outline"}
                onClick={() => setSelectedRegion(r)}
              >
                {r}
              </Button>
            ))}
          </div>
        </Card>

        <Card className="w-full bg-blue-50/80 backdrop-blur-sm shadow-sm border border-blue-100">
          <h2 className="text-[14px] font-bold text-gray-900">Select Category</h2>
          <div className="flex flex-wrap gap-2 mt-2">
            {categories.map((cat) => (
              <Button className="w-32 !text-[12px] px-1 py-0.5" 
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
       </Card>
        {selectedCategory === "Melody" && (
          <Card className="w-full bg-blue-50/80 backdrop-blur-sm shadow-sm border border-blue-100">
            <h2 className="text-[14px] font-bold text-gray-900">Melody Modification Options</h2>
            <p className="text-[12px] text-gray-500">
              What would you like to change about the melody? Click an example or enter natural language.
            </p>
            <div className="flex gap-2 flex-wrap mt-2 text-[12px]">
            {melodyExamples.map((ex) => (
              <Button
                key={ex}
                variant={selectedExample === ex ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedExample(ex)}
                className="
                            !text-[12px]
                            px-1 py-0.5
                            w-[120px]
                            whitespace-normal 
                            text-center 
                            leading-snug 
                            h-auto 
                            min-h-[40px]
                          "
              >
                {ex}
              </Button>
            ))}
          </div>
          </Card>
        )}

        
        <label  className="font-bold text-[14px] p-2">Your current selection:</label>
        <textarea
          value={combinedText}
          onChange={(e) => setInput(e.target.value)}
          
          className="h-[80px]  !text-[12px] resize-none w-full rounded-md border border-gray-300 p-2 text-base"
        />
       
        <label className="font-bold text-[14px] p-2">Our conversation log:</label> 
        <ScrollArea className="flex-1 mb-2 bg-gray-50 p-4 rounded-lg w-full">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex mb-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`p-3 rounded-2xl max-w-[70%] shadow-sm transition-all duration-200 ${
                  msg.role === "user"
                    ? " bg-blue-200 text-white-800 rounded-br-none "
                    : "bg-gray-100 text-gray-900 border border-gray-200 rounded-bl-none"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

      {isLoading && (
        <div className="text-center text-lg font-bold text-white bg-red-500 rounded-md border-2 border-white p-2 animate-pulse mt-3">
          🎵 AI is composing your music...
        </div>
      )}
      {aiJustReplied && (
        <div className="text-center text-sm text-green-600 font-medium mt-3 transition-all">
           AI Response is Ready!
        </div>
      )}
          {options.length > 0 && (
            <div className="flex flex-col gap-3 mt-3">
              {options.map((opt, i) => (
                <div key={i} className="border border-gray-200 bg-white p-3 rounded-lg shadow-sm max-w-[70%] w-full break-words whitespace-pre-wrap">
                  <p className="font-semibold text-gray-700 mb-2">Option {i + 1}</p>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="default"
                      size="sm"
                      className=" bg-green-500 hover:bg-green-600 text-white"
                      onClick={() => selectOption(i)}
                    >
                      Select
                    </Button>
                    <Button variant="default" className="bg-purple-500 hover:bg-blue-50/80 text-white" size="sm" onClick={() => playMusicXML(opt)}>
                      Play
                    </Button>
                  </div>
                </div>
              ))}

              
               <Button
               variant="default" 
                  className="bg-purple-500 hover:bg-purple-600 text-white text-sm"
                  size="sm"
                  onClick={handleOpenCompare}
                >
                  Compare 3 Versions
                </Button>
            </div>
          )}
            

     {isCompareOpen &&
  createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white w-full h-full rounded-xl shadow-2xl p-4 flex flex-col">

        <div className="flex justify-between items-center border-b pb-2 mb-3">
          <h2 className="text-lg font-bold text-orange-700 text-center">
            Compare: Option 1 vs Original vs Option 2
          </h2>
          <button
            onClick={handleCloseCompare}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ✕
          </button>
        </div>

        <div
          className="flex flex-1 overflow-hidden border rounded-md"
          style={{
            userSelect: "none",
            display: "flex",
            justifyContent: "center",
            alignItems: "stretch",
            height: "100%",
          }}
        >
          {/* Option 1 */}
          <div
            className="overflow-auto bg-gray-50 p-2 transition-all flex flex-col items-center"
            style={{ width: `${widths[0]}%` }}
          >
            <div className="flex items-center justify-center gap-2 w-full mb-2">
              <h3 className="font-semibold text-gray-700">Option 1</h3>
              <Button
                size="sm"
                className="bg-blue-500 hover:bg-blue-600 text-white"
                onClick={() => handlePlay(xmlOption1)}
              >
                ▶ Play
              </Button>
            </div>

             <label className="block mb-2 text-sm font-medium bg-gray-200 text-green-600 rounded px-2 py-1 w-full text-left">
             <strong>Modification Summary:</strong><br/>
              - Key changed: <strong>C major → C minor</strong> (sound more emotional/“sad”)<br/>
              - Tempo slowed down to <strong>70%</strong> (slower, easier to hear each note)<br/>
              - Volume slightly reduced (<strong>softer</strong>)<br/><br/>
            </label>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                transform: `scale(0.6)`,
                transformOrigin: "top center",
              }}
              dangerouslySetInnerHTML={{
                __html:
                  svgOption1 ||
                  (xmlOption1
                    ? convertXmlToSvg(xmlOption1)
                    : "<p>No Option 1</p>"),
              }}
            />
          </div>

          <div
            onMouseDown={() => handleMouseDown(0)}
            className="w-1 cursor-col-resize bg-gray-300 hover:bg-blue-400 transition-colors"
          />

        {/* Original */}
          <div
            className="overflow-auto bg-gray-50 p-2 transition-all flex flex-col items-center"
            style={{ width: `${widths[1]}%` }}
          >
            <div className="flex items-center justify-center gap-2 w-full mb-2">
              <h3 className="font-semibold text-gray-700">Original</h3>
              <Button
                size="sm"
                className="bg-blue-500 hover:bg-blue-600 text-white"
                onClick={() => handlePlay(xml)}
              >
                ▶ Play
              </Button>
            </div>

            <label className="block mb-2 text-sm font-medium bg-yellow-200 text-blue-900 rounded px-2 py-1 w-full text-left">
              Your modification instructions: <br /> {input}
            </label>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                transform: `scale(0.6)`,
                transformOrigin: "top center",
              }}
              dangerouslySetInnerHTML={{
                __html:
                  svgOriginal ||
                  (xml ? convertXmlToSvg(xml) : "<p>No Original</p>"),
              }}
            />
          </div>

          <div
            onMouseDown={() => handleMouseDown(1)}
            className="w-1 cursor-col-resize bg-gray-300 hover:bg-blue-400 transition-colors"
          />


          {/* Option 2 */}
          <div
            className="overflow-auto bg-gray-50 p-2 transition-all flex flex-col items-center"
            style={{ width: `${widths[2]}%` }}
          >
            <div className="flex items-center justify-center gap-2 w-full mb-2">
              <h3 className="font-semibold text-gray-700">Option 2</h3>
              <Button
                size="sm"
                className="bg-blue-500 hover:bg-blue-600 text-white"
                onClick={() => handlePlay(xmlOption2)}
              >
                ▶ Play
              </Button>
            </div>

            <label className="block mb-2 text-sm font-medium bg-gray-200 text-green-600 rounded px-2 py-1 w-full text-left">
            <strong>Modification Summary:</strong><br/>
            - Pitch: Transposed down 1 octave → sounds deeper and lower<br/>
            - Tempo: Slowed to 70% of original speed → easier to follow each note<br/>
            - Dynamics: Softer by 1 level → more gentle and mellow<br/><br/>
            </label>



            <div
              style={{
                display: "flex",
                justifyContent: "center",
                transform: `scale(0.6)`,
                transformOrigin: "top center",
              }}
              dangerouslySetInnerHTML={{
                __html:
                  svgOption2 ||
                  (xmlOption2
                    ? convertXmlToSvg(xmlOption2)
                    : "<p>No Option 2</p>"),
              }}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  )}

        </ScrollArea>
          <label className="text-[12px] font-medium text-gray-700">Try clicking an example above or type a natural language instruction</label>
          {chatMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`p-2 rounded-md  max-w-[70%] ${
                msg.role === "user" ? "bg-blue-100 self-end" : "bg-gray-100 self-start"
              }`}
            >
              {msg.text}
            </div>
          ))}
       
      <div className="flex gap-2 w-full text-[12px]">
        <textarea
          placeholder="Enter modification instruction..."
          value={input || combinedText}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChatMessage()}
          onDoubleClick={handleDoubleClick}
          className="h-[80px] !text-[12px] resize-none w-full rounded-md border border-gray-300 p-2 text-base"
        />
      </div>

{isDialogOpen &&
  createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center">
      <div className="bg-white w-[60vw] h-[60vh] rounded-lg shadow-2xl flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">Edit Instructions</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            ✕
          </button>
        </div>
        
        <textarea
          value={tempText} 
          onChange={(e) => setTempText(e.target.value)}
          className="flex-1 w-full p-4 text-base border-none outline-none resize-none"
          placeholder="Enter your instruction..."
        />

       
        <div className="flex justify-end gap-3 p-4 border-t">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body 
  )}

        <div className="flex flex-col gap-2 items-center mt-2 w-full text-[12px]">
          <div className="flex items-center gap-2">
            <Button className="w-32 !text-[12px] px-1 py-0.5" 
              onMouseDown={startSpeechRecognition}
              onMouseUp={stopSpeechRecognition}
              onTouchStart={startSpeechRecognition}
              onTouchEnd={stopSpeechRecognition}
            >
              {listening ? "🎙️ Listening..." : "🎤Hold to Speak"}
            </Button>
            {listening && <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>}
          </div>
          <div>
            <Button onClick={sendChatMessage} className="w-40 !text-[16px] px-1 py-0.5 bg-orange-500 hover:bg-orange-600 text-white">
              Send To AI Bot
            </Button>
          </div>
        </div>
   </Card>
  );
}
