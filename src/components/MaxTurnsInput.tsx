import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MaxTurnsInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

export function MaxTurnsInput({ 
  value, 
  onChange, 
  min = 10, 
  max = 50, 
  className 
}: MaxTurnsInputProps) {
  const [displayValue, setDisplayValue] = useState(value.toString());
  const [isValid, setIsValid] = useState(true);

  // Sync external value changes
  useEffect(() => {
    setDisplayValue(value.toString());
    setIsValid(true);
  }, [value]);

  const validateAndClamp = (inputValue: string): number => {
    const parsed = parseInt(inputValue);
    if (isNaN(parsed)) return value; // Keep current value if invalid
    return Math.max(min, Math.min(max, parsed));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setDisplayValue(newValue);

    // Allow empty string during typing
    if (newValue === "") {
      setIsValid(false);
      return;
    }

    const parsed = parseInt(newValue);
    const isCurrentlyValid = !isNaN(parsed) && parsed >= min && parsed <= max;
    setIsValid(isCurrentlyValid);

    // Only update parent if value is valid and complete
    if (isCurrentlyValid) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    if (displayValue === "" || !isValid) {
      // If empty or invalid, clamp to valid range
      const clampedValue = validateAndClamp(displayValue || value.toString());
      setDisplayValue(clampedValue.toString());
      setIsValid(true);
      if (clampedValue !== value) {
        onChange(clampedValue);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow navigation keys, backspace, delete, tab, enter
    const allowedKeys = [
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Backspace', 'Delete', 'Tab', 'Enter', 'Escape'
    ];
    
    if (allowedKeys.includes(e.key)) {
      return;
    }

    // Allow numbers
    if (e.key >= '0' && e.key <= '9') {
      return;
    }

    // Block everything else
    e.preventDefault();
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="maxTurns">Max Turns</Label>
      <Input
        id="maxTurns"
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`${className} ${!isValid ? 'border-destructive' : ''}`}
        placeholder={`${min}-${max}`}
      />
      {!isValid && (
        <p className="text-sm text-destructive">
          Must be between {min} and {max}
        </p>
      )}
    </div>
  );
}