"use client";
import dynamic from 'next/dynamic';
import { AppMode } from '../appmode.js';
import AuthGate from "../../lib/AuthGate";

const DynamicHome = dynamic(() => import('../home.js'), { ssr: false });

export default function Home() {
  return (
    // 認証は不要？（アクセスは記録したいよね。。)
    <AuthGate noauth={true}>
      <DynamicHome appmode={AppMode.monitor}/>
    </AuthGate>
  );
}
