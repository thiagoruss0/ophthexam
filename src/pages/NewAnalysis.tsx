import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Upload,
  User,
  FileText,
  Image as ImageIcon,
  Search,
  Plus,
  X,
  Cpu,
} from "lucide-react";

type Step = 1 | 2 | 3 | 4;

interface Patient {
  id: string;
  name: string;
  birth_date?: string;
  record_number?: string;
}

const EQUIPMENT_OPTIONS = [
  "Zeiss Cirrus",
  "Heidelberg Spectralis",
  "Topcon Maestro",
  "Optovue Avanti",
  "Outro",
];

export default function NewAnalysisPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Step 1 - Patient
  const [patientSearch, setPatientSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: "",
    birth_date: "",
    gender: "",
    cpf: "",
    record_number: "",
    phone: "",
    notes: "",
  });

  // Step 2 - Exam
  const [examType, setExamType] = useState("");
  const [eye, setEye] = useState("");
  const [examDate, setExamDate] = useState(new Date().toISOString().split("T")[0]);
  const [equipment, setEquipment] = useState("");
  const [clinicalIndication, setClinicalIndication] = useState("");

  // Step 3 - Upload
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  // Step 4 - Confirmation
  const [confirmed, setConfirmed] = useState(false);

  // Search patients
  useEffect(() => {
    const searchPatients = async () => {
      if (patientSearch.length < 2) {
        setSearchResults([]);
        return;
      }

      const { data } = await supabase
        .from("patients")
        .select("id, name, birth_date, record_number")
        .eq("created_by", profile?.id)
        .ilike("name", `%${patientSearch}%`)
        .limit(5);

      setSearchResults(data || []);
    };

    const debounce = setTimeout(searchPatients, 300);
    return () => clearTimeout(debounce);
  }, [patientSearch, profile?.id]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      const validTypes = ["image/jpeg", "image/png", "image/tiff"];
      const maxSize = 20 * 1024 * 1024; // 20MB
      return validTypes.includes(file.type) && file.size <= maxSize;
    });

    if (validFiles.length !== files.length) {
      toast({
        title: "Alguns arquivos foram ignorados",
        description: "Use apenas JPG, PNG ou TIFF com até 20MB.",
        variant: "destructive",
      });
    }

    setUploadedFiles((prev) => [...prev, ...validFiles]);

    // Generate previews
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews((prev) => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!profile?.id) return;

    setIsLoading(true);
    setIsAnalyzing(true);

    try {
      // 1. Create or use existing patient
      let patientId = selectedPatient?.id;

      if (isNewPatient) {
        const { data: newPatientData, error: patientError } = await supabase
          .from("patients")
          .insert({
            ...newPatient,
            created_by: profile.id,
          })
          .select("id")
          .single();

        if (patientError) throw patientError;
        patientId = newPatientData.id;
      }

      if (!patientId) throw new Error("Paciente não selecionado");

      // 2. Create exam
      const { data: examData, error: examError } = await supabase
        .from("exams")
        .insert([{
          patient_id: patientId,
          doctor_id: profile.id,
          exam_type: examType as "oct_macular" | "oct_nerve" | "retinography",
          eye: eye as "od" | "oe" | "both",
          exam_date: examDate,
          equipment: equipment,
          clinical_indication: clinicalIndication,
          status: "analyzing" as const,
        }])
        .select("id")
        .single();

      if (examError) throw examError;

      // 3. Upload images
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        const fileExt = file.name.split(".").pop();
        const fileName = `${examData.id}/${Date.now()}_${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("exam-images")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("exam-images")
          .getPublicUrl(fileName);

        // Save image reference
        const imageEye = eye === "both" ? (i === 0 ? "od" : "oe") : eye;
        await supabase.from("exam_images").insert([{
          exam_id: examData.id,
          image_url: urlData.publicUrl,
          eye: imageEye as "od" | "oe" | "both",
          sequence: i + 1,
        }]);
      }

      // 4. Call AI analysis edge function
      const { error: analysisError } = await supabase.functions.invoke("analyze-image", {
        body: { exam_id: examData.id },
      });

      if (analysisError) {
        console.error("Analysis error:", analysisError);
        // Continue even if analysis fails - user can retry later
      }

      toast({
        title: "Análise iniciada!",
        description: "Redirecionando para visualização do exame...",
      });

      navigate(`/exame/${examData.id}`);
    } catch (error) {
      console.error("Error creating exam:", error);
      toast({
        title: "Erro ao criar exame",
        description: "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsAnalyzing(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return selectedPatient || (isNewPatient && newPatient.name.length >= 3);
      case 2:
        return examType && eye && examDate;
      case 3:
        return uploadedFiles.length > 0;
      case 4:
        return confirmed;
      default:
        return false;
    }
  };

  const steps = [
    { number: 1, label: "Paciente", icon: User },
    { number: 2, label: "Exame", icon: FileText },
    { number: 3, label: "Upload", icon: ImageIcon },
    { number: 4, label: "Confirmar", icon: Check },
  ];

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold">Nova Análise</h1>
          <p className="text-muted-foreground">
            Siga as etapas para criar uma nova análise de imagem
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div
                  className={`flex items-center justify-center h-10 w-10 rounded-full border-2 ${
                    currentStep >= step.number
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-muted-foreground/30 text-muted-foreground"
                  }`}
                >
                  {currentStep > step.number ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={`ml-2 text-sm font-medium hidden sm:block ${
                    currentStep >= step.number ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
                {index < steps.length - 1 && (
                  <div
                    className={`h-0.5 w-8 sm:w-16 mx-2 sm:mx-4 ${
                      currentStep > step.number ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <Progress value={(currentStep / 4) * 100} className="h-1" />
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle>
              {currentStep === 1 && "Selecione o Paciente"}
              {currentStep === 2 && "Informações do Exame"}
              {currentStep === 3 && "Upload da Imagem"}
              {currentStep === 4 && "Confirmar e Analisar"}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && "Busque um paciente existente ou cadastre um novo"}
              {currentStep === 2 && "Preencha os dados do exame a ser analisado"}
              {currentStep === 3 && "Envie a imagem do exame em JPG, PNG ou TIFF"}
              {currentStep === 4 && "Revise os dados e inicie a análise com IA"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Step 1 - Patient */}
            {currentStep === 1 && (
              <div className="space-y-6">
                {!isNewPatient ? (
                  <>
                    <div className="space-y-2">
                      <Label>Buscar Paciente</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Digite o nome do paciente..."
                          value={patientSearch}
                          onChange={(e) => setPatientSearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {searchResults.length > 0 && (
                      <div className="border rounded-lg divide-y">
                        {searchResults.map((patient) => (
                          <button
                            key={patient.id}
                            onClick={() => {
                              setSelectedPatient(patient);
                              setPatientSearch("");
                              setSearchResults([]);
                            }}
                            className="w-full p-3 text-left hover:bg-muted/50 transition-colors"
                          >
                            <p className="font-medium">{patient.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {patient.record_number && `Prontuário: ${patient.record_number}`}
                              {patient.birth_date && ` • Nasc: ${new Date(patient.birth_date).toLocaleDateString("pt-BR")}`}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}

                    {selectedPatient && (
                      <div className="p-4 border rounded-lg bg-muted/30 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{selectedPatient.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Paciente selecionado
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPatient(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    <div className="text-center py-4">
                      <p className="text-muted-foreground mb-2">Paciente não encontrado?</p>
                      <Button variant="outline" onClick={() => setIsNewPatient(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Cadastrar Novo Paciente
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Novo Paciente</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsNewPatient(false)}
                      >
                        Cancelar
                      </Button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2 space-y-2">
                        <Label htmlFor="name">Nome Completo *</Label>
                        <Input
                          id="name"
                          value={newPatient.name}
                          onChange={(e) =>
                            setNewPatient({ ...newPatient, name: e.target.value })
                          }
                          placeholder="Nome completo do paciente"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="birth_date">Data de Nascimento</Label>
                        <Input
                          id="birth_date"
                          type="date"
                          value={newPatient.birth_date}
                          onChange={(e) =>
                            setNewPatient({ ...newPatient, birth_date: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="gender">Sexo</Label>
                        <Select
                          value={newPatient.gender}
                          onValueChange={(v) =>
                            setNewPatient({ ...newPatient, gender: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="M">Masculino</SelectItem>
                            <SelectItem value="F">Feminino</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="record_number">Nº Prontuário</Label>
                        <Input
                          id="record_number"
                          value={newPatient.record_number}
                          onChange={(e) =>
                            setNewPatient({ ...newPatient, record_number: e.target.value })
                          }
                          placeholder="Número do prontuário"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefone</Label>
                        <Input
                          id="phone"
                          value={newPatient.phone}
                          onChange={(e) =>
                            setNewPatient({ ...newPatient, phone: e.target.value })
                          }
                          placeholder="(00) 00000-0000"
                        />
                      </div>

                      <div className="sm:col-span-2 space-y-2">
                        <Label htmlFor="notes">Observações Clínicas</Label>
                        <Textarea
                          id="notes"
                          value={newPatient.notes}
                          onChange={(e) =>
                            setNewPatient({ ...newPatient, notes: e.target.value })
                          }
                          placeholder="Informações relevantes sobre o paciente"
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2 - Exam */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Tipo de Exame *</Label>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { value: "oct_macular", label: "OCT Macular", desc: "Análise de mácula e camadas retinianas" },
                      { value: "oct_nerve", label: "OCT Nervo Óptico", desc: "Análise de RNFL e disco óptico" },
                      { value: "retinography", label: "Retinografia", desc: "Fundo de olho completo" },
                    ].map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setExamType(type.value)}
                        className={`p-4 border rounded-lg text-left transition-all ${
                          examType === type.value
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "hover:border-muted-foreground/50"
                        }`}
                      >
                        <p className="font-medium">{type.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{type.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Olho *</Label>
                  <div className="flex gap-3">
                    {[
                      { value: "od", label: "OD (Direito)" },
                      { value: "oe", label: "OE (Esquerdo)" },
                      { value: "both", label: "Ambos" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setEye(opt.value)}
                        className={`flex-1 p-3 border rounded-lg font-medium transition-all ${
                          eye === opt.value
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "hover:border-muted-foreground/50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="examDate">Data do Exame *</Label>
                    <Input
                      id="examDate"
                      type="date"
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="equipment">Equipamento</Label>
                    <Select value={equipment} onValueChange={setEquipment}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o equipamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {EQUIPMENT_OPTIONS.map((eq) => (
                          <SelectItem key={eq} value={eq}>
                            {eq}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clinicalIndication">Indicação Clínica</Label>
                  <Textarea
                    id="clinicalIndication"
                    value={clinicalIndication}
                    onChange={(e) => setClinicalIndication(e.target.value)}
                    placeholder="Suspeita diagnóstica, motivo do exame..."
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Step 3 - Upload */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div
                  className="border-2 border-dashed rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => document.getElementById("fileInput")?.click()}
                >
                  <input
                    id="fileInput"
                    type="file"
                    accept="image/jpeg,image/png,image/tiff"
                    multiple={eye === "both"}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="font-medium mb-1">
                    Arraste a imagem ou clique para selecionar
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Formatos: JPG, PNG, TIFF • Máximo: 20MB
                    {eye === "both" && " • Você pode enviar 2 imagens"}
                  </p>
                </div>

                {previews.length > 0 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {previews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-48 object-cover rounded-lg border"
                        />
                        <button
                          onClick={() => removeFile(index)}
                          className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded">
                          {eye === "both"
                            ? index === 0
                              ? "OD (Direito)"
                              : "OE (Esquerdo)"
                            : eye === "od"
                            ? "OD (Direito)"
                            : "OE (Esquerdo)"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 4 - Confirmation */}
            {currentStep === 4 && (
              <div className="space-y-6">
                {isAnalyzing ? (
                  <div className="text-center py-12">
                    <div className="relative mx-auto w-20 h-20 mb-6">
                      <Cpu className="h-12 w-12 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary animate-pulse" />
                      <div className="absolute inset-0 border-4 border-primary/30 rounded-full" />
                      <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Analisando Imagem...</h3>
                    <p className="text-muted-foreground">
                      A IA está identificando biomarcadores e estruturas. Aguarde...
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                      <h3 className="font-medium">Resumo da Análise</h3>
                      <div className="grid gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Paciente:</span>
                          <span className="font-medium">
                            {selectedPatient?.name || newPatient.name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tipo de Exame:</span>
                          <span className="font-medium">
                            {examType === "oct_macular"
                              ? "OCT Macular"
                              : examType === "oct_nerve"
                              ? "OCT Nervo Óptico"
                              : "Retinografia"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Olho:</span>
                          <span className="font-medium">
                            {eye === "od" ? "OD (Direito)" : eye === "oe" ? "OE (Esquerdo)" : "Ambos"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Data do Exame:</span>
                          <span className="font-medium">
                            {new Date(examDate).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Imagens:</span>
                          <span className="font-medium">{uploadedFiles.length} arquivo(s)</span>
                        </div>
                      </div>
                    </div>

                    {previews.length > 0 && (
                      <div className="flex gap-4 overflow-x-auto pb-2">
                        {previews.map((preview, index) => (
                          <img
                            key={index}
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="h-24 w-24 object-cover rounded-lg border flex-shrink-0"
                          />
                        ))}
                      </div>
                    )}

                    <div className="flex items-start space-x-3 p-4 border rounded-lg">
                      <Checkbox
                        id="confirm"
                        checked={confirmed}
                        onCheckedChange={(checked) => setConfirmed(checked === true)}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor="confirm"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Confirmo que os dados e imagens estão corretos
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Ao confirmar, a análise por IA será iniciada automaticamente.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        {!isAnalyzing && (
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev))}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Anterior
            </Button>

            {currentStep < 4 ? (
              <Button
                onClick={() => setCurrentStep((prev) => (prev < 4 ? ((prev + 1) as Step) : prev))}
                disabled={!canProceed()}
              >
                Próximo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!canProceed() || isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Cpu className="h-4 w-4 mr-2" />
                    Iniciar Análise com IA
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
