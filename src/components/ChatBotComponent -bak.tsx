import React, { useState } from "react";
import Card from "./ui/Card";
import ScrollArea from "./ui/ScrollArea";
import Input from "./ui/Input";
import { Button } from "./ui/Button";



 




interface ChatBotComponentProps {
  xml: string;
  setXml: (xml: string) => void;
  regenerateScore: () => void;
}

export default function ChatBotComponent({ xml, setXml, regenerateScore }: ChatBotComponentProps) {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<string[]>([]);

 const regions = ["高亮小节", "1-4 音节", "全部"];
  const categories = ["旋律", "节奏", "和声", "风格"];

  const melodyExamples = [
    "让旋律更欢快",
    "提升音高一个八度",
    "让旋律更流畅",
  ];

  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedExample, setSelectedExample] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "bot"; text: string }[]
  >([]);


 
  // 更新 textarea 的内容（实时组合选择）
  const combinedText = `修改${selectedRegion || "?"}的${
    selectedCategory || "?"
  }，${selectedExample || "?"}`;


  

  // 🟡 NEW: 是否正在录音状态
  const [listening, setListening] = useState(false);
  // 🟡 NEW: SpeechRecognition 实例
  let recognition: any = null;
  if (typeof window !== "undefined") {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) recognition = new SR();
  }

  // 🟡 NEW: 开始语音识别
  const startSpeechRecognition = () => {
    if (!recognition) {
      alert("当前浏览器不支持语音识别，请使用 Chrome。");
      return;
    }
    recognition.lang = "zh-CN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript); // 🟡 将识别结果填入输入框
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

  // 🟡 NEW: 停止语音识别
  const stopSpeechRecognition = () => {
    if (recognition) recognition.stop();
    setListening(false);
  };

  

  async function sendChatMessage() {
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { role: "user", text: input }]);
    setInput("");

    try {
      const backendPort = process.env.REACT_APP_BACKEND_PORT || 5000;
     
      const res = await fetch("http://127.0.0.1:5000/api/llama3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input, xml }),
      }); /**SERVER.PY */
      console.log(xml);
      const data = await res.json();
      setOptions([...data.options]);
      console.log(data.options);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Here are 2 options for your modification:" },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "assistant", text: "Error calling Llama3" }]);
    }
  }

  function selectOption(idx: number) {
    if (options[idx]) {
      setXml(options[idx]);
      console.log(options[idx]);
      setOptions([]);
    }
  }

  function playMusicXML(xmlString: string) {
    try {
      const tk = new (window as any).verovio.toolkit();
      tk.setOptions({ scale: 40 });
      tk.loadData(xmlString, { inputFormat: "musicxml" });
      const midiData = tk.renderToMIDI();
      const blob = new Blob([midiData], { type: "audio/midi" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play();
    } catch (err) {
      console.error("Play MusicXML error:", err);
    }
  }

  return (
    <Card className="flex flex-col flex-1 mt-2">
      
      
      

 

   {/* ChatBot + 控制区 */}
      <div className="flex-1 flex flex-col gap-4">
        {/* 选择修改区域 */}
        <Card>
          
          
         <h2 className="text-xl font-semibold text-gray-900">选择修改区域</h2>
          
            {regions.map((r) => (
              <Button
                key={r}
                variant={selectedRegion === r ? "default" : "outline"}
                onClick={() => setSelectedRegion(r)}
              >
                {r}
              </Button>
            ))}
          
        </Card>

        {/* 选择修改类型 */}
        <Card>
         
          
          <h2 className="text-xl font-semibold text-gray-900">选择修改类型</h2>
         
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          
        </Card>

        {/* 如果用户选择了“旋律”，出现提示和示例 */}
        {selectedCategory === "旋律" && (
          <Card>
            
             
             <h2 className="text-xl font-semibold text-gray-900">旋律修改选项</h2>
           
              <p className="text-sm text-gray-500">
                你想对旋律做什么修改呢？可以点击示例或输入自然语言。
              </p>
              <div className="flex gap-2 flex-wrap">
                {melodyExamples.map((ex) => (
                  <Button
                    key={ex}
                    variant={selectedExample === ex ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedExample(ex)}
                  >
                    {ex}
                  </Button>
                ))}
              </div>
            
          </Card>
        )}

        {/* 展示用户当前选择 */}
        <Card>
         
            <label>你的当前选择：</label>
         
       
            <textarea
              value={combinedText}
              onChange={(e) => setInput(e.target.value)}
              className="resize-none"
            />
         
        </Card>

       
  <ScrollArea className="flex-1 mb-2">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-2 my-1 rounded-md max-w-xs ${
              msg.role === "user"
                ? "bg-blue-500 text-white self-end"
                : "bg-gray-200 text-black self-start"
            }`}
          >
            {msg.text}
          </div>
        ))}

        {options.length > 0 && (
          <div className="flex flex-col gap-2 mt-2">
            {options.map((opt, i) => (
              <div key={i} className="border p-2 rounded-md flex flex-col gap-1">
                <p className="font-semibold">Option {i + 1}</p>
                <div className="flex gap-2">
                  <Button onClick={() => selectOption(i)}>Select</Button>
                  <Button onClick={() => playMusicXML(opt)}>Play</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      
 {/* 聊天历史 */}
        <Card className="flex-1 flex flex-col">
          
            <label>试着点击下面的示例或输入自然语言</label>
          
         
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-2 rounded-md ${
                  msg.role === "user" ? "bg-blue-100 self-end" : "bg-gray-100"
                } max-w-xs`}
              >
                {msg.text}
              </div>
            ))}
         
        </Card>

        {/* 输入框和发送按钮 */}
        <div className="flex gap-2">
          <Input
            placeholder="输入修改说明..."
            value={input || combinedText}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
          />
          
        </div>

        <div className="flex gap-2 items-center mt-2">
        

        {/* 🟡 NEW: 按住说话按钮 + 录音状态指示红点 */}
        <div className="flex items-center gap-2">
          <Button
            onMouseDown={startSpeechRecognition}
            onMouseUp={stopSpeechRecognition}
            onTouchStart={startSpeechRecognition}
            onTouchEnd={stopSpeechRecognition}
          >
            {listening ? "🎙️ 说话中..." : "🎤 按住说话"}
          </Button>

          {/* 🟡 NEW: 红点闪烁动画 */}
          {listening && (
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
          )}
        </div>
        <div><Button onClick={sendChatMessage}>发送</Button></div>   
        
      </div>

      </div>
   
 
    </Card>
  );
}
