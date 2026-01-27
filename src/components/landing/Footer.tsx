import { Eye, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      {/* Medical Disclaimer */}
      <div className="container py-6">
        <div className="disclaimer flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">
              IMPORTANTE: Ferramenta de Auxílio Diagnóstico
            </p>
            <p className="text-sm opacity-90">
              Os laudos gerados pelo OphtalAI são preliminares e baseados em inteligência artificial. 
              Eles não substituem a avaliação clínica completa e requerem obrigatoriamente a validação 
              e assinatura de médico oftalmologista habilitado. A responsabilidade final pelo diagnóstico 
              e conduta clínica é exclusivamente do profissional médico.
            </p>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Eye className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">
                Ophtal<span className="text-primary">AI</span>
              </span>
            </Link>
            <p className="text-muted-foreground max-w-sm">
              Tecnologia de inteligência artificial para análise de imagens 
              oftalmológicas, auxiliando médicos em diagnósticos mais precisos e eficientes.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Links Rápidos</h4>
            <ul className="space-y-2">
              <li>
                <a href="#beneficios" className="text-muted-foreground hover:text-foreground transition-colors">
                  Benefícios
                </a>
              </li>
              <li>
                <a href="#como-funciona" className="text-muted-foreground hover:text-foreground transition-colors">
                  Como Funciona
                </a>
              </li>
              <li>
                <a href="#exames" className="text-muted-foreground hover:text-foreground transition-colors">
                  Exames Suportados
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/termos" className="text-muted-foreground hover:text-foreground transition-colors">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link to="/privacidade" className="text-muted-foreground hover:text-foreground transition-colors">
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link to="/auth" className="text-muted-foreground hover:text-foreground transition-colors">
                  Entrar
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t">
        <div className="container py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} OphtalAI. Todos os direitos reservados.</p>
          <p>Desenvolvido para profissionais da saúde ocular.</p>
        </div>
      </div>
    </footer>
  );
}
