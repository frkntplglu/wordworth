import type { Learner } from "./types.ts";

export const LEARNER: Learner = {
  target_level: "C1",
  context: "Living in a foreign country and using English for daily communication.",
  goals: [
    "Speak naturally in everyday conversations",
    "Build friendships and participate in social conversations",
    "Handle shopping, housing, appointments, travel, and public services",
    "Express opinions, feelings, and experiences clearly",
    "Communicate confidently at work",
    "Understand English articles, news, and other everyday resources",
  ],
};

export const LEARNING_PRIORITY_INSTRUCTIONS =
  "How worthwhile is it for this learner to actively learn this word in the meaning used in the sentence? Active learning means practising the word for speaking and writing. Use your language knowledge to assess its typical usage, practical relevance to life in an English-speaking environment, and usefulness across everyday, social, and professional situations. Use the sentence to identify the intended meaning, but do not limit the evaluation to its topic or to software engineering. Consider both everyday communication and the learner's C1 goal: a word need not be basic or extremely common to be valuable. Do not invent numerical frequency statistics.";

export const LEARNING_PRIORITY_CRITERIA = [
  "Low priority: Rare, specialized, dated, or of limited practical use for this learner. Recognizing it when encountered is enough for now.",
  "Medium priority: Useful occasionally or mainly for understanding content, but less valuable for active communication than other words the learner could study.",
  "High priority: Useful for everyday, social, or professional communication, or for expressing ideas and feelings more precisely at C1 level. Worth practising for active use.",
] as const;

export const LEARNING_MATERIAL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    definition: { type: "string" },
    usage: { type: "string" },
    example: { type: "string" },
  },
  required: ["definition", "usage", "example"],
} as const;
