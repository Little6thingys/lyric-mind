// 工具函数：更新音高、时值
export function updatePitch(note: Element, step: string, octave: number) {
  let pitchEl = note.getElementsByTagName("pitch")[0];
  if (!pitchEl) {
    pitchEl = note.ownerDocument!.createElement("pitch");
    note.appendChild(pitchEl);
  }

  let stepEl = pitchEl.getElementsByTagName("step")[0];
  if (!stepEl) {
    stepEl = note.ownerDocument!.createElement("step");
    pitchEl.appendChild(stepEl);
  }
  stepEl.textContent = step.toUpperCase();

  let octaveEl = pitchEl.getElementsByTagName("octave")[0];
  if (!octaveEl) {
    octaveEl = note.ownerDocument!.createElement("octave");
    pitchEl.appendChild(octaveEl);
  }
  octaveEl.textContent = String(octave);
}

export function updateDuration(note: Element, duration: number, type: string) {
  let durEl = note.getElementsByTagName("duration")[0];
  if (!durEl) {
    durEl = note.ownerDocument!.createElement("duration");
    note.appendChild(durEl);
  }
  durEl.textContent = String(duration);

  let typeEl = note.getElementsByTagName("type")[0];
  if (!typeEl) {
    typeEl = note.ownerDocument!.createElement("type");
    note.appendChild(typeEl);
  }
  typeEl.textContent = type;
}

export function getTypeFromDuration(duration: number): string {
  switch (duration) {
    case 4:
      return "whole";
    case 2:
      return "half";
    case 1:
      return "quarter";
    case 0.5:
      return "eighth";
    case 0.25:
      return "16th";
    default:
      return "quarter";
  }
}
