"use client";

import React, { useState, useEffect } from 'react';

// Common country codes (Asia and Europe)
export const COUNTRY_CODES = [
    { code: '+998', name: 'UZ' },
    { code: '+7', name: 'RU/KZ' },
    { code: '+992', name: 'TJ' },
    { code: '+996', name: 'KG' },
    { code: '+993', name: 'TM' },
    { code: '+90', name: 'TR' },
    { code: '+971', name: 'AE' },
    { code: '+44', name: 'GB' },
    { code: '+49', name: 'DE' },
    { code: '+86', name: 'CN' },
    { code: '+82', name: 'KR' },
    { code: '+81', name: 'JP' },
    { code: '+1', name: 'US' },
];

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value: string;
    onChange: (val: string) => void;
    // Optional default code - could be injected from shop settings if needed
    defaultCountryCode?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
    value,
    onChange,
    className,
    defaultCountryCode = '+998',
    ...props
}) => {

    const getInitialState = () => {
        let code = defaultCountryCode;
        let local = value || '';

        if (value) {
            // Check matching codes, longest first to avoid substring matching issues
            const sortedCodes = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
            for (const c of sortedCodes) {
                if (value.startsWith(c.code)) {
                    code = c.code;
                    local = value.slice(c.code.length).trim();
                    break;
                }
            }
        }
        return { code, local };
    };

    const [{ code, local }, setState] = useState(getInitialState());

    useEffect(() => {
        const { code: newCode, local: newLocal } = getInitialState();
        if (newCode !== code || newLocal !== local) {
            setState({ code: newCode, local: newLocal });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, defaultCountryCode]);

    const handleCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCode = e.target.value;
        setState({ code: newCode, local });
        // Emit combined
        const combined = `${newCode} ${local}`.trim();
        onChange(combined);
    };

    const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newLocal = e.target.value;
        setState({ code, local: newLocal });
        const combined = `${code}${newLocal.startsWith(' ') || !newLocal ? newLocal : ' ' + newLocal}`;
        onChange(combined);
    };

    return (
        <div className={`flex w-full overflow-hidden items-center transition-colors ${className || 'bg-white/5 border border-white/10 rounded-xl focus-within:border-sky-500/50'}`}>
            <select
                value={code}
                onChange={handleCodeChange}
                className="h-full bg-transparent py-2 pl-3 pr-1 text-sm outline-none font-medium appearance-none cursor-pointer flex-shrink-0 border-r border-inherit"
                style={{ minWidth: '70px', color: 'inherit' }}
            >
                {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                        {c.name} ({c.code})
                    </option>
                ))}
            </select>
            <input
                {...props}
                type="tel"
                value={local}
                onChange={handleLocalChange}
                className="flex-1 px-3 py-2 text-sm outline-none bg-transparent font-medium"
                style={{ color: 'inherit' }}
            />
        </div>
    );
};
