import * as jose from 'jose';

// runs on server side..


// トークン復号関数
/**
 * 受け取った認証情報を復号化
 * @param text: 受け取った認証情報
 * @returns 復号化したトークン (エラーの場合は null )
 */
export const decryptJwt = async (text) => {
    const SSO_JOSE_SECRET = process.env.SSO_JOSE_SECRET;
    console.log('SSO_JOSE_SECRET:', SSO_JOSE_SECRET);
    if (!SSO_JOSE_SECRET) {
        console.log("SSO_JOSE_SECRET is not set. please set it in .env.local");
        return null;
    }

    const secret = jose.base64url.decode(SSO_JOSE_SECRET);
    //  console.log('secret:', secret);
    const { payload } = await jose.jwtDecrypt(text, secret);
    return payload;
}


// JWT 検証関数
/**
 * ワーカーアプリトークンの検証
 *  @param token: ワーカーアプリトークン
 *  @return: 検証後のデコードされた情報 (エラーの場合は null )
*/
export const verifyToken = async (token: string | null) => {
    try {
        const SSO_KEYCLOAK_URL = process.env.SSO_KEYCLOAK_URL;
        const SSO_KEYCLOAK_REALM = process.env.SSO_KEYCLOAK_REALM;
        if (!token || !SSO_KEYCLOAK_URL || !SSO_KEYCLOAK_REALM) {
            console.log("Token or SSO_KEYCLOAK_URL or SSO_KEYCLOAK_REALM is not set.");
            return null;
        }

        const JWKS_URL = `${SSO_KEYCLOAK_URL}/realms/${SSO_KEYCLOAK_REALM}/protocol/openid-connect/certs`;
        const JWKS = jose.createRemoteJWKSet(new URL(JWKS_URL));
//        console.log('JWKS_URL:', JWKS_URL);
        const { payload } = await jose.jwtVerify(token, JWKS);

        return payload;
    } catch (error) {
        console.log('JWT ERR:', error.reason , error.payload);
//        console.error('JWT verification failed:', error);
        // 本来は null を返すべきだが、エラー情報を返す
        return error.payload || null; // エラー時でも payload を返す
    }
}

/**
 * バーチャル公民館トークンの検証
 *  @param token: バーチャル公民館トークン
 *  @return: 検証後のデコードされた情報 (エラーの場合は null )
*/
export const verifyCognitoToken = async (token: string | null) => {
  try {
    // 環境変数を取得
    const SSO_COGNITO_ISSUER = process.env.SSO_COGNITO_ISSUER;
    // 環境変数が取得できたか判定
    if (!token || !SSO_COGNITO_ISSUER) {
      // 環境変数が取得できていない場合、エラー
      return null;
    }

    // Amazon Cognito の JWKS エンドポイント
    const JWKS_URL = `${SSO_COGNITO_ISSUER}/.well-known/jwks.json`;
    const JWKS = jose.createRemoteJWKSet(new URL(JWKS_URL));

    console.log("Check Cognitio:",JWKS_URL, JWKS)

    // JWT 検証
    const { payload } = await jose.jwtVerify(token, JWKS);
    console.log("got payload",payload)

    return payload;
  } catch(error) {
    //console.error('JWT Cognito verification failed:', error);
    console.log('JWT Cognito Err:', error.reason, error.payload);
    return error.payload || null; // エラー時でも payload を返す
  }
}
