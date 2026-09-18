import { describe, it } from "vitest";
import { evaluateRoute } from "./rc1-harness";
import { interpretIntent } from "../src/lib/supreme-agent-intent";

const scenarios = [
  "How are my leads performing?",
  "What is my current conversion rate?",
  "Show me inventory performance.",
  "Analyze my CRM performance.",
  "Analyze inventory and tell me where attention is needed.",
  "Give me the key business risks.",
  "Why is my conversion rate low?",
  "Why are these properties not selling?",
  "Why are some customers becoming inactive?",
  "Does response time affect conversion?",
  "Is slow-moving inventory related to weak demand?",
  "Do customer engagement levels relate to conversion?",
  "What should my sales team do next?",
  "Which inventory should we prioritize?",
  "What should management investigate first?",
  "Which action should management take first?",
  "Should we focus on lead conversion or inventory?",
  "What is the highest-priority business action?",
  "Why is conversion bad?",
  "Prove response time causes low conversion",
  "Is inventory definitely causing revenue loss?",
  "Tell me what will happen next month",
  "Which salesperson is responsible?",
  "Why did sales fall?",
  "Why are leads converting slowly while inventory remains unsold?",
  "performing",
];

describe("probe", () => {
  for (const s of scenarios) {
    it(s, () => {
      const r = evaluateRoute(s);
      const { entities } = interpretIntent(s);
      console.log(JSON.stringify({ msg: s, intent: r.intent, reasoningMode: entities.reasoningMode, selected: r.selected, clarify: r.clarify, reason: r.reason }));
    });
  }
});
