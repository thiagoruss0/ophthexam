import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Eye, Menu, X } from "lucide-react";
import { useState } from "react";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Eye className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">
            Ophtal<span className="text-primary">AI</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <a href="#beneficios" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Benefícios
          </a>
          <a href="#como-funciona" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Como Funciona
          </a>
          <a href="#exames" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Exames Suportados
          </a>
        </nav>

        {/* Desktop Auth Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Link to="/auth">
            <Button variant="ghost" size="sm">
              Entrar
            </Button>
          </Link>
          <Link to="/auth?mode=signup">
            <Button size="sm">
              Cadastrar-se
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <nav className="container py-4 flex flex-col gap-4">
            <a
              href="#beneficios"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setIsMenuOpen(false)}
            >
              Benefícios
            </a>
            <a
              href="#como-funciona"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setIsMenuOpen(false)}
            >
              Como Funciona
            </a>
            <a
              href="#exames"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setIsMenuOpen(false)}
            >
              Exames Suportados
            </a>
            <div className="flex flex-col gap-2 pt-4 border-t">
              <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                <Button variant="outline" className="w-full">
                  Entrar
                </Button>
              </Link>
              <Link to="/auth?mode=signup" onClick={() => setIsMenuOpen(false)}>
                <Button className="w-full">
                  Cadastrar-se
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
