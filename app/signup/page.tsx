import Link from "next/link";
import { AuthFrame } from "@/components/auth-form";
import { SignupForm } from "@/components/signup-form";
export default function SignupPage(){return <AuthFrame title="Create your account" subtitle="Start with a secure workspace for your commerce team."><SignupForm/><p className="mt-5 text-center text-sm text-muted">Already registered? <Link href="/login" className="font-semibold text-brand-600">Sign in</Link></p></AuthFrame>}
