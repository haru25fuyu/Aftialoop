import React from 'react';

type SpinnerProps = {
    size?: 'sm' | 'md' | 'lg';
    color?: string;
    className?: string;
};

export const Spinner: React.FC<SpinnerProps> = ({
    size = 'md',
    color = 'border-indigo-600',
    className = ''
}) => {
    // サイズごとのクラス定義
    const sizeClasses = {
        sm: 'h-4 w-4 border-2',
        md: 'h-8 w-8 border-3',
        lg: 'h-12 w-12 border-4',
    };

    return (
        <div className={`flex justify-center items-center ${className}`}>
            <div
                className={`
          animate-spin rounded-full 
          ${sizeClasses[size]} 
          ${color} 
          border-t-transparent
        `}
            />
        </div>
    );
};