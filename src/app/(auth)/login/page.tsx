'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, Eye, EyeOff, ArrowRight } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const errorParam = searchParams.get('error');

  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(errorParam || '');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, password }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(callbackUrl);
        router.refresh();
      } else {
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm animate-fade-in-up">
      {/* Logo & Header */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center space-x-2 mb-8 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground group-hover:scale-105 transition-transform">
            <span className="text-base font-bold text-background">W</span>
          </div>
          <span className="font-semibold text-lg group-hover:translate-x-0.5 transition-transform">WorkReport</span>
        </Link>
        <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Enter your credentials to access your account
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="flex items-center gap-2 p-4 text-sm bg-destructive/10 text-destructive rounded-xl animate-fade-in">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        <div className="space-y-2">
          <Label 
            htmlFor="employeeId" 
            className={`text-sm font-medium transition-colors ${focused === 'employeeId' ? 'text-foreground' : 'text-muted-foreground'}`}
          >
            Employee ID
          </Label>
          <Input
            id="employeeId"
            type="text"
            placeholder="Enter your employee ID"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            onFocus={() => setFocused('employeeId')}
            onBlur={() => setFocused(null)}
            required
            disabled={loading}
            autoComplete="username"
            className="h-12"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label 
              htmlFor="password" 
              className={`text-sm font-medium transition-colors ${focused === 'password' ? 'text-foreground' : 'text-muted-foreground'}`}
            >
              Password
            </Label>
            <Link
              href="/reset-password"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors link-hover"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
              required
              disabled={loading}
              autoComplete="current-password"
              className="h-12 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        
        <Button type="submit" className="w-full h-12 text-base btn-shine" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>
      
      <p className="text-center text-sm text-muted-foreground mt-8">
        Don&apos;t have an account?{' '}
        <span className="text-foreground font-medium">Contact your administrator</span>
      </p>
    </div>
  );
}

function LoginFormFallback() {
  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="inline-flex items-center space-x-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted animate-pulse" />
          <div className="h-5 w-24 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-7 w-40 bg-muted rounded mx-auto mb-2 animate-pulse" />
        <div className="h-4 w-56 bg-muted rounded mx-auto animate-pulse" />
      </div>
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="h-4 w-20 bg-muted rounded animate-pulse" />
          <div className="h-12 bg-muted rounded-lg animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-20 bg-muted rounded animate-pulse" />
          <div className="h-12 bg-muted rounded-lg animate-pulse" />
        </div>
        <div className="h-12 bg-muted rounded-lg animate-pulse" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-14">
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
