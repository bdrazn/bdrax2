import { useState, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  multiple?: boolean;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className,
  multiple = false
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (optionValue: string) => {
    if (multiple) {
      const newValue = value.includes(optionValue)
        ? value.filter(v => v !== optionValue)
        : [...value, optionValue];
      onChange(newValue);
    } else {
      onChange([optionValue]);
      setOpen(false);
    }
    setSearchTerm('');
  };

  const handleRemove = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter(v => v !== optionValue));
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        role="combobox"
        aria-expanded={open}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 text-sm border rounded-md bg-white hover:bg-gray-50 cursor-pointer",
          open && "border-brand-500 ring-2 ring-brand-500"
        )}
        onClick={() => setOpen(!open)}
      >
        <div className="flex flex-wrap gap-1 flex-1 min-w-0">
          {value.length > 0 ? (
            value.map(v => {
              const option = options.find(o => o.value === v);
              return (
                <div
                  key={v}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-100 text-brand-800 text-sm"
                >
                  {option?.label}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => handleRemove(v, e)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleRemove(v, e as any);
                      }
                    }}
                    className="cursor-pointer hover:text-brand-600"
                  >
                    <X className="h-3 w-3" />
                  </div>
                </div>
              );
            })
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute w-full z-10 mt-1 bg-white rounded-md border shadow-lg"
          >
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm border-b focus:outline-none focus:ring-2 focus:ring-brand-500 rounded-t-md"
              placeholder="Type to search..."
              onClick={(e) => e.stopPropagation()}
            />
            <div className="max-h-60 overflow-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map(option => (
                  <div
                    key={option.value}
                    role="option"
                    aria-selected={value.includes(option.value)}
                    tabIndex={0}
                    onClick={() => handleSelect(option.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleSelect(option.value);
                      }
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer",
                      value.includes(option.value) && "bg-brand-50 text-brand-900"
                    )}
                  >
                    {option.label}
                    {value.includes(option.value) && (
                      <Check className="h-4 w-4" />
                    )}
                  </div>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No results found
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}