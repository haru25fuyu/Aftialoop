import React from 'react';
import SingleForm from './SingleForm.tsx';
import { InputFieldProps } from '../types/input.ts';

// InputListProps を定義
type InputListProps = {
    inputs: InputFieldProps[]; // InputFieldProps の配列
    url: string;
    method: string;
};

export const InputList: React.FC<InputListProps> = ({
    inputs,
    url,
    method,
}) => {
    return (
        <div>
            <form action={url} method={method}>
                {inputs.map((form) => (
                    <SingleForm key={form.label} {...form} />
                ))}
            </form>
        </div>
    );
};

export default InputList;