import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Loader2, ArrowLeft, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const UF_OPTIONS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA",
  "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN",
  "RO", "RR", "RS", "SC", "SE", "SP", "TO"
];

const SPECIALTY_OPTIONS = [
  { value: "oftalmologia", label: "Oftalmologia Geral" },
  { value: "retina", label: "Retina e Vítreo" },
  { value: "glaucoma", label: "Glaucoma" },
];

// Validation schemas
const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

const signupSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  fullName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  crm: z.string().min(4, "CRM inválido").max(10, "CRM inválido"),
  crmUf: z.string().length(2, "Selecione o estado do CRM"),
  specialty: z.enum(["oftalmologia", "retina", "glaucoma"], { 
    errorMap: () => ({ message: "Selecione uma especialidade" }) 
  }),
});

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "login";
  const [mode, setMode] = useState<"login" | "signup" | "forgot">(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState("");

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [crm, setCrm] = useState("");
  const [crmUf, setCrmUf] = useState("");
  const [specialty, setSpecialty] = useState("");

  // Check if already authenticated
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // Check if user has profile before redirecting
        checkProfileAndRedirect(session.user.id);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        checkProfileAndRedirect(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkProfileAndRedirect = async (userId: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("status")
      .eq("user_id", userId)
      .single();

    if (profile) {
      if (profile.status === "approved") {
        navigate("/dashboard");
      } else {
        navigate("/aguardando-aprovacao");
      }
    }
  };

  const clearErrors = () => {
    setErrors({});
    setSuccessMessage("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    setIsLoading(true);

    try {
      const validatedData = loginSchema.parse({ email, password });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setErrors({ form: "Email ou senha incorretos" });
        } else {
          setErrors({ form: error.message });
        }
        return;
      }

      if (data.user) {
        toast({
          title: "Login realizado com sucesso!",
          description: "Redirecionando...",
        });
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          if (error.path[0]) {
            fieldErrors[error.path[0] as string] = error.message;
          }
        });
        setErrors(fieldErrors);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    setIsLoading(true);

    try {
      const validatedData = signupSchema.parse({
        email,
        password,
        fullName,
        crm,
        crmUf,
        specialty,
      });

      const redirectUrl = `${window.location.origin}/`;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          setErrors({ form: "Este email já está cadastrado. Tente fazer login." });
        } else {
          setErrors({ form: authError.message });
        }
        return;
      }

      if (authData.user) {
        // Create profile
        const { error: profileError } = await supabase.from("profiles").insert({
          user_id: authData.user.id,
          full_name: validatedData.fullName,
          crm: validatedData.crm,
          crm_uf: validatedData.crmUf,
          specialty: validatedData.specialty as "oftalmologia" | "retina" | "glaucoma",
          status: "pending",
        });

        if (profileError) {
          console.error("Profile error:", profileError);
          setErrors({ form: "Erro ao criar perfil. Tente novamente." });
          return;
        }

        // Create user role
        await supabase.from("user_roles").insert({
          user_id: authData.user.id,
          role: "doctor",
        });

        toast({
          title: "Cadastro realizado com sucesso!",
          description: "Seu cadastro está pendente de aprovação.",
        });

        navigate("/aguardando-aprovacao");
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          if (error.path[0]) {
            fieldErrors[error.path[0] as string] = error.message;
          }
        });
        setErrors(fieldErrors);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    setIsLoading(true);

    try {
      const { email: validatedEmail } = z.object({ 
        email: z.string().email("Email inválido") 
      }).parse({ email });

      const { error } = await supabase.auth.resetPasswordForEmail(validatedEmail, {
        redirectTo: `${window.location.origin}/auth?mode=reset`,
      });

      if (error) {
        setErrors({ form: error.message });
        return;
      }

      setSuccessMessage("Email de recuperação enviado! Verifique sua caixa de entrada.");
    } catch (err) {
      if (err instanceof z.ZodError) {
        setErrors({ email: err.errors[0]?.message || "Email inválido" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-medical flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Eye className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold text-foreground">
            Ophtal<span className="text-primary">AI</span>
          </span>
        </Link>

        <Card className="shadow-card">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {mode === "login" && "Entrar"}
              {mode === "signup" && "Criar Conta"}
              {mode === "forgot" && "Recuperar Senha"}
            </CardTitle>
            <CardDescription>
              {mode === "login" && "Acesse sua conta para continuar"}
              {mode === "signup" && "Preencha os dados para se cadastrar"}
              {mode === "forgot" && "Digite seu email para recuperar a senha"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Error Message */}
            {errors.form && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{errors.form}</span>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="mb-4 p-3 rounded-lg bg-success/10 border border-success/20 flex items-center gap-2 text-sm text-success">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Login Form */}
            {mode === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={errors.email ? "border-destructive" : ""}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={errors.password ? "border-destructive" : ""}
                  />
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>

                <div className="text-center space-y-2 pt-4">
                  <button
                    type="button"
                    onClick={() => { setMode("forgot"); clearErrors(); }}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Esqueceu sua senha?
                  </button>
                  <p className="text-sm text-muted-foreground">
                    Não tem conta?{" "}
                    <button
                      type="button"
                      onClick={() => { setMode("signup"); clearErrors(); }}
                      className="text-primary font-medium hover:underline"
                    >
                      Cadastre-se
                    </button>
                  </p>
                </div>
              </form>
            )}

            {/* Signup Form */}
            {mode === "signup" && (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome Completo</Label>
                  <Input
                    id="fullName"
                    placeholder="Dr. João Silva"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={errors.fullName ? "border-destructive" : ""}
                  />
                  {errors.fullName && (
                    <p className="text-xs text-destructive">{errors.fullName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={errors.email ? "border-destructive" : ""}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={errors.password ? "border-destructive" : ""}
                  />
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="crm">CRM</Label>
                    <Input
                      id="crm"
                      placeholder="123456"
                      value={crm}
                      onChange={(e) => setCrm(e.target.value)}
                      className={errors.crm ? "border-destructive" : ""}
                    />
                    {errors.crm && (
                      <p className="text-xs text-destructive">{errors.crm}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="crmUf">UF do CRM</Label>
                    <Select value={crmUf} onValueChange={setCrmUf}>
                      <SelectTrigger className={errors.crmUf ? "border-destructive" : ""}>
                        <SelectValue placeholder="UF" />
                      </SelectTrigger>
                      <SelectContent>
                        {UF_OPTIONS.map((uf) => (
                          <SelectItem key={uf} value={uf}>
                            {uf}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.crmUf && (
                      <p className="text-xs text-destructive">{errors.crmUf}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specialty">Especialidade</Label>
                  <Select value={specialty} onValueChange={setSpecialty}>
                    <SelectTrigger className={errors.specialty ? "border-destructive" : ""}>
                      <SelectValue placeholder="Selecione sua especialidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPECIALTY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.specialty && (
                    <p className="text-xs text-destructive">{errors.specialty}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cadastrando...
                    </>
                  ) : (
                    "Criar Conta"
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground pt-4">
                  Já tem conta?{" "}
                  <button
                    type="button"
                    onClick={() => { setMode("login"); clearErrors(); }}
                    className="text-primary font-medium hover:underline"
                  >
                    Entrar
                  </button>
                </p>
              </form>
            )}

            {/* Forgot Password Form */}
            {mode === "forgot" && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={errors.email ? "border-destructive" : ""}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar Email de Recuperação"
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => { setMode("login"); clearErrors(); }}
                  className="flex items-center justify-center gap-2 w-full text-sm text-muted-foreground hover:text-foreground transition-colors pt-4"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar para o login
                </button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Back to home */}
        <p className="text-center mt-6">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Voltar para a página inicial
          </Link>
        </p>
      </div>
    </div>
  );
}
