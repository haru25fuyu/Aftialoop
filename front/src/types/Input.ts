export interface InputFieldProps {
    label: string;
    name: string;
    type?: string;
    placeholder?: string;
    onChange: (name: string, value: string) => void;
    helperText?: string;
};
