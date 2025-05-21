//// トークンが期限切れかを確認する関数
//function isTokenExpired(token: string | null): boolean {
//  if (!token) return true; // トークンがない場合は期限切れとみなす
//  const payload = JSON.parse(atob(token.split(".")[1])); // JWTのペイロードをデコード
//  const exp = payload.exp * 1000; // JWTのexpは秒単位なのでミリ秒に変換
//  return Date.now() > exp; // 現在の時刻が`exp`を超えていれば期限切れ
//}
//
//module.exports = { isTokenExpired };