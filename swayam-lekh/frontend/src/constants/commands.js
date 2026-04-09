export const COMMANDS = [
  // ANSWER_MODE
  {
    command: "STOP STOP STOP",
    audioFile: "/audio/cmd_1_stop.mp3",
    description: "Immediately pauses answer mode and switches to command mode.",
    category: "ANSWER_MODE",
  },
  {
    command: "DELETE BY [N] WORDS",
    audioFile: "/audio/cmd_2_delete.mp3",
    description: "Removes the last N spoken words and reads the updated answer aloud. E.g. say 'Delete by 3 words'.",
    category: "ANSWER_MODE",
  },
  {
    command: "CLEAR",
    audioFile: "/audio/cmd_3_clear.mp3",
    description: "Erases the entire answer for the current question.",
    category: "ANSWER_MODE",
  },

  // COMMAND_MODE
  {
    command: "SUBMIT",
    audioFile: "/audio/cmd_4_submit.mp3",
    description: "Saves your current answer and moves to the next unattempted question.",
    category: "COMMAND_MODE",
  },
  {
    command: "SKIP",
    audioFile: "/audio/cmd_5_skip.mp3",
    description: "Moves to the next question without saving your answer.",
    category: "COMMAND_MODE",
  },
  {
    command: "REPEAT QUESTION",
    audioFile: "/audio/cmd_6_repeat_question.mp3",
    description: "Reads out the current question again.",
    category: "COMMAND_MODE",
  },
  {
    command: "REPEAT ANSWER",
    audioFile: "/audio/cmd_7_repeat_answer.mp3",
    description: "Reads out what you have written so far.",
    category: "COMMAND_MODE",
  },
  {
    command: "SKIP TO QUESTION NUMBER [N]",
    audioFile: "/audio/cmd_8_skip_to_question.mp3",
    description: "Jumps directly to question number N. E.g. say 'Skip to Question Number 5'.",
    category: "COMMAND_MODE",
  },
  {
    command: "LIST COMMANDS",
    audioFile: null,
    description: "Opens the full voice command guide on screen.",
    category: "COMMAND_MODE",
  },
  {
    command: "TIME LEFT",
    audioFile: null,
    description: "Announces the remaining exam time.",
    category: "COMMAND_MODE",
  },
  {
    command: "CORRECT [WRONG] TO [RIGHT]",

    audioFile: null,
    description: "Replace first occurrence of a word in your answer. E.g. 'correct newton to neutron'.",
    category: "COMMAND_MODE",
  },
  {
    command: "SPELL MODE / END SPELL",
    audioFile: null,
    description: "Enter spelling mode to speak letters for a word, then say 'end spell' to exit.",
    category: "COMMAND_MODE",
  },

  // EMERGENCY
  {
    command: "HELP HELP HELP",
    audioFile: "/audio/cmd_9_help.mp3",
    description: "Triggers a visual alert on screen to summon the hall supervisor.",
    category: "EMERGENCY",
  },
  {
    command: "FINISH BY [registration number]",
    audioFile: "/audio/cmd_10_finish.mp3",
    description: "Ends the exam session. Requires your registration number for authorization.",
    category: "EMERGENCY",
  },
];