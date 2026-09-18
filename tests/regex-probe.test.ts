import { describe, it } from "vitest";

describe("regex probe", () => {
  it("tests diagnose regex directly", () => {
    const msg = "why is my conversion rate low?";
    const p1 = /\b(why|cause|reason|behind|driven by)\b/;
    const p2 = /\b(poor|low|weak|slow|high|strong|increase|decrease)\b/;
    console.log("p1 test:", p1.test(msg));
    console.log("p2 test:", p2.test(msg));

    const msg2 = "Analyze inventory and tell me where attention is needed.";
    const analyzeP = /\b(analyze|analysis|assess|evaluate|examine|review|appraise)\b/;
    console.log("analyze test:", analyzeP.test(msg2));

    const msg3 = "What should my sales team do next?";
    const recommendP = /\b(should|recommend|suggest|advice|guidance|what ought|what should)\b/;
    console.log("should test:", recommendP.test(msg3.toLowerCase()));

    const msg4 = "Is slow-moving inventory related to weak demand?";
    const relateP = /\b(related|correlation|connection|link|impact|effect|vs|compare)\b/;
    const impactP = /\b(related|correlation|connection|link|impact|effect|vs|compare)\b/;
    console.log("related test:", relateP.test(msg4.toLowerCase()));

    const msg5 = "Which action should management take first?";
    const decideP = /\b(which action|decide|decision|choose|option|rank)\b/;
    console.log("which action test:", decideP.test(msg5.toLowerCase()));

    // Test the fallback check regex on line 388-389
    const msg6 = "why is my conversion rate low?";
    console.log("starts with how/what:", /^\\s*(how|what)\\b/.test(msg6));
    console.log("has diagnostic markers:", !/\\b(why|cause|reason|analyze|analysis|related|correlation|should|which action|decide|choose|option|rank)\\bi/.test(msg6));
  });
});