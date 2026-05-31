import React from "react";
import { s } from "../styles/component/Spinner.styles";

type SpinnerProps = { size?: "sm" | "md" | "lg" };

export const Spinner: React.FC<SpinnerProps> = ({ size = "md" }) => (
  <div style={s.wrap}>
    <div style={s.spinner(size)} />
  </div>
);
