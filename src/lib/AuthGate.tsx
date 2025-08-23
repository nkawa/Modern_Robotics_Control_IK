"use client";
// /components/AuthGate.tsx
import React, { PropsWithChildren, useEffect } from "react";
import { useAuth } from "@/context/auth";
import { usePathname, useRouter } from "next/navigation";

import { logEnebular } from "@/lib/logEnebular";
import { userUUID } from './cookie_id';

// should run on client!

export default function AuthGate({ children }: PropsWithChildren) {
  const user = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Enabular に post したい
  //  logEnebular(pathName,'login','',


  useEffect(() => {
    if (user === null ) {
      // 未ログイン → /login へ
//      const next = encodeURIComponent(pathname || "/");
      router.replace("/");

    } else {

      //    console.log('AuthGate user:', user, userUUID);
      const now = new Date();
      if (user !== undefined && user.user != null) {
        console.log("AuthGate:User:", user);
        console.log("AuthGate:Log", pathname, 'login', user.user.kid, user.user.id, 'Login to ' + pathname, now.toLocaleString() + ":" + userUUID)
        logEnebular(pathname, 'login', user.user.kid, user.user.id, 'Login to ' + pathname, now.toLocaleString() + ":" + userUUID)

      } else {
        console.log("AuthGate: under working...");
      }
    }

  }, [user, router, pathname]);

  if (user === undefined) {
    // 取得中
    return (
      <div className="p-6 text-center">
        <span className="animate-pulse">Checking session…</span>
      </div>
    );
  }

  if (user === null) {
    // リダイレクト中は何も描画しない
    return null;
  }

  // ログイン済み
  return <>{children}</>;
}
// このコンポーネントは、ユーザーがログインしているかどうかを確認し、
// ログインしていない場合はログインページにリダイレクトします。
// ログイン状態が不明な場合は、ローディング状態を表示します。
