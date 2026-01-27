import { UserPlus, Upload, Cpu, FileCheck } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Cadastre o Paciente",
    description:
      "Insira os dados do paciente ou busque um já cadastrado no sistema.",
  },
  {
    number: "02",
    icon: Upload,
    title: "Faça o Upload da Imagem",
    description:
      "Envie a imagem do exame (OCT ou Retinografia) em formatos JPG, PNG ou TIFF.",
  },
  {
    number: "03",
    icon: Cpu,
    title: "IA Analisa a Imagem",
    description:
      "Nossa IA identifica biomarcadores, mede estruturas e gera análise detalhada.",
  },
  {
    number: "04",
    icon: FileCheck,
    title: "Revise e Aprove o Laudo",
    description:
      "Confira os achados, adicione observações e aprove o laudo final.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="py-20 md:py-28 bg-muted/30">
      <div className="container">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Como Funciona
          </h2>
          <p className="text-lg text-muted-foreground">
            Um fluxo simples e intuitivo para obter laudos em poucos minutos.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line (Desktop) */}
          <div className="absolute left-1/2 top-20 hidden h-[calc(100%-160px)] w-0.5 -translate-x-1/2 bg-gradient-to-b from-primary via-primary/50 to-primary lg:block" />

          <div className="grid gap-12 lg:gap-0">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`relative flex flex-col lg:flex-row items-center gap-6 lg:gap-12 ${
                  index % 2 === 1 ? "lg:flex-row-reverse" : ""
                }`}
              >
                {/* Content */}
                <div
                  className={`flex-1 ${
                    index % 2 === 1 ? "lg:text-left" : "lg:text-right"
                  }`}
                >
                  <div
                    className={`inline-block ${
                      index % 2 === 1 ? "" : "lg:float-right"
                    }`}
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <span className="text-sm font-bold text-primary">
                        PASSO {step.number}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground max-w-sm">
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Icon Circle */}
                <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background">
                  <step.icon className="h-9 w-9" />
                </div>

                {/* Empty space for alternating layout */}
                <div className="hidden lg:block flex-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
