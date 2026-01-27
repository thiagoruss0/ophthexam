import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Brain, FileText } from "lucide-react";

const benefits = [
  {
    icon: Eye,
    title: "Análise de OCT Macular e Nervo Óptico",
    description:
      "Identifique alterações nas camadas retinianas, fluidos, drusas, e avalie a espessura da RNFL com precisão assistida por IA.",
    color: "primary",
  },
  {
    icon: Brain,
    title: "Detecção de Biomarcadores Automatizada",
    description:
      "A IA identifica e classifica biomarcadores como DEP, membranas epirretinianas, sinais de glaucoma e retinopatia diabética.",
    color: "success",
  },
  {
    icon: FileText,
    title: "Laudos Estruturados para Revisão",
    description:
      "Receba laudos organizados em seções claras, com achados, medidas, diagnósticos diferenciais e recomendações.",
    color: "warning",
  },
];

const colorClasses = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
};

export function BenefitsSection() {
  return (
    <section id="beneficios" className="py-20 md:py-28">
      <div className="container">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Por que escolher o OphtalAI?
          </h2>
          <p className="text-lg text-muted-foreground">
            Tecnologia avançada para otimizar seu fluxo de trabalho e auxiliar em diagnósticos mais precisos.
          </p>
        </div>

        {/* Benefits Cards */}
        <div className="grid gap-8 md:grid-cols-3">
          {benefits.map((benefit, index) => (
            <Card
              key={index}
              className="relative overflow-hidden border-0 shadow-card card-hover"
            >
              <CardHeader>
                <div
                  className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl ${
                    colorClasses[benefit.color as keyof typeof colorClasses]
                  }`}
                >
                  <benefit.icon className="h-7 w-7" />
                </div>
                <CardTitle className="text-xl">{benefit.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  {benefit.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
