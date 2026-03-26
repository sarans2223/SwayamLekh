export const COMMANDS = [
  // ANSWER_MODE EMERGENCY
  { cmd: "STOP STOP STOP", desc: "Instantly pauses answer mode and switches to command mode.", category: "ANSWER_MODE" },
  { cmd: "DELETE", desc: "Deletes the last spoken word/phrase.", category: "ANSWER_MODE" },
  { cmd: "CLEAR", desc: "Clears the entire answer for the current question.", category: "ANSWER_MODE" },
  
  // COMMAND_MODE
  { cmd: "SUBMIT", desc: "Saves current answer and moves to next unattempted question.", category: "COMMAND_MODE" },
  { cmd: "SKIP", desc: "Skips current question without saving.", category: "COMMAND_MODE" },
  { cmd: "REPEAT QUESTION", desc: "Reads out the current question text again.", category: "COMMAND_MODE" },
  { cmd: "REPEAT ANSWER", desc: "Reads out what you have written so far.", category: "COMMAND_MODE" },
  { cmd: "SKIP TO QUES [N]", desc: "Jumps directly to question number N.", category: "COMMAND_MODE" },
  
  // EMERGENCY
  { cmd: "HELP HELP HELP", desc: "Triggers screen visual alarm to summon hall supervisor.", category: "EMERGENCY" },
  { cmd: "FINISH BY [roll no]", desc: "Ends the exam session. Can only be authorized by stating registration number.", category: "EMERGENCY" }
];