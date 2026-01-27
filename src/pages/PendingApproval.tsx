import { Link } from "react-router-dom";
import { Eye, Clock, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export default function PendingApprovalPage() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
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

        <Card className="shadow-card text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warning/10">
              <Clock className="h-8 w-8 text-warning" />
            </div>
            <CardTitle className="text-2xl">Aguardando Aprovação</CardTitle>
            <CardDescription className="text-base">
              Seu cadastro foi recebido e está sendo analisado pela nossa equipe.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                Este processo geralmente leva até <strong>24 horas úteis</strong>. 
                Você receberá um email quando sua conta for aprovada.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>Verifique também sua caixa de spam</span>
            </div>

            <div className="space-y-3 pt-4">
              <Button variant="outline" className="w-full" onClick={handleLogout}>
                Sair da conta
              </Button>
              <Link to="/" className="block">
                <Button variant="ghost" className="w-full">
                  Voltar para a página inicial
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
