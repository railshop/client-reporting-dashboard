import { LoginForm } from '@/components/auth/LoginForm';

export function LoginPage() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3">
          <img
            src="/railshop-white.png"
            alt="Railshop"
            className="h-10"
          />
          <p className="text-text-3 font-mono text-[10px] uppercase tracking-[0.1em]">
            Client Reporting Dashboard
          </p>
        </div>
        <div className="bg-surface border border-border-v1 rounded-[14px] p-8 w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
