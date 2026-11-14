import { describe, expect, it } from "vitest";
import { assessPromptPackage } from "./verification";

const completePackage = {
  title: "Product description prompt",
  shortDescription: "Create consistent product descriptions for a store.",
  description: "A structured prompt package for e-commerce product copy.",
  category: "Marketing & Business",
  promptContent: "Write a detailed product description for [product_name] aimed at [target_audience]. Include benefits, specifications and a clear call to action. Keep it accurate and do not invent claims.",
  instructions: "1. Replace [product_name].\n2. Add [target_audience].\n3. Paste the prompt into your selected AI tool and review the result.",
};

describe("assessPromptPackage", () => {
  it("recognizes a complete documented prompt package", () => {
    const result = assessPromptPackage(completePackage);
    expect(result.completeness.complete).toBe(true);
    expect(result.completeness.placeholderCount).toBe(2);
    expect(result.reproducibility.state).toBe("documented_not_reproduced");
    expect(result.originality.exactDuplicateCheck).toBe("not-run");
  });

  it("flags missing instructions and placeholders", () => {
    const result = assessPromptPackage({ ...completePackage, instructions: "", promptContent: "Do the thing." });
    expect(result.completeness.complete).toBe(false);
    expect(result.completeness.missing).toContain("step_by_step_instructions");
    expect(result.completeness.missing).toContain("customizable_placeholders_or_explicit_fixed_input");
  });

  it("routes high-risk claims to human review without making a legal conclusion", () => {
    const result = assessPromptPackage({ ...completePackage, description: "Guaranteed income and guaranteed profit." });
    expect(result.compliance.requiresHumanReview).toBe(true);
    expect(result.compliance.flags.length).toBeGreaterThan(0);
    expect(result.compliance.disclaimer).toContain("not a legal");
  });
});
