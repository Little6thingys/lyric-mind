import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import {Button} from "../components/ui/Button";
import ScrollArea from "../components/ui/ScrollArea";
import { ConditionSelector } from "../components/ui/ConditionSelector";
import { LogicConnector } from "../components/ui/LogicConnector";
//import {Label}  from "../components/ui/label";
//import { Badge } from "../components/ui/badge"
import { Upload, Search, Trash2 } from "lucide-react"
import {ConditionTag} from "../components/ui/ConditionTag";

export default function HomePage() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedInstrument, setSelectedInstrument] = useState("");
  const [selectedScenes, setSelectedScenes] = useState("");
  const [selectedActions, setSelectedActions] = useState("");
  
  const navigate = useNavigate();

  const peopleList = ["Tom", "Alex", "Lisa"]
  const instrumentList = ["trumpet", "flute", "baritone"]
  const sceneList = ["stadium", "bus", "field"]
  const actionList = ["conducting", "marching", "standing"]
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
    }
  };

  const handleNewScore = () => {
    setFileName("NewScore.musicxml");
  };

  const goToEditor = () => {
    navigate("/editor", { state: { fileName } });
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center p-4 space-y-4 text-center" style={{ backgroundColor: "#394BF3", paddingTop: -100 }}>
      <img src="/Auttaja_Icon.png" style={{width: 700, marginTop: -100}}></img>
      <img src="/auttaja_word_logo.png" style={{width: 400, zIndex: 5, marginTop: -125}}></img>
      <h1 style={{zIndex: 5, marginTop: -35, fontSize: 30, fontWeight: 700, color: "white"}}>Auttaja: The First AI Helper for Music Composition</h1>
      <div className="flex flex-row gap-4">
        <button className="bg-white text-black text-2xl font-bold border-black border-2 rounded-lg px-5 py-3" onClick={goToEditor}>Start</button>
        {/* <button className="bg-white text-black font-bold border-black border-2 rounded-lg px-5 py-2" onClick={handleNewScore}>New Score</button> */}
        {/* <div className="bg-white text-black font-bold border-black border-2 rounded-lg px-5 py-2" >
          <input type="file" accept=".musicxml" onChange={handleFileUpload} />
          {fileName && (
            <>
              <p>Selected File: {fileName}</p>
              <button onClick={goToEditor}>Open Editor</button>
            </>
          )}
        </div>  */}
      </div>
    <div style={{ display: "none" }}>
    <Card className="p-6 space-y-6">
      <h2 className="text-xl font-semibold">Advanced Search Condition Builder</h2>

      {/* People Selection */}
      <div>
        <label>People (Select or Upload)</label>
        <div className="flex gap-2 mt-2">
          <Input placeholder="Search or select..." className="flex-1" />
          <Button variant="outline"><Upload className="mr-2 h-4 w-4" /> Upload Photo</Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {peopleList.map((p) => (
            
            <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5">
  {p}
</span>
          ))}
          <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5">
 +7
</span>
        </div>
      </div>

      {/* Instruments, Scenes, Actions */}
      <div className="grid grid-cols-3 gap-4">
        <ConditionSelector label="Instruments" options={instrumentList} onChange={(value: string) => setSelectedInstrument(value)} />
        <ConditionSelector label="Scenes" options={sceneList} onChange={(value: string) => setSelectedScenes(value)}/>
        <ConditionSelector label="Actions" options={actionList} onChange={(value: string) => setSelectedActions(value)}/>


        <ConditionSelector
  label="Instruments"
  options={instrumentList}
  value={selectedInstrument}
  onChange={setSelectedInstrument}
/>
      </div>

      {/* Logical Condition Builder */}
      <Card className="p-4 border-dashed">
        <label>Condition Logic Builder</label>
        <div className="flex flex-wrap gap-2 mt-2">
          <ConditionTag label="People: Tom, Alex" color="blue" />
          <LogicConnector connector="AND" />
          <ConditionTag label="Instrument: trumpet" color="orange" />
          <LogicConnector connector="OR" />
          <ConditionTag label="Scene: field" color="green" />
          <LogicConnector connector="NOT" />
          <ConditionTag label="Scene: bus" color="red" />
        </div>
      </Card>

      {/* Bottom Action Buttons */}
      <div className="flex justify-end gap-4">
        <Button variant="default"><Trash2 className="mr-2 h-4 w-4" /> Clear Conditions</Button>
        <Button><Search className="mr-2 h-4 w-4" /> Start Search</Button>
      </div>
    </Card>
    </div>
    </div>
  );
}
