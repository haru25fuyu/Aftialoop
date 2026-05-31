import React from 'react';
import { s } from '../styles/component/LoadingButton.styles';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean };

export const LoadingButton: React.FC<Props> = ({ loading, children, style, disabled, ...props }) => (
  <button
    {...props}
    disabled={loading || disabled}
    style={{ ...s.btn, ...(loading || disabled ? s.btnDisabled : {}), ...style }}
  >
    {loading && <div style={s.spinner} />}
    <span style={{ opacity: loading ? 0 : 1 }}>{children}</span>
  </button>
);
