

const PasswordDisplay = ({ password }: { password: string }) => {
    return <span>{'●'.repeat(password.length)}</span>;
};

export default PasswordDisplay;
// Compare this snippet from front/src/page/EditProfile.tsx: