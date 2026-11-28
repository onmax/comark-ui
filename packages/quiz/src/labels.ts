/** Every word the blocks show, so a host can translate them. `{count}` stands for a number. */
export type QuizLabels = {
  check: string;
  /** Said when Check is pressed with nothing selected. */
  selectAnswer: string;
  tryAgain: string;
  showAnswer: string;
  hint: string;
  correct: string;
  notQuite: string;
  yourAnswer: string;
  correctAnswer: string;
  /** The total under a poll's results, for one vote and for any other count. */
  vote: string;
  votes: string;
  /** The total under a question's results, for one reader and for any other count. */
  answer: string;
  answers: string;
  changeVote: string;
  knewIt: string;
  notYet: string;
  /** Under a poll's options while no host has sent state. */
  noHost: string;
  /** Under a poll once its `closes` date has passed or the host closes voting. */
  closed: string;
  /** The pill on a poll option marked `{recommended}` with no text of its own. */
  recommended: string;
  /** The button that opens a poll's note field, before and after the reader has a note. */
  addNote: string;
  editNote: string;
  /** The note field's placeholder and name, unless the poll's `note` prop gives its own. */
  notePlaceholder: string;
  sendNote: string;
  /** Read before the reader's note under their vote. */
  yourNote: string;
  /** Under a poll when its note is sent before a vote. */
  pickFirst: string;
};

export const DEFAULT_LABELS: QuizLabels = {
  check: "Check",
  selectAnswer: "Select an answer",
  tryAgain: "Try again",
  showAnswer: "Show answer",
  hint: "Hint",
  correct: "Correct",
  notQuite: "Not quite",
  yourAnswer: "Your answer",
  correctAnswer: "Correct answer",
  vote: "{count} vote",
  votes: "{count} votes",
  answer: "{count} answer",
  answers: "{count} answers",
  changeVote: "Change vote",
  knewIt: "I knew it",
  notYet: "Not yet",
  noHost: "Voting needs a host that collects votes.",
  closed: "Voting closed",
  recommended: "Recommended",
  addNote: "Add a note",
  editNote: "Edit note",
  notePlaceholder: "Add a note to your vote",
  sendNote: "Send note",
  yourNote: "Your note",
  pickFirst: "Pick an option to send your note",
};
