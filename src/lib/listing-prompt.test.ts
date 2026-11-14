import { describe, expect, it } from "vitest";
import { emptyInput } from "./listing";
import { buildUserMessage, getSpecialistGuidance } from "./listing-prompt.server";

describe("specialist prompt guidance", () => {
  it("adds image-specific controls to visual prompt packages", () => {
    const guidance = getSpecialistGuidance({
      ...emptyInput,
      niche: "Photography & Content Creation",
      output_type: "Image (illustrations, icons, photos, etc.)",
    });
    expect(guidance).toContain("IMAGE & VISUAL SPECIALIST");
    expect(guidance).toContain("aspect ratio");
  });

  it("adds testable acceptance criteria to coding and automation packages", () => {
    const guidance = getSpecialistGuidance({
      ...emptyInput,
      niche: "Programming & Code",
      output_type: "Code",
    });
    expect(guidance).toContain("CODE & AUTOMATION SPECIALIST");
    expect(guidance).toContain("acceptance criteria");
    expect(guidance).toContain("preserve user data");
  });

  it("adds evidence and citation constraints to research packages", () => {
    const guidance = getSpecialistGuidance({
      ...emptyInput,
      niche: "Academic & Education",
      output_type: "Text (articles, copy, scripts, etc.)",
    });
    expect(guidance).toContain("RESEARCH & EDUCATION SPECIALIST");
    expect(guidance).toContain("Never invent sources");
  });

  it("includes specialist requirements for both new and revised generations", () => {
    const input = {
      ...emptyInput,
      core_idea: "A product photo prompt",
      niche: "Photography & Content Creation",
      target_model: "Midjourney v6 / v6.1",
      output_type: "Image (illustrations, icons, photos, etc.)",
    };
    expect(buildUserMessage(input)).toContain("SPECIALIST GENERATION REQUIREMENTS");
    expect(buildUserMessage(input, { previous: "old prompt", fixes: ["Add lighting details"] })).toContain("IMAGE & VISUAL SPECIALIST");
    expect(buildUserMessage(input, { previous: "old prompt", fixes: ["Add lighting details"] })).toContain("Add lighting details");
  });
});
