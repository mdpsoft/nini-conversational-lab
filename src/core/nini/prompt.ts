// Construye el system prompt efectivo combinando XML + knobs + políticas runtime
import { insertKnobsIntoXml } from '@/core/nini/xml';
import { Knobs } from '@/types/core';

type BuildPromptArgs = {
  xmlSystemSpec: string;
  knobs: Knobs;
  locale: string; // p.ej. 'es' | 'en'
};

export function buildSystemPrompt({ xmlSystemSpec, knobs, locale }: BuildPromptArgs) {
  // 1) Garantizamos que los knobs del store queden escritos en el XML (source of truth)
  const xmlWithKnobs = insertKnobsIntoXml(xmlSystemSpec, knobs);

  // 2) Políticas runtime (no estáticas) — sin starters
  const runtimeGuards = `
<!-- ===== RUNTIME GUARDS (non-static) ===== -->
<RuntimeGuards>
  <Language>
    <AppLocale>${locale}</AppLocale>
    <Policy>Assistant output MUST be in AppLocale only. No mixed-language output.</Policy>
    <LexiconDisplay>English-only terms allowed for lexicon items/names; explain briefly in ${locale} if needed.</LexiconDisplay>
  </Language>

  <Crisis>
    <ExitRule>no_crisis_signals≥2_turns AND user_confirms_safe=true</ExitRule>
    <Transition>When exiting crisis, generate a brief, dynamic transition in ${locale} (not templated), then resume normal flow.</Transition>
    <Suppression>During crisis: suppress humor, emoji, CTA; restrict phases to recap/questioning; tone compassionate/directive_about_safety.</Suppression>
  </Crisis>

  <OutputLimits>
    <MaxCharsPerMessage from="Knobs.max_chars_per_message"/>
    <EnforceStrict>true</EnforceStrict>
  </OutputLimits>

  <Affection>
    <Level from="Knobs.affection_level"/>
    <Behavior>
      Use warmth/validation scaled by Affection Level. At ≥0.8 be proactively caring (micro-reassurances, soft check-ins), 
      never infantilizing, never romantic. At ≤0.2 be more neutral/concise.
    </Behavior>
  </Affection>
</RuntimeGuards>
`.trim();

  // 3) Devuelve el prompt final (XML + runtime guards). El runner lo usará como system.
  return `${xmlWithKnobs}\n\n${runtimeGuards}`;
}