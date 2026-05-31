import {
  FieldError,
  RegisterOptions,
  UseFormRegister,
  FieldValues,
  Path,
} from "react-hook-form";
import { Eye, EyeOff, Lock } from "lucide-react";
import { colors, semantic, spacing, radius, fontSize } from "../styles/tokens";

type Props<T extends FieldValues> = {
  label: string;
  name: Path<T>;
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
  error,
}: Props<T>) => {
  const hasError = !!error;
  return (
    <div style={{ marginBottom: spacing[4] }}>
      <label
        style={{
          display: "block",
          fontSize: fontSize.sm,
          fontWeight: "700",
          color: semantic.textPrimary,
          marginBottom: spacing[1],
        }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            paddingLeft: spacing[3],
            display: "flex",
            alignItems: "center",
            pointerEvents: "none",
            color: semantic.textMuted,
          }}
        >
          <Lock size={18} />
        </div>
        <input
          type={show ? "text" : "password"}
          {...register(name, registerRules)}
          placeholder="••••••••"
          style={{
            width: "100%",
            paddingLeft: spacing[10],
            paddingRight: spacing[10],
            paddingTop: spacing[3],
            paddingBottom: spacing[3],
            borderRadius: radius.xl,
            border: `1px solid ${hasError ? colors.danger : colors.neutral200}`,
            backgroundColor: hasError ? colors.dangerBg : colors.neutral50,
            outline: "none",
            fontSize: fontSize.base,
            boxSizing: "border-box" as const,
          }}
        />
        <button
          type="button"
          onClick={toggleShow}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            right: 0,
            paddingRight: spacing[3],
            display: "flex",
            alignItems: "center",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: semantic.textMuted,
          }}
        >
          {show ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
      </div>
      {error && (
        <p
          style={{
            marginTop: spacing[1],
            fontSize: fontSize.sm,
            color: colors.danger,
            fontWeight: "700",
          }}
        >
          {String(error.message)}
        </p>
      )}
    </div>
  );
};

export default PasswordInput;
