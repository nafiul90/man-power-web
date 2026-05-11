"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Leaf, Sprout } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const loginSchema = z.object({
  phone: z.string().min(1, "Phone number is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const { setUser } = useAuthStore();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setError("");
    try {
      const res = await api.post("/users/login", data);
      const { token, user } = res.data.data;
      setUser(user, token);
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg || "Login failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      {/* Left panel - decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-[var(--sidebar)] flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <Leaf
              key={i}
              className="absolute text-green-300"
              style={{
                width: `${40 + i * 20}px`,
                height: `${40 + i * 20}px`,
                top: `${10 + i * 15}%`,
                left: `${5 + i * 14}%`,
                transform: `rotate(${i * 30}deg)`,
              }}
            />
          ))}
        </div>
        <div className="relative z-10 text-center text-white">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Sprout className="w-16 h-16 text-[#74c69d]" />
          </div>
          <h1 className="text-4xl font-bold text-[#74c69d] mb-3">Man Power</h1>
          <p className="text-xl text-[#b7e4c7] mb-8">
            People People Management System
          </p>
          <div className="space-y-4 text-left max-w-xs">
            {[
              "Member Registration & Groups",
              "Instructor & Training Management",
              "Fund & Installment Tracking",
              "Comprehensive Reporting",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 text-[#d8f3dc]"
              >
                <div className="w-2 h-2 rounded-full bg-[#74c69d] shrink-0" />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Sprout className="w-8 h-8 text-[var(--primary)]" />
            <span className="text-2xl font-bold text-[var(--primary)]">
              Man Power
            </span>
          </div>

          <div className="bg-[var(--card)] rounded-2xl shadow-lg border border-[var(--card-border)] p-8">
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-1">
              Welcome back
            </h2>
            <p className="text-[var(--muted)] text-sm mb-8">
              Sign in to your account to continue
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Phone Number
                </label>
                <input
                  {...register("phone")}
                  type="tel"
                  placeholder="+8801XXXXXXXXX"
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
                />
                {errors.phone && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              >
                {isSubmitting ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-[var(--muted)] mt-6">
            People People Management System &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
