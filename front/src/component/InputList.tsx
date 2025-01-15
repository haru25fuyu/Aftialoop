import React from 'react';
import SingleForm from './SingleForm.tsx';
import { InputFieldProps } from '../types/input.ts';

// InputListProps を定義
type InputListProps = {
    inputs: InputFieldProps[]; // InputFieldProps の配列
    method: string;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
};

export const InputList: React.FC<InputListProps> = ({
    inputs,
    method,
    onSubmit,
}) => {
    return (
        <div>
            <form onSubmit={onSubmit} method={method}>
                {inputs.map((form) => (
                    <SingleForm key={form.label} {...form} />
                ))}
            </form>
        </div>
    );
};

export default InputList;