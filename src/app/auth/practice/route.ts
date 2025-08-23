import { NextRequest, NextResponse } from "next/server";

import * as jose from 'jose';

// runs on server side..

import {decryptJwt, verifyToken, verifyCognitoToken } from "@/lib/jwt_proc";

/**
 * 引き継ぎ認証情報の型
 * `jose.JWTPayload`を継承
 * @property metawork_token: ワーカーアプリのアクセストークン
 * @property virtual_kominkan_token: バーチャル公民館のアクセストークン
 */
type ConnectedToken = jose.JWTPayload & {
  metawork_token: string;
  virtual_kominkan_token: string;
};


// GET リクエストハンドラ
export async function GET(req : NextRequest) {
    const token = req.nextUrl.searchParams.get('token');
 //   console.log("host is",req.headers.get('host'))
    //const basePath = req.nextUrl.basePath; // 例: "/docs" or ""
    const basePath = process.env.NEXT_BASE_PATH ?? "";

    console.log("PathName:", basePath)
    // console.log("nextUrl:", req.nextUrl)
 
    const url = new URL("https://"+req.headers.get('host')+basePath);
    //console.log("URL is :",url)
    const redirectError = (msg: string) =>
        NextResponse.redirect(new URL(basePath+ `/error?err=${encodeURIComponent(msg)}`, url.origin));
    //    console.log('token:', token);

    if (!token) {
        return redirectError("?error=missing!!token");
    }
    const decryptToken = await decryptJwt(token);
//    console.log('decryptToken:', decryptToken);

    if (!decryptToken) {
        return redirectError("?err=decryptError");
    }
    const { metawork_token, virtual_kominkan_token } = decryptToken as ConnectedToken;


    // メタワークトークンの有効性のチェック
    const jwtPayload = await verifyToken(metawork_token);
//    console.log('jwtPayload:', jwtPayload);

    if (!jwtPayload) {
        return redirectError("?err=jwtPayload");
    }

  // バーチャル公民館トークンが有効か検証
  const jwtCognitoPayload = await verifyCognitoToken(virtual_kominkan_token);
  // バーチャル公民館トークンの検証結果を判定
  if (!jwtCognitoPayload) {
    // バーチャル公民館トークンが無効な場合、エラーページにリダイレクト
    return redirectError("?err=cognitoDecryptError");
  }
    
    // トークンが有効な場合、AuthContextを設定すべき
    // ここでは、metawork_tokenをクッキーに保存して、/practiceへリダイレクト
    const mainURL = new URL("/jaka/practice/", url.origin)
    console.log("MainURL:",basePath, mainURL)

    const res = NextResponse.redirect(mainURL);

    res.cookies.set("worker_token", metawork_token, {
        httpOnly: true,
        sameSite: "lax",
        secure: true,           // ローカルで問題あれば一時的に false に
        path: "/",
        maxAge: 60 * 60,        // 例: 1時間
    });
    res.cookies.set("kominkan_token", virtual_kominkan_token, {
        httpOnly: true,
        sameSite: "lax",
        secure: true,           // ローカルで問題あれば一時的に false に
        path: "/",
        maxAge: 60 * 60,        // 例: 1時間
    });
    return res;

}
