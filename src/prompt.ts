export const CLASS_PURPOSE_PLACEHOLDER = "{{CLASS_PURPOSE}}";

export const PROMPT_TEMPLATE = `Generate ten intentionally overcomplicated class names for a class that is good for the following:\n${CLASS_PURPOSE_PLACEHOLDER}\n\nRequirements:\n- Each name must be long and overly specific.\n- Each name must include at least one extra role suffix (Service, Runner, Caller, Manager, Builder, Engine, Orchestrator, Coordinator, Adapter, Dispatcher, Gateway, Provider).\n- Add unnecessary qualifiers that make the names feel heavyweight and enterprise-grade.\n- Return exactly ten names, one per line.`;

export const buildPrompt = (purpose: string) =>
  PROMPT_TEMPLATE.replace(CLASS_PURPOSE_PLACEHOLDER, purpose.trim());
