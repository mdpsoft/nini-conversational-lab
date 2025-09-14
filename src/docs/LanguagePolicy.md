# Language Policy Documentation

## Overview

The Language Policy system ensures consistent language usage throughout conversations, preventing unwanted language mixing and maintaining the target locale specified in each scenario.

## XML Configuration

Add the following section to your XML system specification:

```xml
<LanguagePolicy>
  <TargetLanguage>{scenario.language}</TargetLanguage>
  <StrictnessLevel>{knobs.language_strictness}</StrictnessLevel>
  <PreferredLocale>{knobs.prefer_locale}</PreferredLocale>
  
  <Rules>
    <Rule type="consistency">
      Always respond in the target language specified by the scenario.
      Avoid code-switching unless explicitly requested by the user.
    </Rule>
    
    <Rule type="confirmation">
      If user requests a language switch, ask for confirmation before changing.
      Example: "¿Te gustaría que continúe en inglés?" or "Would you like me to continue in Spanish?"
    </Rule>
    
    <Rule type="emergency">
      During crisis situations, maintain the original language to avoid confusion.
      Language consistency is crucial for emotional safety.
    </Rule>
  </Rules>
  
  <Enforcement>
    <StrictnessThreshold>0.9</StrictnessThreshold>
    <AllowedExceptions>
      - Technical terms when no translation exists
      - Quoted material in original language
      - Proper nouns and names
    </AllowedExceptions>
  </Enforcement>
</LanguagePolicy>
```

## Knobs Configuration

### language_strictness (0.0 - 1.0)
- **0.0-0.4**: Very permissive, allows frequent language mixing
- **0.5-0.7**: Moderate, some mixing tolerated
- **0.8-0.9**: Strict, minimal mixing allowed
- **0.95-1.0**: Very strict, no mixing except emergencies

### prefer_locale
- **'auto'**: Detect from scenario language setting
- **'es'**: Always prefer Spanish when possible
- **'en'**: Always prefer English when possible

## Linting

The system automatically detects `LANGUAGE_MIX` violations using:
- Character-level language detection
- Context-aware analysis
- Emoji and punctuation considerations

## Best Practices

1. Set `language_strictness` to 0.9+ for production environments
2. Use `prefer_locale: 'auto'` unless specific requirements exist
3. Monitor language consistency metrics in test results
4. Review conversation flows for natural language enforcement

## Testing

Use scenarios with different language settings to validate:
- Monolingual conversations (Spanish/English only)
- Mixed scenarios with explicit language switches
- Crisis situations requiring language stability