import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Resolver } from "react-hook-form";
import { Activity, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useLogin } from "@/lib/queries";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api-client";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";

// ── Validation ────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  username: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});
type LoginForm = z.infer<typeof loginSchema>;

// ── Doctor image (add the file at this path) ──────────────────────────────────
// If the asset is missing Vite will throw a build error — move the file to
// src/assets/images/ or update the path below.
import doctorImg from "@/assets/images/01ae675a461efa0e5b97da06f016e81c.jpg.jpeg";

// ── Component ─────────────────────────────────────────────────────────────────

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const loginMutation = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema) as Resolver<LoginForm>,
    defaultValues: { username: "", password: "" },
  });

  function onSubmit(values: LoginForm) {
    loginMutation.mutate(values, {
      onSuccess: (data) => {
        login(data.accessToken);
      },
      onError: (err) => {
        const message =
          err instanceof ApiError && err.status === 401
            ? "Invalid username or password."
            : err instanceof ApiError
              ? err.message
              : "Login failed. Please try again.";
        toast({
          title: "Access denied",
          description: message,
          variant: "destructive",
        });
      },
    });
  }

  return (
    <div className="min-h-screen flex dashboard-bg">

      {/* ═══════════════════════════════════════════════════════════════
          LEFT PANEL — desktop only
      ════════════════════════════════════════════════════════════════ */}
      <div
        className="hidden md:flex md:w-1/2 relative flex-col p-12 lg:p-16 overflow-hidden"
        style={{
          background:
            "linear-gradient(to top right, #0e1c26, #162d3e, #25455d)",
        }}
      >
        {/* ── Background: ambient radial glows ── */}
        <div
          className="pointer-events-none absolute -top-40 -right-40 rounded-full"
          style={{
            width: 500,
            height: 500,
            background: "radial-gradient(circle, rgba(74,133,164,0.15), transparent 70%)",
            filter: "blur(120px)",
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-20 rounded-full"
          style={{
            width: 400,
            height: 400,
            background: "radial-gradient(circle, rgba(16,185,129,0.05), transparent 70%)",
            filter: "blur(100px)",
          }}
        />

        {/* ── Background: blueprint grid mesh ── */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* ── TOP: Secure Gateway badge ── */}
        <div className="relative z-10 flex items-center gap-2">
          <span
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-200 border border-white/10 rounded-full px-3.5 py-1.5 shadow-sm"
            style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(12px)" }}
          >
            <ShieldCheck className="h-3 w-3 text-emerald-400" />
            Secure Gateway
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </span>
        </div>

        {/* ── CENTER: Floating portrait card ── */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8 select-none">
          <div
            className="pointer-events-auto relative w-full overflow-hidden"
            style={{
              maxWidth: 320,
              aspectRatio: "4 / 5",
              background: "linear-gradient(to bottom, #b3cee5, #8eb0cc)",
              borderRadius: "2.5rem",
              boxShadow: "0 25px 60px -15px rgba(0,0,0,0.55), 0 0 0 4px rgba(71,85,105,0.45)",
              border: "4px solid rgba(71,85,105,0.5)",
            }}
          >
            {/* Bottom shade overlay */}
            <div
              className="absolute inset-0 z-10 pointer-events-none"
              style={{
                background:
                  "linear-gradient(to top, rgba(2,6,23,0.22) 0%, transparent 55%)",
              }}
            />

            {/* Doctor illustration */}
            <div
              className="absolute inset-0 transition-all duration-700 ease-out hover:scale-105"
              style={{
                backgroundImage: `url(${doctorImg})`,
                backgroundSize: "contain",
                backgroundPosition: "center bottom",
                backgroundRepeat: "no-repeat",
              }}
            />

            {/* Light reflection sheen */}
            <div
              className="absolute inset-0 z-10 pointer-events-none"
              style={{
                background:
                  "linear-gradient(to top right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.15) 100%)",
              }}
            />
          </div>
        </div>

        {/* ── BOTTOM: Brand identity ── */}
        <div className="relative z-10 mt-auto space-y-6 max-w-sm">
          {/* Brand name row */}
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" style={{ color: "#8eb0cc" }} />
              <span
                className="text-2xl font-black tracking-widest uppercase text-white drop-shadow-md"
                style={{ fontFamily: "sans-serif" }}
              >
                JOTESS
              </span>
            </div>
            <span
              className="block text-xs font-bold uppercase pl-7 mt-0.5"
              style={{ letterSpacing: "0.3em", color: "#8eb0cc" }}
            >
              Eye Specialist
            </span>
            <div
              className="mt-2.5 ml-7 rounded-full"
              style={{ width: 48, height: 4, background: "#4a85a4" }}
            />
          </div>

          {/* System portal tag */}
          <div
            className="pl-7 text-[11px] font-mono tracking-wider"
            style={{
              borderTop: "1px solid rgba(255,255,255,0.1)",
              paddingTop: 16,
              color: "#94a3b8",
            }}
          >
            SYSTEM PORTAL v3.0
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          RIGHT PANEL — login form
      ════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-[380px] space-y-8">

          {/* Mobile logo (hidden on desktop — left panel covers it) */}
          <div className="flex items-center gap-2 md:hidden">
            <Activity className="h-5 w-5 text-[#4a85a4]" />
            <span className="text-lg font-black tracking-widest uppercase text-slate-800">
              JOTESS <span className="font-normal text-[#4a85a4]">Eye Specialist</span>
            </span>
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <h1 className="text-[1.75rem] font-bold tracking-tight text-slate-900 leading-tight">
              Welcome back
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              Sign in to your JotessEyeSpecialist account to continue.
            </p>
          </div>

          {/* Form */}
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-5"
            >
              {/* Username / email */}
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                      Username or Email
                    </FormLabel>
                    <FormControl>
                      <input
                        {...field}
                        autoComplete="username"
                        placeholder="Enter your username or email"
                        data-testid="input-username"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200"
                        style={
                          form.formState.errors.username
                            ? { borderColor: "#ef4444", boxShadow: "0 0 0 3px rgba(239,68,68,0.12)" }
                            : undefined
                        }
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "#4a85a4";
                          e.currentTarget.style.boxShadow  = "0 0 0 4px rgba(74,133,164,0.15)";
                          e.currentTarget.style.background = "#ffffff";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = form.formState.errors.username ? "#ef4444" : "#e2e8f0";
                          e.currentTarget.style.boxShadow  = form.formState.errors.username ? "0 0 0 3px rgba(239,68,68,0.12)" : "none";
                          e.currentTarget.style.background = "#f8fafc";
                        }}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                      Password
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          placeholder="Enter your password"
                          data-testid="input-password"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 pr-12 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200"
                          style={
                            form.formState.errors.password
                              ? { borderColor: "#ef4444", boxShadow: "0 0 0 3px rgba(239,68,68,0.12)" }
                              : undefined
                          }
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = "#4a85a4";
                            e.currentTarget.style.boxShadow  = "0 0 0 4px rgba(74,133,164,0.15)";
                            e.currentTarget.style.background = "#ffffff";
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = form.formState.errors.password ? "#ef4444" : "#e2e8f0";
                            e.currentTarget.style.boxShadow  = form.formState.errors.password ? "0 0 0 3px rgba(239,68,68,0.12)" : "none";
                            e.currentTarget.style.background = "#f8fafc";
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#4a85a4] transition-colors duration-150 focus:outline-none"
                          tabIndex={-1}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword
                            ? <EyeOff className="h-4 w-4" />
                            : <Eye    className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Submit */}
              <div className="pt-1">
                <Button
                  type="submit"
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                  className="w-full rounded-2xl py-3.5 text-sm font-semibold tracking-wide text-white border-0 transition-all duration-200"
                  style={{
                    background: loginMutation.isPending
                      ? "#7aa8c0"
                      : "linear-gradient(135deg, #4a85a4 0%, #25455d 100%)",
                    boxShadow: loginMutation.isPending
                      ? "none"
                      : "0 4px 24px -4px rgba(74,133,164,0.5)",
                  }}
                  onMouseEnter={(e) => {
                    if (!loginMutation.isPending) {
                      (e.currentTarget as HTMLButtonElement).style.boxShadow =
                        "0 6px 30px -4px rgba(74,133,164,0.65)";
                      (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                      "0 4px 24px -4px rgba(74,133,164,0.5)";
                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                  }}
                >
                  {loginMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="h-4 w-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          cx="12" cy="12" r="10"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeOpacity="0.3"
                        />
                        <path
                          d="M12 2a10 10 0 0 1 10 10"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      </svg>
                      Signing in…
                    </span>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </div>
            </form>
          </Form>

          {/* Footer note */}
          <p className="text-center text-[11px] text-slate-400 tracking-wide">
            JotessEyeSpecialist Clinical Management System
          </p>
        </div>
      </div>
    </div>
  );
}