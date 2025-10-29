// server.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors()); // 允许前端请求
app.use(bodyParser.json({ limit: "10mb" }));

// 模拟 Llama3 API，返回两个 MusicXML 方案
app.post("/api/llama3", async (req, res) => {
  const { prompt, xml } = req.body;
  console.log("User prompt:", prompt);
  console.log("Original XML length:", xml.length);

  // TODO: 调用真正的 Llama3 接口生成两个方案
  
  const option1 = xml.replace("<work-title>Untitled</work-title>", "<work-title>Option 1</work-title>");
  const option2 = xml.replace("<work-title>Untitled</work-title>", "<work-title>Option 2</work-title>");

  res.json({ options: [option1, option2] });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
