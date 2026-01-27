// Dicionário de labels em Português para termos médicos oftalmológicos

export const layerLabels: Record<string, string> = {
  // Interface vitreorretiniana
  mli: "Membrana Limitante Interna (MLI)",
  vitreoretinal_interface: "Interface Vitreorretiniana",
  
  // Camadas retinianas internas
  cfnr: "Camada de Fibras Nervosas da Retina (CFNR)",
  ccg: "Camada de Células Ganglionares (CCG)",
  cpi: "Camada Plexiforme Interna (CPI)",
  cni: "Camada Nuclear Interna (CNI)",
  
  // Camadas retinianas externas
  cpe: "Camada Plexiforme Externa (CPE)",
  cne: "Camada Nuclear Externa (CNE)",
  zona_elipsoide: "Zona Elipsóide (Linha IS/OS)",
  ellipsoid_zone: "Zona Elipsóide (Linha IS/OS)",
  
  // Complexo EPR-Coriocapilar
  epr: "Epitélio Pigmentado da Retina (EPR)",
  rpe: "Epitélio Pigmentado da Retina (EPR)",
  membrana_bruch: "Membrana de Bruch",
  bruch_membrane: "Membrana de Bruch",
  
  // Coroide
  coroide: "Coroide",
  choroid: "Coroide",
  
  // Superfície retiniana
  retinal_surface: "Superfície Retiniana",
  foveal_depression: "Depressão Foveal",
  
  // Camadas gerais
  inner_layers: "Camadas Retinianas Internas",
  outer_layers: "Camadas Retinianas Externas",
  retinal_layers: "Camadas Retinianas",
  rpe_choroid_complex: "Complexo EPR-Coriocapilar",
};

export const biomarkerLabels: Record<string, string> = {
  // Fluidos
  fluido_intraretiniano: "Fluido Intraretiniano",
  intraretinal_fluid: "Fluido Intraretiniano",
  fluido_subretiniano: "Fluido Subretiniano",
  subretinal_fluid: "Fluido Subretiniano",
  
  // Alterações do EPR
  dep: "Descolamento do EPR",
  ped: "Descolamento do EPR",
  pigment_epithelium_detachment: "Descolamento do EPR",
  
  // Drusas
  drusas: "Drusas",
  drusen: "Drusas",
  
  // Membranas
  membrana_epirretiniana: "Membrana Epirretiniana (MER)",
  epiretinal_membrane: "Membrana Epirretiniana (MER)",
  mer: "Membrana Epirretiniana (MER)",
  
  // Edema
  edema_macular: "Edema Macular",
  macular_edema: "Edema Macular",
  edema_cistoide: "Edema Macular Cistóide",
  cystoid_macular_edema: "Edema Macular Cistóide",
  
  // Atrofia
  atrofia_geografica: "Atrofia Geográfica",
  geographic_atrophy: "Atrofia Geográfica",
  
  // Neovascularização
  neovascularizacao: "Neovascularização",
  cnv: "Neovascularização de Coroide",
  choroidal_neovascularization: "Neovascularização de Coroide",
  
  // Outros
  traction: "Tração Vitreomacular",
  vitreomacular_traction: "Tração Vitreomacular",
  macular_hole: "Buraco Macular",
  buraco_macular: "Buraco Macular",
  hyperreflective_foci: "Focos Hiperrefletivos",
  hard_exudates: "Exsudatos Duros",
  hemorrhage: "Hemorragia",
  hemorragia: "Hemorragia",
  cotton_wool_spots: "Exsudatos Algodonosos",
  microaneurysms: "Microaneurismas",
};

export const measurementLabels: Record<string, string> = {
  central_thickness: "Espessura Central Foveal",
  central_foveal_thickness: "Espessura Central Foveal",
  espessura_central: "Espessura Central Foveal",
  choroidal_thickness: "Espessura da Coroide",
  espessura_coroide: "Espessura da Coroide",
  rnfl_thickness: "Espessura da CFNR",
  cup_disc_ratio: "Relação Escavação/Disco (E/D)",
  c_d_ratio: "Relação Escavação/Disco (E/D)",
  rim_area: "Área da Rima Neural",
  disc_area: "Área do Disco",
  cup_volume: "Volume da Escavação",
  avg_rnfl: "CFNR Média",
  superior_rnfl: "CFNR Superior",
  inferior_rnfl: "CFNR Inferior",
  nasal_rnfl: "CFNR Nasal",
  temporal_rnfl: "CFNR Temporal",
};

export const qualityLabels: Record<string, { label: string; color: string }> = {
  boa: { label: "Boa", color: "status-normal" },
  good: { label: "Boa", color: "status-normal" },
  moderada: { label: "Moderada", color: "status-borderline" },
  moderate: { label: "Moderada", color: "status-borderline" },
  ruim: { label: "Baixa", color: "status-abnormal" },
  poor: { label: "Baixa", color: "status-abnormal" },
  baixa: { label: "Baixa", color: "status-abnormal" },
};

export const statusLabels: Record<string, { label: string; color: string }> = {
  normal: { label: "Normal", color: "status-normal" },
  preservada: { label: "Preservada", color: "status-normal" },
  preservado: { label: "Preservado", color: "status-normal" },
  integro: { label: "Íntegro", color: "status-normal" },
  integra: { label: "Íntegra", color: "status-normal" },
  continua: { label: "Contínua", color: "status-normal" },
  
  alterada: { label: "Alterada", color: "status-abnormal" },
  alterado: { label: "Alterado", color: "status-abnormal" },
  anormal: { label: "Anormal", color: "status-abnormal" },
  presente: { label: "Presente", color: "status-abnormal" },
  
  borderline: { label: "Limítrofe", color: "status-borderline" },
  limitrofe: { label: "Limítrofe", color: "status-borderline" },
  leve: { label: "Leve", color: "status-borderline" },
  
  ausente: { label: "Ausente", color: "status-normal" },
  nao_visualizada: { label: "Não Visualizada", color: "text-muted-foreground" },
};

export const eyeLabels: Record<string, string> = {
  od: "Olho Direito",
  oe: "Olho Esquerdo",
  both: "Ambos os Olhos",
  right: "Olho Direito",
  left: "Olho Esquerdo",
};

export const examTypeLabels: Record<string, string> = {
  oct_macular: "Tomografia de Coerência Óptica (OCT) - Macular",
  oct_nerve: "Tomografia de Coerência Óptica (OCT) - Nervo Óptico",
  retinography: "Retinografia",
};

// Helpers
export function getStatusInfo(status: string): { label: string; color: string } {
  const normalized = status.toLowerCase().replace(/\s+/g, "_");
  return statusLabels[normalized] || { label: status, color: "text-foreground" };
}

export function getQualityInfo(quality: string): { label: string; color: string } {
  const normalized = quality.toLowerCase().replace(/\s+/g, "_");
  return qualityLabels[normalized] || { label: quality, color: "text-foreground" };
}

export function getLayerLabel(key: string): string {
  const normalized = key.toLowerCase().replace(/\s+/g, "_");
  return layerLabels[normalized] || key;
}

export function getBiomarkerLabel(key: string): string {
  const normalized = key.toLowerCase().replace(/\s+/g, "_");
  return biomarkerLabels[normalized] || key;
}

export function getMeasurementLabel(key: string): string {
  const normalized = key.toLowerCase().replace(/\s+/g, "_");
  return measurementLabels[normalized] || key;
}
