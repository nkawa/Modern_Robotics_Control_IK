import { Inter } from "next/font/google";
import 'bootstrap/dist/css/bootstrap.min.css'
import "./globals.css";
import {  codeType } from '../lib/MetaworkMQTT'

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "JAKA-control",
};

export default function RootLayout({ children }) {
  return (
    <html lang="jp">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
