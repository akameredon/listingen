export type PromptAssessmentInput = {
  title: string;
  shortDescription: string;
  description: string;
  category: string;
  promptContent: string;
  instructions: string;
};

export type PromptAssessment = {
  qualityScore: number;
  completeness: {
    passed: string[];
    missing: string[];
    placeholderCount: number;
    promptLength: number;
    complete: boolean;
  };
  originality: {
    method: "exact-match-only";
    exactDuplicateCheck: "not-run";
    disclaimer: string;
  };
  compliance: {
    flags: string[];
    requiresHumanReview: boolean;
    disclaimer: string;
  };
  reproducibility: {
    state: "documented_not_reproduced";
    evidenceRequired: true;
    disclaimer: string;
  };
};

const riskyPatterns: Array<[RegExp,string]> = [
  [/\bguaranteed?\s+(?:income|profit|returns?|results?)\b/i,"Potentially misleading guarantee"],
  [/\b(?:cure|diagnose|treat)\s+(?:cancer|diabetes|depression|disease|illness)\b/i,"Medical diagnosis or treatment claim"],
  [/\b(?:steal|exfiltrate|credential harvest|keylogger|ransomware|malware)\b/i,"Potential cyber abuse"],
  [/\b(?:bypass|evade)\s+(?:payment|paywall|license|authentication)\b/i,"Potential access-control circumvention"],
  [/\b(?:impersonate|deepfake)\s+(?:a real person|someone|celebrity)\b/i,"Potential deceptive impersonation"],
];

export function assessPromptPackage(input: PromptAssessmentInput): PromptAssessment {
  const passed: string[] = [];
  const missing: string[] = [];
  const required: Array<[string,string]> = [
    ["title",input.title],
    ["short_description",input.shortDescription],
    ["description",input.description],
    ["category",input.category],
    ["prompt_content",input.promptContent],
    ["usage_instructions",input.instructions],
  ];
  for (const [name,value] of required) {
    if (value.trim().length>0) passed.push(name);
    else missing.push(name);
  }

  const promptLength=input.promptContent.trim().length;
  if(promptLength<120&&!missing.includes("prompt_content"))missing.push("prompt_content_minimum_length");
  const placeholderCount=(input.promptContent.match(/\[[^\]]{1,80}\]/g)??[]).length;
  if(placeholderCount>0)passed.push("customizable_placeholders");
  else missing.push("customizable_placeholders_or_explicit_fixed_input");
  const hasUsageSteps=/(?:^|\n)\s*(?:\d+[.)]|[-*])\s+\S/m.test(input.instructions);
  if(hasUsageSteps)passed.push("step_by_step_instructions");
  else missing.push("step_by_step_instructions");

  const flags=riskyPatterns.filter(([pattern])=>pattern.test(
    [input.title,input.shortDescription,input.description,input.promptContent,input.instructions].join("\n")
  )).map(([,label])=>label);
  const scoreBase=Math.round((passed.length/(passed.length+missing.length||1))*100);
  const qualityScore=Math.max(0,Math.min(100,scoreBase-flags.length*12));

  return {
    qualityScore,
    completeness:{passed,missing,placeholderCount,promptLength,complete:missing.length===0},
    originality:{
      method:"exact-match-only",
      exactDuplicateCheck:"not-run",
      disclaimer:"This automated check does not establish authorship or plagiarism clearance. Human review and creator rights confirmation are still required.",
    },
    compliance:{
      flags,
      requiresHumanReview:flags.length>0,
      disclaimer:"Keyword screening is a triage signal, not a legal or policy determination.",
    },
    reproducibility:{
      state:"documented_not_reproduced",
      evidenceRequired:true,
      disclaimer:"A complete written prompt is not proof that it executes successfully. Do not label it tested or reproduced without execution evidence.",
    },
  };
}
