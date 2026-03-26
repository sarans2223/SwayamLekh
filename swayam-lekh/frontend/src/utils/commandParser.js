/**
 * @param {string} transcript 
 * @returns {{type: string, payload: any} | null}
 */
export function parseCommand(transcript) {
  if (!transcript) return null;
  const upper = transcript.toUpperCase().trim();

  if (upper.includes("STOP STOP STOP")) return { type: "STOP", payload: null };
  if (upper.includes("DELETE")) return { type: "DELETE", payload: null };
  if (upper.includes("CLEAR")) return { type: "CLEAR", payload: null };
  if (upper.includes("SUBMIT")) return { type: "SUBMIT", payload: null };
  if (upper.includes("SKIP TO QUES")) {
    const parts = upper.split("SKIP TO QUES");
    const num = parseInt(parts[1]?.trim());
    if (!isNaN(num)) return { type: "SKIP_TO", payload: num };
  }
  if (upper.includes("SKIP")) return { type: "SKIP", payload: null };
  if (upper.includes("REPEAT QUESTION")) return { type: "REPEAT_QUESTION", payload: null };
  if (upper.includes("REPEAT ANSWER")) return { type: "REPEAT_ANSWER", payload: null };
  if (upper.includes("HELP HELP HELP")) return { type: "HELP", payload: null };
  if (upper.includes("FINISH BY")) {
    const rollNo = upper.replace("FINISH BY", "").trim();
    return { type: "FINISH", payload: rollNo };
  }

  return { type: "UNKNOWN", payload: transcript };
}