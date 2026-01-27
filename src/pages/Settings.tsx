import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Building, FileText, Settings } from "lucide-react";

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Profile state
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");

  // Clinic state
  const [clinicName, setClinicName] = useState(profile?.clinic_name || "");
  const [clinicAddress, setClinicAddress] = useState(profile?.clinic_address || "");
  const [clinicPhone, setClinicPhone] = useState(profile?.clinic_phone || "");
  const [clinicCnpj, setClinicCnpj] = useState(profile?.clinic_cnpj || "");

  // Report preferences
  const [includeLogo, setIncludeLogo] = useState(profile?.include_logo_in_pdf ?? true);
  const [includeSignature, setIncludeSignature] = useState(profile?.include_signature_in_pdf ?? true);
  const [defaultTemplate, setDefaultTemplate] = useState(profile?.default_report_template || "");

  // Preferences
  const [emailNotifications, setEmailNotifications] = useState(profile?.email_notifications ?? true);

  const handleSaveProfile = async () => {
    if (!profile?.id) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone,
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast({ title: "Perfil atualizado!" });
      refreshProfile();
    } catch (error) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveClinic = async () => {
    if (!profile?.id) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          clinic_name: clinicName,
          clinic_address: clinicAddress,
          clinic_phone: clinicPhone,
          clinic_cnpj: clinicCnpj,
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast({ title: "Dados da clínica atualizados!" });
      refreshProfile();
    } catch (error) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveReportPrefs = async () => {
    if (!profile?.id) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          include_logo_in_pdf: includeLogo,
          include_signature_in_pdf: includeSignature,
          default_report_template: defaultTemplate,
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast({ title: "Preferências de laudo atualizadas!" });
      refreshProfile();
    } catch (error) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!profile?.id) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          email_notifications: emailNotifications,
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast({ title: "Preferências atualizadas!" });
      refreshProfile();
    } catch (error) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container py-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">Configurações</h1>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4 hidden sm:inline" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="clinic" className="gap-2">
              <Building className="h-4 w-4 hidden sm:inline" />
              Clínica
            </TabsTrigger>
            <TabsTrigger value="report" className="gap-2">
              <FileText className="h-4 w-4 hidden sm:inline" />
              Laudo
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-2">
              <Settings className="h-4 w-4 hidden sm:inline" />
              Preferências
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Meu Perfil</CardTitle>
                <CardDescription>Gerencie seus dados pessoais e profissionais</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-xl">
                      {profile?.full_name ? getInitials(profile.full_name) : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Button variant="outline" size="sm">
                      Alterar Foto
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPG, PNG. Máximo 2MB.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nome Completo</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>CRM</Label>
                    <Input value={`${profile?.crm}/${profile?.crm_uf}`} disabled />
                    <p className="text-xs text-muted-foreground">
                      Para alterar o CRM, entre em contato com o suporte.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Especialidade</Label>
                    <Input
                      value={
                        profile?.specialty === "oftalmologia"
                          ? "Oftalmologia Geral"
                          : profile?.specialty === "retina"
                          ? "Retina e Vítreo"
                          : "Glaucoma"
                      }
                      disabled
                    />
                  </div>
                </div>

                <Button onClick={handleSaveProfile} disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar Alterações
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clinic Tab */}
          <TabsContent value="clinic">
            <Card>
              <CardHeader>
                <CardTitle>Dados da Clínica</CardTitle>
                <CardDescription>
                  Informações que aparecerão no cabeçalho dos laudos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="clinicName">Nome da Clínica</Label>
                  <Input
                    id="clinicName"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    placeholder="Nome da sua clínica ou consultório"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clinicAddress">Endereço</Label>
                  <Textarea
                    id="clinicAddress"
                    value={clinicAddress}
                    onChange={(e) => setClinicAddress(e.target.value)}
                    placeholder="Endereço completo"
                    rows={2}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="clinicPhone">Telefone</Label>
                    <Input
                      id="clinicPhone"
                      value={clinicPhone}
                      onChange={(e) => setClinicPhone(e.target.value)}
                      placeholder="(00) 0000-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clinicCnpj">CNPJ (opcional)</Label>
                    <Input
                      id="clinicCnpj"
                      value={clinicCnpj}
                      onChange={(e) => setClinicCnpj(e.target.value)}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                </div>

                <Button onClick={handleSaveClinic} disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar Alterações
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Report Tab */}
          <TabsContent value="report">
            <Card>
              <CardHeader>
                <CardTitle>Preferências de Laudo</CardTitle>
                <CardDescription>
                  Personalize a aparência e conteúdo dos seus laudos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Incluir Logo no PDF</Label>
                    <p className="text-sm text-muted-foreground">
                      Exibe o logo da clínica no cabeçalho do laudo
                    </p>
                  </div>
                  <Switch checked={includeLogo} onCheckedChange={setIncludeLogo} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Incluir Assinatura Digital</Label>
                    <p className="text-sm text-muted-foreground">
                      Adiciona sua assinatura no rodapé do laudo
                    </p>
                  </div>
                  <Switch checked={includeSignature} onCheckedChange={setIncludeSignature} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultTemplate">Template de Observações Padrão</Label>
                  <Textarea
                    id="defaultTemplate"
                    value={defaultTemplate}
                    onChange={(e) => setDefaultTemplate(e.target.value)}
                    placeholder="Texto padrão que aparece no campo de observações..."
                    rows={4}
                  />
                </div>

                <Button onClick={handleSaveReportPrefs} disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar Alterações
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>Preferências do Sistema</CardTitle>
                <CardDescription>Configure notificações e outras opções</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificações por Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba avisos sobre status de exames e aprovação de cadastro
                    </p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>

                <Button onClick={handleSavePreferences} disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar Alterações
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
