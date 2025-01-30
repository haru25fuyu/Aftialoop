import { GoogleOAuthProvider } from '@react-oauth/google';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios'

import {NODE_API} from '../conf/config';

const handleLoginSuccess = (response: any) => {
    console.log('ログイン成功:', response);
    const token = { token: response.credential };
    // ここでレスポンスをサーバーに送信し、トークンを検証してユーザーを認証
    axios.post(NODE_API.URL + '/api/auth/google', token, { headers:NODE_API.HEADER }).then((res) => {
        console.log('ログイン成功:', res.data);
    }).catch((err) => {
        console.error('ログイン失敗:', err);
    })
};

const handleLoginFailure = (error: any) => {
    console.error('ログイン失敗:', error);
};

export const GoogleOAuth = () => {
    return (
        <GoogleOAuthProvider clientId="301597739219-5s828gi856ag0vng8e50hds2re77rj00.apps.googleusercontent.com">
            <GoogleLogin
                onSuccess={handleLoginSuccess}
                onError={handleLoginFailure}
                useOneTap
            />
        </GoogleOAuthProvider>
    );
};

export default GoogleOAuth;