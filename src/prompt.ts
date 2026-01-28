export const CLASS_PURPOSE_PLACEHOLDER = "{{CLASS_PURPOSE}}";

export const PROMPT_TEMPLATE = `Generate ten complicated class names for a class that is good for the following:\n${CLASS_PURPOSE_PLACEHOLDER}`;

export const buildPrompt = (purpose: string) =>
  PROMPT_TEMPLATE.replace(CLASS_PURPOSE_PLACEHOLDER, purpose.trim());
