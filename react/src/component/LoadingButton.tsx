import React from 'react';
import { Spinner } from './Spinner';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    loading?: boolean;
};

export const LoadingButton: React.FC<Props> = ({ loading, children, className, ...props }) => {
    return (
        <button
            {...props}
            disabled={loading || props.disabled}
            className={`relative flex justify-center items-center px-4 py-2 font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 ${className}`}
        >
            {loading && <Spinner size="sm" color="border-white" className="absolute" />}
            <span className={loading ? "opacity-0" : "opacity-100"}>{children}</span>
        </button>
    );
};