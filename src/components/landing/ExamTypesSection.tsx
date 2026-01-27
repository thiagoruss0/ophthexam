import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, CircleDot, Camera } from "lucide-react";

const examTypes = [
  {
    icon: Layers,
    badge: "OCT",
    badgeClass: "exam-oct-macular",
    title: "OCT Macular",
    description:
      "Análise completa das camadas retinianas: MLI, CFNR, CCG, zonas plexiformes e nucleares, EPR, membrana de Bruch e coroide.",
    features: [
      "Detecção de fluidos (intra e sub-retiniano)",
      "Identificação de drusas e DEP",
      "Membranas epirretinianas",
      "Medidas de espessura foveal",
    ],
  },
  {
    icon: CircleDot,
    badge: "RNFL",
    badgeClass: "exam-oct-nerve",
    title: "OCT Nervo Óptico",
    description:
      "Avaliação detalhada da camada de fibras nervosas da retina, disco óptico e células ganglionares para rastreamento de glaucoma.",
    features: [
      "Espessura RNFL por quadrantes",
      "Relação escavação/disco (C/D)",
      "Análise do anel neurorretiniano",
      "Classificação de risco para glaucoma",
    ],
  },
  {
    icon: Camera,
    badge: "Retino",
    badgeClass: "exam-retinography",
    title: "Retinografia Colorida",
    description:
      "Análise completa do fundo de olho incluindo disco óptico, mácula, vasos retinianos e periferia visível.",
    features: [
      "Avaliação do disco óptico (regra ISNT)",
      "Detecção de hemorragias e exsudatos",
      "Classificação de retinopatia diabética",
      "Análise de cruzamentos AV",
    ],
  },
];

export function ExamTypesSection() {
  return (
    <section id="exames" className="py-20 md:py-28">
      <div className="container">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Exames Suportados
          </h2>
          <p className="text-lg text-muted-foreground">
            Análise especializada para os principais tipos de exames oftalmológicos.
          </p>
        </div>

        {/* Exam Type Cards */}
        <div className="grid gap-8 lg:grid-cols-3">
          {examTypes.map((exam, index) => (
            <Card
              key={index}
              className="relative overflow-hidden border shadow-card card-hover"
            >
              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                    <exam.icon className="h-6 w-6 text-foreground" />
                  </div>
                  <Badge variant="outline" className={exam.badgeClass}>
                    {exam.badge}
                  </Badge>
                </div>
                <CardTitle className="text-xl">{exam.title}</CardTitle>
                <CardDescription className="text-base">
                  {exam.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {exam.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
