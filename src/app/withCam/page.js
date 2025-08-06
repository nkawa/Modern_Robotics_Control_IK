"use client";
import dynamic from 'next/dynamic';
import { AppMode } from '../appmode.js';

const DynamicHome = dynamic(() => import('../home.js'), { ssr: false });

export default function Home() {
  return (
    <DynamicHome appmode={AppMode.withCam}/>
  );
}
