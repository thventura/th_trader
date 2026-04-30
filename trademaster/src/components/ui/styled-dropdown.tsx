import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DropdownOption {
    id: string;
    label: string;
    icon?: React.ElementType;
}

interface StyledDropdownProps {
    options: DropdownOption[];
    value: string;
    onChange: (value: string) => void;
    label?: string;
    className?: string;
}

export function StyledDropdown({ options, value, onChange, label, className }: StyledDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const selectedOption = options.find(opt => opt.id === value) || options[0];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={cn("relative z-20", className)} ref={dropdownRef}>
            {label && (
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5 block ml-1">
                    {label}
                </span>
            )}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center justify-between w-full px-4 py-2.5 bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-xl text-sm font-medium transition-all group hover:border-trademaster-blue/30 hover:bg-slate-900/80",
                    isOpen && "border-trademaster-blue/50 ring-2 ring-trademaster-blue/10"
                )}
            >
                <div className="flex items-center gap-2.5">
                    {selectedOption.icon && (
                        <selectedOption.icon size={16} className="text-trademaster-blue" />
                    )}
                    <span className="text-slate-200 group-hover:text-white">{selectedOption.label}</span>
                </div>
                <ChevronDown
                    size={16}
                    className={cn("text-slate-500 transition-transform duration-300", isOpen && "rotate-180 text-trademaster-blue")}
                />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                        className="absolute top-full left-0 right-0 mt-2 p-1.5 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
                    >
                        <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
                            {options.map((option) => (
                                <button
                                    key={option.id}
                                    onClick={() => {
                                        onChange(option.id);
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all text-left",
                                        value === option.id
                                            ? "bg-trademaster-blue/10 text-trademaster-blue font-bold"
                                            : "text-slate-400 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    {option.icon && (
                                        <option.icon
                                            size={16}
                                            className={cn(value === option.id ? "text-trademaster-blue" : "text-slate-500")}
                                        />
                                    )}
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
