"use client";

import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  const router = useRouter();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-xl font-bold">로그인</h1>
      <LoginForm
        onSuccess={() => {
          router.push("/");
          router.refresh();
        }}
      />
    </main>
  );
}
