// src/component/PasswordInput.tsx
import { FieldError, RegisterOptions, UseFormRegister, FieldValues, Path } from 'react-hook-form';
import { Eye, EyeOff, Lock } from 'lucide-react';

// どんなフォームの型(T)でも受け入れられるように修正
type PasswordInputProps<T extends FieldValues> = {
    label: string;
    name: Path<T>; // Tのキーのみ許可
    register: UseFormRegister<T>;
    registerRules?: RegisterOptions<T, Path<T>>;
    show: boolean;
    toggleShow: () => void;
    error?: FieldError;
};

const PasswordInput = <T extends FieldValues>({
    label,
    name,
    register,
    registerRules,
    show,
    toggleShow,
    error
}: PasswordInputProps<T>) => (
    <div className="mb-4">
        <label className="block text-sm font-bold text-gray-700 mb-1.5">{label}</label>
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Lock size={18} />
            </div>
            <input
                type={show ? "text" : "password"}
                {...register(name, registerRules)}
                className={`w-full pl-10 pr-10 py-3 rounded-xl border ${error ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200' : 'border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-500 focus:ring-emerald-200'} focus:ring-2 outline-none transition-all`}
                placeholder="••••••••"
            />
            <button
                type="button"
                onClick={toggleShow}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
            >
                {show ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
        </div>
        {error && <p className="mt-1 text-sm text-red-500 font-bold">{String(error.message)}</p>}
    </div>
);

export default PasswordInput;