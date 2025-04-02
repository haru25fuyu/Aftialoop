import React from 'react'
import { InputFieldProps } from '../types/input';

export const InputField: React.FC<InputFieldProps> = ({
    label,
    name,
    type = 'text',
    placeholder = '',
    onChange = () => {},
    helperText,
}) => {
    return (
        <div className="input-field">
            <label htmlFor={name}>{label}</label>
            <input
                id={name}
                name={name}
                type={type}
                placeholder={placeholder}
                onChange={(e) => onChange(name, e.target.value)}
            />
            {helperText && <small>{helperText}</small>}
        </div>
    );
};

export default InputField;