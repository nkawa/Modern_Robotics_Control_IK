"use client";
import { createContext, ReactNode, useEffect, useState, useContext, useCallback } from 'react';

import type { AuthUser } from "@/types/user";

// コンテクスト用の型を定義
type AuthContextType = {
    user: AuthUser;
    loading: boolean;
    refresh: () => Promise<void>;
    logout: () => Promise<void>;
};
// コンテクストを作成
const AuthContext = createContext<AuthContextType>(undefined);

export default function AuthProvider({
    initialUser,
    children
}: {
    initialUser: AuthUser;
    children: ReactNode;
}) {
    // 配布したいデータの定義
    const [user, setUser] = useState<AuthUser>(initialUser);
    const [loading, setLoading] = useState(false);


    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/auth/me", {
                method: "GET",
                credentials: "include", // ← httpOnly クッキー同送
                cache: "no-store",
            });
            if (res.ok) {
                const data = await res.json();
                setUser(data.user?? null);
//		console.log("ME!",data)
            } else {
                setUser(null);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    const logout = useCallback(async () => {
        await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
        setUser(null);
    }, []);

    // 初期マウント時に最新を同期（任意）
    useEffect(() => {
        // すぐに再フェッチしたくない場合は削ってOK
        refresh();
    }, [refresh]);


    // プロバイダーを作成し、配布物を格納する
    return (
        <AuthContext.Provider value={{user, loading, refresh, logout}}>
            {children}
        </AuthContext.Provider>
    );
};

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}