import { Inter } from "next/font/google";
import 'bootstrap/dist/css/bootstrap.min.css'
import "./globals.css";
import {  codeType } from '../lib/MetaworkMQTT'
import AuthProvider  from '../context/auth';
import { getUserFromCookies } from "../lib/auth-server";


const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "JAKA-control",
};

export default async function RootLayout({ children }) {
  const user = await getUserFromCookies(); 
  console.log("Got User from cookie!", user);

  return (
    <html lang="jp">
      <body>
        <AuthProvider initialUser={user}>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
