export type OxfordLookup = {
  found: boolean;
  cefr: string | null;
};

export type Learner = {
  target_level: "C1";
  context: string;
  goals: string[];
};

export type LearnerState = {
  word: string;
  sentence: string;
  learner: Learner;
};

export type LearningPriority = {
  score: number;
};

export type LearningMaterial = {
  definition: string;
  usage: string;
  example: string;
};

export type WordworthResult = {
  word: string;
  context: string;
  oxford: OxfordLookup;
  learningPriority: LearningPriority | null;
  learningMaterial: LearningMaterial | null;
};

export type WordworthError = {
  error: {
    code: string;
    message: string;
  };
};

export type ProgressStage =
  | "Oxford lookup"
  | "Jev evaluation"
  | "Learning material"
  | "Complete";
