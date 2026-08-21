import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"AI Commerce OS",description:"Build and operate AI-powered ecommerce businesses."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
