import React from "react";
const PasswordDisplay = ({ password }: { password: string }) => <span>{"●".repeat(password.length)}</span>;
export default PasswordDisplay;
