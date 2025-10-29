import os
import xml.etree.ElementTree as ET
 
import tempfile
import json
import re
import logging, traceback
from music21 import converter, meter, tempo, dynamics, articulations, key, interval, chord, note, stream,metadata, volume
from io import StringIO
from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI

# initialize Flask
logging.basicConfig(level=logging.ERROR)
app = Flask(__name__)
CORS(app)  


# prompt: user prompt from front end, xml: whole score from front end, 
# full_prompt: prompt sent to llama3,snippet_xml: part of score needed to modify，score: full musicxml's score
@app.route("/api/llama3", methods=["POST"])
def llama3_handler():
   
    try:
        print("🔥 Flask endpoint /api/llama3 called!") 
        data = request.get_json()
        prompt = data.get("prompt", "")  
        xml = data.get("xml", "")  
        xml = fix_steps(xml)

        #print("User prompt:", prompt)
        #print("prompt userinput:", prompt)
        match = re.search(r"measures?\s+(\d+)[-–](\d+)", prompt)
        if match:
            start_measure = int(match.group(1))
            end_measure = int(match.group(2))
        else:
            start_measure =1 
            end_measure = 8
         
        # get snippet xml
        with tempfile.NamedTemporaryFile(mode="w+", suffix=".xml", delete=False, encoding="utf-8") as f:
            f.write(xml)
            f.flush()
            score = converter.parse(f.name)
       
        all_measures = []
        for p in score.parts:
            all_measures.extend(p.getElementsByClass('Measure'))

        end_measure = len(all_measures)
        snippet = score.measures(start_measure, end_measure)
        snippet_xml = musicxml_to_string(snippet) 
        print("start_measure:", start_measure)
        print("end_measure:", end_measure)
      
        #generate global_info
        k = score.analyze('key')
        t = score.recurse().getElementsByClass(meter.TimeSignature)[0]
        bpm = score.metronomeMarkBoundaries()[0][2].number if score.metronomeMarkBoundaries() else None

        global_info = {
            "key": str(k),
            "time_signature": str(t.ratioString),
            "tempo": bpm
        }

        print(global_info)
  
        full_prompt = build_prompt(prompt, global_info, snippet_xml)
        #print("full prompt:", full_prompt)  # send this string to LLaMA
        
        raw_json = call_llama3_with_prompt(full_prompt)
        print("raw_json",raw_json)
        candidates = extract_candidates(raw_json)
        
        print("candidate 0:", candidates[0])
        if len(candidates) == 2:
            print("candidate 1:", candidates[1]) 

        option1 = apply_llama_plan_to_musicxml(candidates[0],snippet_xml,"1")
        if len(candidates) == 2:
            option2 = apply_llama_plan_to_musicxml(candidates[1],snippet_xml,"2")
        else: option2 = ""

        return jsonify({"options": [option1, option2]})

    except Exception as e:
        print("Error:", e)
        logging.error("Failed to parse XML:\n%s", traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@app.route("/", methods=["GET"])
def home():
    return "Flask backend with Llama3 is running."

def musicxml_to_string(score):
    """Export music21's score object as a MusicXML string"""
    with tempfile.NamedTemporaryFile(mode="r+", suffix=".xml", delete=False, encoding="utf-8") as tmp:
        score.write('musicxml', fp=tmp.name)
        tmp.seek(0)
        return tmp.read()

def fix_steps(xml_str):
    xml_str = re.sub(r"<step>([A-G])b</step>", r"<step>\1</step><alter>-1</alter>", xml_str)
    xml_str = re.sub(r"<step>([A-G])#</step>", r"<step>\1</step><alter>1</alter>", xml_str)
    return xml_str

#generate global_info
def generateGlobalInfo(musicXml: str, prompt: str) -> str:
    """
    Generates or modifies a MusicXML sheet based on a given text prompt.
    Parameters:
        musicXml (str): The complete MusicXML data as a string.
        prompt (str): A textual description of what to do (e.g., "transpose up a whole tone").
    Returns:
        str: The updated MusicXML string.
    """
    try:
        score = converter.parse(StringIO(musicXml), format='musicxml')

        k = score.analyze('key')
        t = score.recurse().getElementsByClass(meter.TimeSignature)[0]
        bpm = score.metronomeMarkBoundaries()[0][2].number if score.metronomeMarkBoundaries() else None

        global_info = {
            "key": str(k),
            "time_signature": str(t.ratioString),
            "tempo": bpm
        }

       
    except Exception as e:
        print("Error in generateMusicSheet:", e)
        return ""

# -------------------------------
# Action implementations
# -------------------------------
def transpose_notes(score, params):
    semitones = int(params.get("semitones", 2))
    for n in score.recurse().notes:
        if isinstance(n, (note.Note, chord.Chord)):
            n.transpose(semitones, inPlace=True)

def change_tempo(score, params):
    from music21 import tempo
    ratio = float(params.get("ratio", 1.0))

    for t in score.recurse().getElementsByClass(tempo.MetronomeMark):
        t.activeSite.remove(t)

    base_bpm = 120
    if hasattr(score, 'metronomeMarkBoundaries'):
        try:
            base_bpm = list(score.metronomeMarkBoundaries()[0][2].number)
        except:
            pass
    new_bpm = int(base_bpm * ratio)

    mm = tempo.MetronomeMark(number=new_bpm)

    for part in score.parts:
        m1 = part.measure(1)
        if m1 is not None:
            m1.insert(0, mm)
        else:
            part.insert(0, mm)

    score.insert(0, mm)



def adjust_rhythm(score, params):
    scale = float(params.get("scale", 1.0))
    for n in score.recurse().notesAndRests:
        n.quarterLength *= scale

def modify_dynamics(score, params):
    change = int(params.get("dynamics_shift", 0))  # -1, -2, +1 等
    dynamic_levels = ['pp', 'p', 'mp', 'mf', 'f', 'ff']

    for part in score.parts:
        measures = list(part.getElementsByClass(stream.Measure))
        for m in measures:
            dyns = list(m.recurse().getElementsByClass(dynamics.Dynamic))
            base_dyn = dyns[0].value if dyns else 'mf'

            try:
                base_index = dynamic_levels.index(base_dyn)
                new_index = min(max(base_index + change, 0), len(dynamic_levels) - 1)
                new_dyn = dynamic_levels[new_index]
            except ValueError:
                new_dyn = 'mf'

            for d in dyns:
                d.activeSite.remove(d)

            m.insert(0, dynamics.Dynamic(new_dyn))

def add_articulation(score, params):
    from music21 import articulations
    style = params.get("style", "staccato")
    for n in score.recurse().notes:
        if style == "staccato":
            n.articulations.append(articulations.Staccato())
        elif style == "accent":
            n.articulations.append(articulations.Accent())

def change_mode(score, params):
    from_mode = params.get("from", "major").lower()
    to_mode_str = params.get("to", "major").lower()

    if " " in to_mode_str:
        tonic_str, mode_str = to_mode_str.split()
        tonic = tonic_str.upper()
        mode = mode_str.lower()
    else:
        mode = to_mode_str
        original_key = score.analyze('key')
        tonic = original_key.tonic.name.upper() if original_key else "C"

    if mode not in ['major','minor']:
        mode = 'major'

    to_key = key.Key(tonic, mode)

    semitone_shift = 0
    if from_mode == "major" and mode == "minor":
        semitone_shift = -3
    elif from_mode == "minor" and mode == "major":
        semitone_shift = 3

    if semitone_shift != 0:
        for n in score.recurse().notes:
            if isinstance(n, note.Note):
                n.transpose(semitone_shift, inPlace=True)
                n.accidental = n.pitch.accidental
            elif isinstance(n, chord.Chord):
                n.transpose(semitone_shift, inPlace=True)
                for nn in n.notes:
                    nn.accidental = nn.pitch.accidental

    for part in score.parts:
        m1 = part.measure(1)
        if m1:
            m1.insert(0, to_key)

def add_chord_tone(score, params):
    from music21 import interval
    interval_str = params.get("interval", "M3")
    i = interval.Interval(interval_str)
    for part in score.parts:
        new_part = stream.Part()
        for n in part.notesAndRests:
            if isinstance(n, note.Note):
                new_note = i.transposeNote(n)
                new_part.append(chord.Chord([n, new_note]))
            else:
                new_part.append(n)
        score.replace(part, new_part)

def repeat_segment(score, params):
    times = int(params.get("times", 2))
    new_score = stream.Score()
    for part in score.parts:
        measures = list(part.getElementsByClass(stream.Measure))
        repeated = measures * times
        new_part = stream.Part()
        for m in repeated:
            new_part.append(m)
        new_score.append(new_part)
    return new_score

def add_seventh_chords(score, params):
    from music21 import interval
    chord_type = params.get("chord_type", "major seventh")
    chord_intervals = {
        "major seventh": ["P1", "M3", "P5", "M7"],
        "minor seventh": ["P1", "m3", "P5", "m7"],
        "dominant seventh": ["P1", "M3", "P5", "m7"],
        "half-diminished seventh": ["P1", "m3", "d5", "m7"],
        "diminished seventh": ["P1", "m3", "d5", "d7"],
    }
    intervals = chord_intervals.get(chord_type, ["P1","M3","P5","M7"])
    for part in score.parts:
        new_part = stream.Part()
        for n in part.notes:
            if isinstance(n, note.Note):
                notes_for_chord = []
                root = n
                for iv in intervals:
                    new_note = interval.Interval(iv).transposeNote(root)
                    notes_for_chord.append(new_note)
                new_part.append(chord.Chord(notes_for_chord, quarterLength=n.quarterLength))
            else:
                new_part.append(n)
        score.replace(part, new_part)

# -------------------------------
# Dispatcher
# -------------------------------
ACTIONS = {
    "transpose": transpose_notes,
    "change_tempo": change_tempo,
    "adjust_rhythm": adjust_rhythm,
    "modify_dynamics": modify_dynamics,
    "add_articulation": add_articulation,
    "change_mode": change_mode,
    "add_chord_tone": add_chord_tone,
    "repeat_segment": repeat_segment,
    "add_seventh_chords": add_seventh_chords
}

# ------------------------------------------------------------------------------------
# Call music21 API to apply actions to the original musicxml and generate new musicxml
# ------------------------------------------------------------------------------------
def apply_llama_plan_to_musicxml(llama_json, input_musicxml_str, option_number="0"):
    try:
        plan = json.loads(llama_json) if isinstance(llama_json, str) else llama_json
        if not isinstance(plan, dict) or "action" not in plan:
            print("Invalid candidate JSON")
            return ""
        
        with tempfile.NamedTemporaryFile(mode="w+", suffix=".xml", delete=False, encoding="utf-8") as in_tmp:
            in_tmp.write(input_musicxml_str)
            in_tmp.flush()
            in_tmp_path = in_tmp.name

        score = converter.parse(in_tmp_path)
        score.metadata = metadata.Metadata(title=f"Modified Melody - Option {option_number}")

        # Apply main action
        main_action = plan["action"].replace(" ","")
        main_params = plan.get("params", {})
        if main_action in ACTIONS:
            ACTIONS[main_action](score, main_params)

        # Apply secondary actions
        for sec in plan.get("secondary_actions", []):
            sec_action = sec.get("action")
            sec_params = sec.get("params", {})
            if sec_action in ACTIONS:
                result = ACTIONS[sec_action](score, sec_params)
                if isinstance(result, stream.Score):
                    score = result  

        with tempfile.NamedTemporaryFile(mode="r+", suffix=".xml", delete=False, encoding="utf-8") as out_tmp:
            score.write("musicxml", fp=out_tmp.name)
            out_tmp.seek(0)
            modified_xml = out_tmp.read()

        return modified_xml

    except Exception as e:
        print(f"Error applying plan: {e}")
        logging.error("Error applying plan:\n%s", traceback.format_exc())
        return ""


ACTIONS_LIST = [
    "transpose",
    "change_tempo",
    "adjust_rhythm",
    "modify_dynamics",
    "add_articulation",
    "change_mode",
    "add_chord_tone",
    "repeat_segment",
    "add_seventh_chords"
]


def build_prompt(user_instruction: str, global_info: dict, musicxml_snippet: str) -> str:
    """
    Build a single prompt string to send to LLaMA.

    user_instruction: e.g. "Make measures 1–4 more joyful"
    global_info: e.g. {"key":"C major","time":"4/4","tempo":100}
    musicxml_snippet: a valid <score-partwise>...</score-partwise> snippet (string)
    """
    # NOTE: be careful with quoting MusicXML when sending; we put it verbatim.
    few_shot_examples = r'''
# FEW-SHOT EXAMPLES (do NOT output these examples in final response; they are examples for the model)
# Example 1: Deterministic transpose
Instruction: "Transpose measures 5-8 up 2 semitones"
Global info: key=C major, time=4/4, tempo=100
MusicXML snippet: <score-partwise> ... (snippet omitted) ... </score-partwise>
Expected JSON (model MUST output exactly JSON only):
{
"candidates": [
{
"id": "v1",
"target": {"measures": [5,6,7,8], "voices": ["melody"], "staves":[1]},
"action": "transpose",
"params": {"semitones": 2},
"musicxml_preview": null,
"error": null
},
{
"id": "v2",
"target": {"measures": [5,6,7,8], "voices": ["melody"], "staves":[1]},
"action": "transpose",
"params": {"semitones": 3},
"musicxml_preview": null,
"error": null
}
]
}
# Example 2: Creative "joyful" mapping -> produce two candidate plans
Instruction: "Make measures 1-4 more joyful"
Global info: key=C major, time=4/4, tempo=100
MusicXML snippet: <score-partwise> ... </score-partwise>
Expected JSON:
{
"candidates": [
{
"id": "v1",
"target": {"measures":[1,2,3,4], "voices":["melody"], "staves":[1]},
"action": "change_tempo",
"params": {"tempo_ratio": 1.12},
"secondary_actions": [
{"action":"adjust_rhythm","params":{"rhythm_scale":0.85}},
{"action":"add_articulation","params":{"articulations":["staccato"]}}
],
"musicxml_preview": null,
"error": null
},
{
"id": "v2",
"target": {"measures":[1,2,3,4], "voices":["melody"], "staves":[1]},
"action": "adjust_rhythm",
"params": {"rhythm_scale":0.8},
"secondary_actions": [
{"action":"modify_dynamics","params":{"dynamics_shift":"+1"}}
],
"musicxml_preview": null,
"error": null
}
]
}

# Example 3: “Make the whole song 25% faster, add some syncopation in the chorus to make it more rhythmic, and add seventh chords to the harmonies to give it a modern sound.-> produce two candidate plans
Instruction: "Make the whole song 25% faster, add some syncopation in the chorus to make it more rhythmic, and add seventh chords to the harmonies to give it a modern sound"
Global info: key=a minor, time=4/4, tempo=90
MusicXML snippet: <score-partwise> ... </score-partwise>
Expected JSON:
{
"candidates": [
{
"id": "v1",
"target": {"measures":[1, 2, 3, 4, 5, 6, 7, 8], "voices":["melody"], "staves":[1]},
"action": "change_tempo",
"params": {"ratio": 1.25},
"secondary_actions": [
{"action":"adjust_rhythm","params":{"type": "add_syncopation", "taget_measures": [1,8]}},
{"action":"add_seventh_chords","params":{}}
],
"musicxml_preview": null,
"error": null
},
{
"id": "v2",
"target": {"measures":[1, 2, 3, 4, 5, 6, 7, 8], "voices":["melody"], "staves":[1]},
"action": "change_mode",
"params": {"from": "major", "to": "minor","target_measures":[1,8]},
"secondary_actions": [
{"action":"change_tempo","params":{"ratio":0.85}},
{"action": 'add_articulation', 'params': {"type": "legato","target_measures":[1,8] }},
{'action': 'modify_dynamics', 'params': {'type':"decrease","amount":12, "target_measures":[1,8] }}
],
"musicxml_preview": null,
"error": null
}
]
}

# Example 4:Change this blues piece to a minor key
Instruction: "Change this blues piece to a minor key, slow it down by 30%, reduce the dynamics, and apply a swing rhythm to make it sound more calm and gentle."
Global info: key=g minor, time=4/4, tempo=100
MusicXML snippet: <score-partwise> ... </score-partwise>
Expected JSON:
{
"candidates": [
{
  "action": "change_tempo", "params": {"ratio": 0.7},
  "secondary_actions": [
    {"action": "modify_dynamics", "params": {"dynamics_shift": "-2"}},
    {"action": "add_articulation", "params": {"articulations": ["legato"]}},
    {"action": "adjust_rhythm", "params": {"rhythm_scale": 0.9}}
  ]
}
"musicxml_preview": null,
"error": null
},
{
"id": "v2",
"target": {"measures":[1, 2, 3, 4, 5, 6, 7, 8], "voices":["melody"], "staves":[1]},
"action": "change_tempo",
    "params": {"ratio": 0.7},  
    "secondary_actions": [
        {"action": "modify_dynamics", "params": {"dynamics_shift": -2}},  
        {"action": "adjust_rhythm", "params": {"rhythm_scale": 0.8}},     
        {"action": "change_mode", "params": {"from": "major", "to": "minor"}}
                        
    ],
"musicxml_preview": null,
"error": null
}
]
}

# Example 5: Deterministic transpose
Instruction: "play one octave lower"
Global info: key=C major, time=4/4, tempo=100
MusicXML snippet: <score-partwise> ... (snippet omitted) ... </score-partwise>
Expected JSON (model MUST output exactly JSON only):
{
"candidates": [
{
"id": "v1",
"target": {"measures": [1,2,3,4], "voices": ["melody"], "staves":[1]},
"action": "transpose",
"params": {"semitones": -12},
"musicxml_preview": null,
"error": null
},
{
"id": "v2",
"target": {"measures": [5,6,7,8], "voices": ["melody"], "staves":[1]},
"action": "transpose",
"params": {"semitones": -5},
"musicxml_preview": null,
"error": null
}
]
}
# Example 6: Ambiguous request -> clarify
Instruction: "Make it heavier"
Global info: key=G minor, time=4/4, tempo=80
MusicXML snippet: <score-partwise> ... </score-partwise>
Expected JSON (clarify):
{"clarify":"Do you mean heavier in texture (add chords) or heavier in rhythm (accent downbeats)?"}
END FEW-SHOT
'''

    # The main system+instruction part
    system_instructions = f'''
You are an expert MusicXML editor and arranger. You will receive THREE pieces of input concatenated below:
1) A single-line Instruction describing the user's intent (e.g. "Make measures 1–4 more joyful").
2) Global info in the format key=..., time=..., tempo=... (useful metadata).
3) A MusicXML snippet (a valid <score-partwise>...</score-partwise>) representing the relevant score fragment.

REQUIREMENTS (must be followed EXACTLY):
- OUTPUT MUST BE EXACTLY ONE JSON OBJECT and NOTHING ELSE (no explanations, no markdown, no extra text).
- The top-level JSON must contain either:
  a) a "candidates" key whose value is an array of exactly TWO candidate objects (see candidate schema below),
  OR
  b) a single {{"clarify":"<one short clarifying question>"}} object if the instruction is ambiguous.
- Each candidate object MUST include at minimum: id (string), target, action, params.
- The "action" field and "action" field inside "secondary_actions" MUST be one of the following nine strings ONLY:
{ACTIONS_LIST}
- If you include a "musicxml_preview" field, its value MUST be either:
  - a valid MusicXML string (<score-partwise>...</score-partwise>) representing the modified fragment,
  OR
  - null.
If you cannot confidently produce a valid MusicXML preview, set "musicxml_preview": null and set "error" to a short explanation.
- If any proposed modification would violate a hard constraint (pitch range, impossible rhythmic structure, or would produce invalid MusicXML),
  DO NOT output invalid MusicXML; instead set "musicxml_preview": null and include an "error" string explaining why.
- No additional fields other than those in the schema are strictly necessary, but extra non-critical fields are allowed as long as JSON remains parseable.

CANDIDATE SCHEMA (each candidate must conform):
{{
"id": "<string>",
"target": {{"measures": [int,...], "voices": ["melody"|"bass"|...], "staves": [int,...]}},
"action": "<one of the 8 actions>",
"params": {{ ... action-specific parameters ... }},
"secondary_actions": [ optional list of simpler action objects like
{{"action":"add_articulation","params":{{...}}}} ],
"musicxml_preview": null OR "<MusicXML string>",
"error": null OR "<short error message>"
}}

The "action" field in both main and secondary actions must be exactly one of the following nine strings only (no exceptions):
['transpose', 'change_tempo', 'adjust_rhythm', 'modify_dynamics', 'add_articulation', 'change_mode', 'add_chord_tone', 'repeat_segment','add_seventh_chords']

Do not invent or output any other action names.
Each candidate must have exactly three actions.
If you cannot find a suitable match among these nine actions, choose the closest valid one and explain briefly in "error".

If the instruction is inherently ambiguous about which measures or what scope to change,
RETURN the clarify JSON (only that) and stop.

Below are several FEW-SHOT examples to follow exactly (do not output examples).
{few_shot_examples}

Now produce the response for the following inputs.You must apply all of the following modifications to the piece. 
Do not skip any:

'''

    # assemble the final prompt by appending the concrete user-supplied inputs
    gi_items = ", ".join([f"{k}={v}" for k, v in global_info.items()])

    final_prompt = (
        system_instructions
        + "\nInstruction: " + user_instruction.strip()
        + "Each modification must be included in your output. Partial modifications are not allowed." 
        + "Make sure the resulting piece reflects all from the Instruction."
        + "\nGlobal info: " + gi_items
        + "\nMusicXML snippet:\n" + musicxml_snippet.strip()
        + "Reminder: every \"action\" value — including those inside \"secondary_actions\""
        + " — must be strictly one of the nine allowed strings. Output will be rejected otherwise."
        + "Each candidate must have exactly three actions."
        + "\n\n# END OF INPUT - OUTPUT JSON ONLY\n"
    )

    return final_prompt


from openai import OpenAI
import json

def call_llama3_with_prompt(full_prompt: str, base_url="http://192.168.1.99:8000/v1", api_key="sk-local", model="llama3"):
    """
    Calls a Llama3 model, returning a raw JSON string.
    Output: Json
    """
    client = OpenAI(base_url=base_url, api_key=api_key)

    messages = [
        {
            "role": "system",
            "content": (
                ""
            )
        },
        {"role": "user", "content": full_prompt}
    ]

    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            response_format={"type": "json_object"}  
        )
        raw_json = response.choices[0].message.content.strip()
        return raw_json
    except Exception as e:
        print(" Errors happened:", e)
        return None


def extract_candidates(raw_json_str: str):
    if not raw_json_str:
        return []

    try:
        data = json.loads(raw_json_str)
    except json.JSONDecodeError as e:
        print("output:", raw_json_str)
        return []

    if "candidates" in data:
        candidates = data["candidates"]
        if isinstance(candidates, list) and len(candidates) == 2:
            return candidates
        else:
            return candidates
    elif "clarify" in data:
        return []
    else:
        return []


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
