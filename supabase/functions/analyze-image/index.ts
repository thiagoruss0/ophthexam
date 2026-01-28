import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= PROMPTS POR TIPO DE EXAME =============

// Prompt for bilateral OCT Macular analysis
const OCT_MACULAR_BILATERAL_PROMPT = `Você é um sistema especializado em análise de imagens de OCT (Tomografia de Coerência Óptica) Macular. Analise as imagens fornecidas de AMBOS OS OLHOS com precisão técnica e retorne os achados em formato JSON estruturado, separando os achados de cada olho.

## INSTRUÇÕES
1. Identifique qual imagem corresponde ao Olho Direito (OD) e qual ao Olho Esquerdo (OE)
2. Avalie a qualidade técnica de cada imagem
3. Analise sistematicamente cada camada retiniana DE CADA OLHO
4. Identifique todos os biomarcadores presentes EM CADA OLHO
5. OBRIGATÓRIO: Meça ou estime a ESPESSURA FOVEAL CENTRAL de cada olho
6. Compare os achados entre os olhos
7. Formule impressão diagnóstica bilateral
8. Sugira recomendações clínicas

## ANÁLISE REQUERIDA

Retorne APENAS um JSON válido com a seguinte estrutura BILATERAL:

{
  "bilateral": true,
  "od": {
    "quality": {
      "score": "boa|moderada|ruim",
      "issues": ["lista de problemas se houver"],
      "centered": true|false
    },
    "layers": {
      "vitreoretinal_interface": {"status": "normal|alterada", "description": ""},
      "mli": {"status": "normal|alterada|ausente", "description": ""},
      "cfnr": {"status": "normal|alterada|ausente", "description": ""},
      "ccg": {"status": "normal|alterada|ausente", "description": ""},
      "cpi": {"status": "normal|alterada|ausente", "description": ""},
      "cni": {"status": "normal|alterada|ausente", "description": ""},
      "cpe": {"status": "normal|alterada|ausente", "description": ""},
      "cne": {"status": "normal|alterada|ausente", "description": ""},
      "zona_elipsoide": {"status": "normal|alterada|ausente", "description": ""},
      "epr": {"status": "normal|alterado|ausente", "description": ""},
      "membrana_bruch": {"status": "normal|alterada|ausente", "description": ""},
      "coroide": {"status": "normal|alterada", "description": ""}
    },
    "foveal_depression": {"status": "preservada|alterada|ausente", "description": ""},
    "biomarkers": {
      "fluido_intraretiniano": {"present": true|false, "location": "", "severity": "leve|moderado|severo"},
      "fluido_subretiniano": {"present": true|false, "location": "", "severity": "leve|moderado|severo"},
      "dep": {"present": true|false, "type": "seroso|fibrovascular|drusenoide", "height": ""},
      "drusas": {"present": true|false, "size": "pequenas|medias|grandes", "type": "duras|moles", "location": ""},
      "atrofia_epr": {"present": true|false, "location": "", "extent": ""},
      "membrana_epirretiniana": {"present": true|false, "severity": "leve|moderada|severa", "traction": true|false},
      "tracao_vitreomacular": {"present": true|false, "type": "adesao|tracao", "width": ""},
      "buraco_macular": {"present": true|false, "stage": "1|2|3|4", "size": ""},
      "edema_macular": {"present": true|false, "type": "cistoide|difuso", "severity": "leve|moderado|severo"},
      "material_hiperreflectivo": {"present": true|false, "location": "sub_epr|subretiniano|intraretiniano"},
      "pontos_hiperreflectivos": {"present": true|false, "quantity": "poucos|moderados|muitos"},
      "atrofia_externa": {"present": true|false, "location": ""},
      "desorganizacao_camadas": {"present": true|false, "location": ""}
    },
    "measurements": {
      "central_foveal_thickness": {"value": null, "unit": "μm", "classification": "normal|aumentada|diminuida"},
      "subfoveal_choroidal_thickness": {"value": null, "unit": "μm"},
      "subretinal_fluid_height": {"value": null, "unit": "μm"},
      "dep_height": {"value": null, "unit": "μm"}
    },
    "clinical_notes": ""
  },
  "oe": {
    "quality": {
      "score": "boa|moderada|ruim",
      "issues": ["lista de problemas se houver"],
      "centered": true|false
    },
    "layers": {
      "vitreoretinal_interface": {"status": "normal|alterada", "description": ""},
      "mli": {"status": "normal|alterada|ausente", "description": ""},
      "cfnr": {"status": "normal|alterada|ausente", "description": ""},
      "ccg": {"status": "normal|alterada|ausente", "description": ""},
      "cpi": {"status": "normal|alterada|ausente", "description": ""},
      "cni": {"status": "normal|alterada|ausente", "description": ""},
      "cpe": {"status": "normal|alterada|ausente", "description": ""},
      "cne": {"status": "normal|alterada|ausente", "description": ""},
      "zona_elipsoide": {"status": "normal|alterada|ausente", "description": ""},
      "epr": {"status": "normal|alterado|ausente", "description": ""},
      "membrana_bruch": {"status": "normal|alterada|ausente", "description": ""},
      "coroide": {"status": "normal|alterada", "description": ""}
    },
    "foveal_depression": {"status": "preservada|alterada|ausente", "description": ""},
    "biomarkers": {
      "fluido_intraretiniano": {"present": true|false, "location": "", "severity": "leve|moderado|severo"},
      "fluido_subretiniano": {"present": true|false, "location": "", "severity": "leve|moderado|severo"},
      "dep": {"present": true|false, "type": "seroso|fibrovascular|drusenoide", "height": ""},
      "drusas": {"present": true|false, "size": "pequenas|medias|grandes", "type": "duras|moles", "location": ""},
      "atrofia_epr": {"present": true|false, "location": "", "extent": ""},
      "membrana_epirretiniana": {"present": true|false, "severity": "leve|moderada|severa", "traction": true|false},
      "tracao_vitreomacular": {"present": true|false, "type": "adesao|tracao", "width": ""},
      "buraco_macular": {"present": true|false, "stage": "1|2|3|4", "size": ""},
      "edema_macular": {"present": true|false, "type": "cistoide|difuso", "severity": "leve|moderado|severo"},
      "material_hiperreflectivo": {"present": true|false, "location": "sub_epr|subretiniano|intraretiniano"},
      "pontos_hiperreflectivos": {"present": true|false, "quantity": "poucos|moderados|muitos"},
      "atrofia_externa": {"present": true|false, "location": ""},
      "desorganizacao_camadas": {"present": true|false, "location": ""}
    },
    "measurements": {
      "central_foveal_thickness": {"value": null, "unit": "μm", "classification": "normal|aumentada|diminuida"},
      "subfoveal_choroidal_thickness": {"value": null, "unit": "μm"},
      "subretinal_fluid_height": {"value": null, "unit": "μm"},
      "dep_height": {"value": null, "unit": "μm"}
    },
    "clinical_notes": ""
  },
  "comparison": {
    "symmetry": "simetrico|assimetrico",
    "asymmetry_details": "",
    "notes": ""
  },
  "diagnosis": {
    "primary": "",
    "secondary": [""],
    "differential": [""]
  },
  "recommendations": [""],
  "overall_clinical_notes": ""
}

IMPORTANTE:
- Seja preciso e objetivo
- Use terminologia médica oftalmológica padrão
- A ESPESSURA FOVEAL CENTRAL é OBRIGATÓRIA para cada olho
- Compare sempre os achados entre OD e OE
- Se não conseguir avaliar algo, indique "não avaliável"
- Não invente achados - relate apenas o que é visível
- Este é um auxílio diagnóstico que requer validação médica`;

const OCT_MACULAR_PROMPT = `Você é um sistema especializado em análise de imagens de OCT (Tomografia de Coerência Óptica) Macular. Analise a imagem fornecida com precisão técnica e retorne os achados em formato JSON estruturado.

## INSTRUÇÕES
1. Avalie a qualidade técnica da imagem
2. Analise sistematicamente cada camada retiniana
3. Identifique todos os biomarcadores presentes
4. OBRIGATÓRIO: Meça ou estime a ESPESSURA FOVEAL CENTRAL
5. Formule impressão diagnóstica baseada nos achados
6. Sugira recomendações clínicas

## ANÁLISE REQUERIDA

Retorne APENAS um JSON válido com a seguinte estrutura:

{
  "quality": {
    "score": "boa|moderada|ruim",
    "issues": ["lista de problemas se houver"],
    "centered": true|false
  },
  "layers": {
    "vitreoretinal_interface": {"status": "normal|alterada", "description": "Linha de média refletividade aderida à superfície retiniana"},
    "mli": {"status": "normal|alterada|ausente", "description": ""},
    "cfnr": {"status": "normal|alterada|ausente", "description": ""},
    "ccg": {"status": "normal|alterada|ausente", "description": ""},
    "cpi": {"status": "normal|alterada|ausente", "description": ""},
    "cni": {"status": "normal|alterada|ausente", "description": ""},
    "cpe": {"status": "normal|alterada|ausente", "description": ""},
    "cne": {"status": "normal|alterada|ausente", "description": ""},
    "zona_elipsoide": {"status": "normal|alterada|ausente", "description": ""},
    "epr": {"status": "normal|alterado|ausente", "description": ""},
    "membrana_bruch": {"status": "normal|alterada|ausente", "description": ""},
    "coroide": {"status": "normal|alterada", "description": ""}
  },
  "foveal_depression": {"status": "preservada|alterada|ausente", "description": ""},
  "retinal_surface": {"status": "normal|alterada", "description": "Refletividade normal"},
  "inner_layers": {"status": "normal|alteradas", "description": "Refletividade normal e arquitetura preservada"},
  "outer_layers": {"status": "normal|alteradas", "description": "Refletividade normal e arquitetura preservada"},
  "rpe_choroid_complex": {"status": "normal|alterado", "description": "Refletividade normal e arquitetura preservada"},
  "biomarkers": {
    "fluido_intraretiniano": {"present": true|false, "location": "", "severity": "leve|moderado|severo"},
    "fluido_subretiniano": {"present": true|false, "location": "", "severity": "leve|moderado|severo"},
    "dep": {"present": true|false, "type": "seroso|fibrovascular|drusenoide", "height": ""},
    "drusas": {"present": true|false, "size": "pequenas|medias|grandes", "type": "duras|moles", "location": ""},
    "atrofia_epr": {"present": true|false, "location": "", "extent": ""},
    "membrana_epirretiniana": {"present": true|false, "severity": "leve|moderada|severa", "traction": true|false},
    "tracao_vitreomacular": {"present": true|false, "type": "adesao|tracao", "width": ""},
    "buraco_macular": {"present": true|false, "stage": "1|2|3|4", "size": ""},
    "edema_macular": {"present": true|false, "type": "cistoide|difuso", "severity": "leve|moderado|severo"},
    "material_hiperreflectivo": {"present": true|false, "location": "sub_epr|subretiniano|intraretiniano"},
    "pontos_hiperreflectivos": {"present": true|false, "quantity": "poucos|moderados|muitos"},
    "atrofia_externa": {"present": true|false, "location": ""},
    "desorganizacao_camadas": {"present": true|false, "location": ""}
  },
  "measurements": {
    "central_foveal_thickness": {"value": null, "unit": "μm", "classification": "normal|aumentada|diminuida"},
    "subfoveal_choroidal_thickness": {"value": null, "unit": "μm"},
    "subretinal_fluid_height": {"value": null, "unit": "μm"},
    "dep_height": {"value": null, "unit": "μm"}
  },
  "diagnosis": {
    "primary": "",
    "secondary": [""],
    "differential": [""]
  },
  "recommendations": [""],
  "clinical_notes": ""
}

IMPORTANTE:
- Seja preciso e objetivo
- Use terminologia médica oftalmológica padrão
- A ESPESSURA FOVEAL CENTRAL é OBRIGATÓRIA
- Se não conseguir avaliar algo, indique "não avaliável"
- Não invente achados - relate apenas o que é visível
- Este é um auxílio diagnóstico que requer validação médica`;

const OCT_NERVE_BILATERAL_PROMPT = `Você é um sistema especializado em análise de OCT de Nervo Óptico (RNFL e Disco Óptico). Analise as imagens de AMBOS OS OLHOS com foco em detecção de sinais de glaucoma e neuropatias ópticas. Retorne os achados em formato JSON estruturado separando cada olho.

## INSTRUÇÕES
1. Identifique qual imagem corresponde ao Olho Direito (OD) e qual ao Olho Esquerdo (OE)
2. Avalie a qualidade técnica de cada imagem
3. Analise a espessura da RNFL por setores DE CADA OLHO
4. Avalie os parâmetros do disco óptico DE CADA OLHO
5. Identifique biomarcadores de glaucoma EM CADA OLHO
6. Compare a simetria entre os olhos
7. Classifique o risco glaucomatoso
8. Formule impressão diagnóstica bilateral

## ANÁLISE REQUERIDA

Retorne APENAS um JSON válido com a seguinte estrutura BILATERAL:

{
  "bilateral": true,
  "od": {
    "quality": {
      "score": "boa|moderada|ruim",
      "signal_strength": null,
      "issues": []
    },
    "rnfl": {
      "average": {"value": null, "unit": "μm", "classification": "normal|borderline|anormal"},
      "superior": {"value": null, "unit": "μm", "classification": "normal|borderline|anormal"},
      "inferior": {"value": null, "unit": "μm", "classification": "normal|borderline|anormal"},
      "nasal": {"value": null, "unit": "μm", "classification": "normal|borderline|anormal"},
      "temporal": {"value": null, "unit": "μm", "classification": "normal|borderline|anormal"},
      "thinning_location": [],
      "defect_pattern": "difuso|localizado|cunha|nenhum"
    },
    "optic_disc": {
      "disc_area": {"value": null, "unit": "mm²", "classification": "pequeno|normal|grande"},
      "cup_area": {"value": null, "unit": "mm²"},
      "rim_area": {"value": null, "unit": "mm²", "classification": "normal|reduzida"},
      "cd_ratio_average": {"value": null, "classification": "normal|suspeita|glaucomatosa"},
      "isnt_rule": {"preserved": true|false, "violated_sectors": []},
      "notch": {"present": true|false, "location": ""},
      "disc_hemorrhage": {"present": true|false, "location": ""},
      "peripapillary_atrophy": {"present": true|false, "type": "alfa|beta", "extent": ""}
    },
    "biomarkers_glaucoma": {
      "rnfl_wedge_defect": {"present": true|false, "location": ""},
      "rnfl_focal_thinning": {"present": true|false, "location": ""},
      "rim_thinning": {"present": true|false, "location": ""},
      "rim_notch": {"present": true|false, "location": ""},
      "disc_hemorrhage": {"present": true|false, "location": ""}
    },
    "clinical_notes": ""
  },
  "oe": {
    "quality": {
      "score": "boa|moderada|ruim",
      "signal_strength": null,
      "issues": []
    },
    "rnfl": {
      "average": {"value": null, "unit": "μm", "classification": "normal|borderline|anormal"},
      "superior": {"value": null, "unit": "μm", "classification": "normal|borderline|anormal"},
      "inferior": {"value": null, "unit": "μm", "classification": "normal|borderline|anormal"},
      "nasal": {"value": null, "unit": "μm", "classification": "normal|borderline|anormal"},
      "temporal": {"value": null, "unit": "μm", "classification": "normal|borderline|anormal"},
      "thinning_location": [],
      "defect_pattern": "difuso|localizado|cunha|nenhum"
    },
    "optic_disc": {
      "disc_area": {"value": null, "unit": "mm²", "classification": "pequeno|normal|grande"},
      "cup_area": {"value": null, "unit": "mm²"},
      "rim_area": {"value": null, "unit": "mm²", "classification": "normal|reduzida"},
      "cd_ratio_average": {"value": null, "classification": "normal|suspeita|glaucomatosa"},
      "isnt_rule": {"preserved": true|false, "violated_sectors": []},
      "notch": {"present": true|false, "location": ""},
      "disc_hemorrhage": {"present": true|false, "location": ""},
      "peripapillary_atrophy": {"present": true|false, "type": "alfa|beta", "extent": ""}
    },
    "biomarkers_glaucoma": {
      "rnfl_wedge_defect": {"present": true|false, "location": ""},
      "rnfl_focal_thinning": {"present": true|false, "location": ""},
      "rim_thinning": {"present": true|false, "location": ""},
      "rim_notch": {"present": true|false, "location": ""},
      "disc_hemorrhage": {"present": true|false, "location": ""}
    },
    "clinical_notes": ""
  },
  "comparison": {
    "od_oe_asymmetry": {"significant": true|false, "description": ""},
    "rnfl_asymmetry_percentage": null,
    "symmetry": "simetrico|assimetrico"
  },
  "risk_classification": {
    "glaucoma_risk": "baixo|moderado|alto",
    "progression_risk": "baixo|moderado|alto",
    "justification": ""
  },
  "diagnosis": {
    "primary": "",
    "staging": "suspeito|inicial|moderado|avancado",
    "differential": [""]
  },
  "recommendations": [""],
  "overall_clinical_notes": ""
}

IMPORTANTE:
- Compare SEMPRE a simetria entre os dois olhos
- Avalie a regra ISNT de cada olho
- Indique necessidade de exames complementares
- Este é um auxílio diagnóstico que requer validação médica`;

const OCT_NERVE_PROMPT = `Você é um sistema especializado em análise de OCT de Nervo Óptico (RNFL e Disco Óptico). Analise a imagem fornecida com foco em detecção de sinais de glaucoma e neuropatias ópticas. Retorne os achados em formato JSON estruturado.

## INSTRUÇÕES
1. Avalie a qualidade técnica da imagem
2. Analise a espessura da RNFL por setores
3. Avalie os parâmetros do disco óptico
4. Identifique biomarcadores de glaucoma
5. Classifique o risco glaucomatoso
6. Formule impressão diagnóstica

## ANÁLISE REQUERIDA

Retorne APENAS um JSON válido com a seguinte estrutura:

{
  "quality": {
    "score": "boa|moderada|ruim",
    "signal_strength": null,
    "issues": ["lista de problemas se houver"]
  },
  "rnfl": {
    "average": {"value": null, "unit": "μm", "classification": "normal|borderline|anormal"},
    "superior": {"value": null, "unit": "μm", "classification": "normal|borderline|anormal"},
    "inferior": {"value": null, "unit": "μm", "classification": "normal|borderline|anormal"},
    "nasal": {"value": null, "unit": "μm", "classification": "normal|borderline|anormal"},
    "temporal": {"value": null, "unit": "μm", "classification": "normal|borderline|anormal"},
    "symmetry": {"value": null, "unit": "%", "classification": "normal|assimetrico"},
    "thinning_location": ["lista de setores com afinamento"],
    "defect_pattern": "difuso|localizado|cunha|nenhum"
  },
  "optic_disc": {
    "disc_area": {"value": null, "unit": "mm²", "classification": "pequeno|normal|grande"},
    "cup_area": {"value": null, "unit": "mm²"},
    "rim_area": {"value": null, "unit": "mm²", "classification": "normal|reduzida"},
    "cd_ratio_horizontal": {"value": null, "classification": "normal|aumentada"},
    "cd_ratio_vertical": {"value": null, "classification": "normal|aumentada"},
    "cd_ratio_average": {"value": null, "classification": "normal|suspeita|glaucomatosa"},
    "isnt_rule": {"preserved": true|false, "violated_sectors": [""]},
    "notch": {"present": true|false, "location": ""},
    "disc_hemorrhage": {"present": true|false, "location": ""},
    "peripapillary_atrophy": {"present": true|false, "type": "alfa|beta", "extent": ""},
    "nasalization": {"present": true|false},
    "bayoneting": {"present": true|false}
  },
  "ganglion_cell_analysis": {
    "available": true|false,
    "average": {"value": null, "unit": "μm", "classification": "normal|borderline|anormal"},
    "minimum": {"value": null, "unit": "μm", "classification": "normal|borderline|anormal"},
    "asymmetry": {"value": null, "unit": "%"}
  },
  "biomarkers_glaucoma": {
    "rnfl_wedge_defect": {"present": true|false, "location": ""},
    "rnfl_focal_thinning": {"present": true|false, "location": ""},
    "rim_thinning": {"present": true|false, "location": ""},
    "rim_notch": {"present": true|false, "location": ""},
    "disc_hemorrhage": {"present": true|false, "location": ""},
    "beta_peripapillary_atrophy": {"present": true|false},
    "lamina_cribrosa_visible": {"present": true|false},
    "vascular_bayoneting": {"present": true|false},
    "nerve_fiber_bundle_defect": {"present": true|false, "location": ""}
  },
  "risk_classification": {
    "glaucoma_risk": "baixo|moderado|alto",
    "progression_risk": "baixo|moderado|alto",
    "justification": ""
  },
  "comparison": {
    "od_oe_asymmetry": {"significant": true|false, "description": ""}
  },
  "diagnosis": {
    "primary": "",
    "staging": "suspeito|inicial|moderado|avancado",
    "differential": [""]
  },
  "recommendations": [""],
  "clinical_notes": ""
}

IMPORTANTE:
- Foque em identificar sinais precoces de glaucoma
- Avalie a regra ISNT (Inferior > Superior > Nasal > Temporal)
- Compare assimetrias entre olhos se possível
- Indique necessidade de exames complementares (campo visual, PIO, paquimetria)
- Este é um auxílio diagnóstico que requer validação médica`;

const RETINOGRAPHY_BILATERAL_PROMPT = `Você é um sistema especializado em análise de Retinografia Colorida (fotografia de fundo de olho). Analise as imagens de AMBOS OS OLHOS de forma sistemática, avaliando disco óptico, mácula, vasos e retina periférica. Retorne os achados em formato JSON estruturado separando cada olho.

## INSTRUÇÕES
1. Identifique qual imagem corresponde ao Olho Direito (OD) e qual ao Olho Esquerdo (OE)
2. Avalie a qualidade técnica de cada imagem
3. Analise detalhadamente o disco óptico de cada olho
4. Avalie a mácula de cada olho
5. Analise os vasos retinianos de cada olho
6. Compare achados entre os olhos
7. Formule impressão diagnóstica bilateral

## ANÁLISE REQUERIDA

Retorne APENAS um JSON válido com a seguinte estrutura BILATERAL:

{
  "bilateral": true,
  "od": {
    "quality": {
      "score": "boa|moderada|ruim",
      "focus": "adequado|inadequado",
      "illumination": "adequada|inadequada"
    },
    "optic_disc": {
      "visibility": "boa|moderada|ruim",
      "color": "normocorado|palido|hiperemiado",
      "borders": "nitidas|borradas|elevadas",
      "cd_ratio_estimated": {"value": null, "confidence": "alta|media|baixa"},
      "isnt_rule": {"preserved": true|false},
      "notch": {"present": true|false, "location": ""},
      "disc_hemorrhage": {"present": true|false, "location": ""},
      "peripapillary_atrophy": {"present": true|false, "type": "alfa|beta", "extent": ""},
      "glaucoma_probability": "baixa|moderada|alta"
    },
    "macula": {
      "foveal_reflex": "presente|ausente|alterado",
      "pigmentation": "normal|alterada",
      "drusas": {"present": true|false, "size": "", "type": ""},
      "hemorrhages": {"present": true|false, "type": "", "location": ""},
      "edema_signs": {"present": true|false, "description": ""},
      "atrophy": {"present": true|false, "type": "", "extent": ""}
    },
    "vessels": {
      "av_ratio": {"value": "", "classification": "normal|reduzida"},
      "arteriolar_narrowing": {"present": true|false},
      "av_nicking": {"present": true|false},
      "microaneurysms": {"present": true|false, "quantity": ""}
    },
    "retina_general": {
      "hemorrhages": {"present": true|false, "types": [], "quantity": ""},
      "hard_exudates": {"present": true|false},
      "cotton_wool_spots": {"present": true|false, "quantity": 0}
    },
    "clinical_notes": ""
  },
  "oe": {
    "quality": {
      "score": "boa|moderada|ruim",
      "focus": "adequado|inadequado",
      "illumination": "adequada|inadequada"
    },
    "optic_disc": {
      "visibility": "boa|moderada|ruim",
      "color": "normocorado|palido|hiperemiado",
      "borders": "nitidas|borradas|elevadas",
      "cd_ratio_estimated": {"value": null, "confidence": "alta|media|baixa"},
      "isnt_rule": {"preserved": true|false},
      "notch": {"present": true|false, "location": ""},
      "disc_hemorrhage": {"present": true|false, "location": ""},
      "peripapillary_atrophy": {"present": true|false, "type": "alfa|beta", "extent": ""},
      "glaucoma_probability": "baixa|moderada|alta"
    },
    "macula": {
      "foveal_reflex": "presente|ausente|alterado",
      "pigmentation": "normal|alterada",
      "drusas": {"present": true|false, "size": "", "type": ""},
      "hemorrhages": {"present": true|false, "type": "", "location": ""},
      "edema_signs": {"present": true|false, "description": ""},
      "atrophy": {"present": true|false, "type": "", "extent": ""}
    },
    "vessels": {
      "av_ratio": {"value": "", "classification": "normal|reduzida"},
      "arteriolar_narrowing": {"present": true|false},
      "av_nicking": {"present": true|false},
      "microaneurysms": {"present": true|false, "quantity": ""}
    },
    "retina_general": {
      "hemorrhages": {"present": true|false, "types": [], "quantity": ""},
      "hard_exudates": {"present": true|false},
      "cotton_wool_spots": {"present": true|false, "quantity": 0}
    },
    "clinical_notes": ""
  },
  "comparison": {
    "symmetry": "simetrico|assimetrico",
    "asymmetry_details": "",
    "notes": ""
  },
  "classifications": {
    "diabetic_retinopathy": "ausente|rdnp_leve|rdnp_moderada|rdnp_severa|rdp",
    "hypertensive_retinopathy": "ausente|grau1|grau2|grau3|grau4",
    "amd": "ausente|precoce|intermediaria|avancada_seca|avancada_exsudativa",
    "glaucoma_suspect": "nao|baixa_probabilidade|moderada_probabilidade|alta_probabilidade"
  },
  "diagnosis": {
    "primary": "",
    "secondary": [""],
    "differential": [""]
  },
  "recommendations": [""],
  "urgency": "rotina|preferencial|urgente",
  "overall_clinical_notes": ""
}

IMPORTANTE:
- Compare SEMPRE os achados entre os dois olhos
- Analise o disco óptico com atenção para sinais de glaucoma
- Estime o C/D ratio de cada olho
- Classifique a gravidade das alterações
- Este é um auxílio diagnóstico que requer validação médica`;

const RETINOGRAPHY_PROMPT = `Você é um sistema especializado em análise de Retinografia Colorida (fotografia de fundo de olho). Analise a imagem fornecida de forma sistemática, avaliando disco óptico, mácula, vasos e retina periférica. Retorne os achados em formato JSON estruturado.

## INSTRUÇÕES
1. Avalie a qualidade técnica da imagem
2. Analise detalhadamente o disco óptico (buscar sinais de glaucoma)
3. Avalie a mácula e região macular
4. Analise os vasos retinianos
5. Verifique a retina periférica visível
6. Identifique todos os biomarcadores
7. Formule impressão diagnóstica

## ANÁLISE REQUERIDA

Retorne APENAS um JSON válido com a seguinte estrutura:

{
  "quality": {
    "score": "boa|moderada|ruim",
    "focus": "adequado|inadequado",
    "illumination": "adequada|inadequada",
    "field": "posterior|amplo",
    "media_opacity": {"present": true|false, "type": ""}
  },
  "optic_disc": {
    "visibility": "boa|moderada|ruim",
    "color": "normocorado|palido|hiperemiado",
    "pallor_pattern": "nenhum|temporal|difuso|setorial",
    "borders": "nitidas|borradas|elevadas",
    "size": "normal|pequeno|grande",
    "shape": "redondo|oval|irregular",
    "cd_ratio_estimated": {"value": null, "confidence": "alta|media|baixa"},
    "cd_ratio_vertical": {"value": null},
    "cd_ratio_horizontal": {"value": null},
    "cup_shape": "normal|profunda|obliqua",
    "isnt_rule": {
      "preserved": true|false,
      "inferior_rim": "normal|reduzido|ausente",
      "superior_rim": "normal|reduzido|ausente",
      "nasal_rim": "normal|reduzido|ausente",
      "temporal_rim": "normal|reduzido|ausente"
    },
    "neuroretinal_rim": "regular|irregular|com_notch",
    "notch": {"present": true|false, "location": ""},
    "disc_hemorrhage": {"present": true|false, "location": "", "type": "chama|estilha"},
    "peripapillary_atrophy": {
      "present": true|false,
      "alpha_zone": true|false,
      "beta_zone": true|false,
      "extent": "pequena|moderada|extensa",
      "location": ""
    },
    "disc_edema": {"present": true|false, "severity": "leve|moderado|severo"},
    "disc_drusen": {"present": true|false},
    "optic_pit": {"present": true|false},
    "tilted_disc": {"present": true|false},
    "glaucoma_signs": ["lista de sinais sugestivos de glaucoma"],
    "glaucoma_probability": "baixa|moderada|alta"
  },
  "macula": {
    "foveal_reflex": "presente|ausente|alterado",
    "macular_brightness": "normal|reduzido|aumentado",
    "pigmentation": "normal|alterada",
    "drusas": {
      "present": true|false,
      "size": "pequenas|medias|grandes",
      "type": "duras|moles|cuticulares",
      "distribution": "focal|difusa",
      "quantity": "poucas|moderadas|numerosas"
    },
    "pigment_changes": {
      "present": true|false,
      "type": "hiperpigmentacao|hipopigmentacao|misto",
      "distribution": ""
    },
    "hemorrhages": {"present": true|false, "type": "", "location": ""},
    "exudates_hard": {"present": true|false, "pattern": "focal|circinado|difuso", "location": ""},
    "edema_signs": {"present": true|false, "description": ""},
    "atrophy": {"present": true|false, "type": "geografica|nao_geografica", "extent": ""},
    "epiretinal_membrane_signs": {"present": true|false},
    "macular_hole_signs": {"present": true|false},
    "cnv_signs": {"present": true|false, "type": "classica|oculta"},
    "macular_classification": "normal|dmri_seca_inicial|dmri_seca_intermediaria|dmri_seca_avancada|dmri_exsudativa|edema_macular|outro"
  },
  "vessels": {
    "av_ratio": {"value": "", "classification": "normal|reduzida"},
    "arteriolar_narrowing": {"present": true|false, "severity": "leve|moderada|severa"},
    "venous_dilation": {"present": true|false},
    "tortuosity": {"present": true|false, "affected": "arterias|veias|ambos"},
    "av_nicking": {"present": true|false, "severity": "leve|moderado|severo"},
    "copper_wire": {"present": true|false},
    "silver_wire": {"present": true|false},
    "sheathing": {"present": true|false, "location": ""},
    "neovascularization_disc": {"present": true|false},
    "neovascularization_elsewhere": {"present": true|false, "location": ""},
    "vascular_occlusion_signs": {"present": true|false, "type": ""},
    "microaneurysms": {"present": true|false, "quantity": "poucos|moderados|numerosos", "location": ""}
  },
  "retina_general": {
    "hemorrhages": {
      "present": true|false,
      "types": ["chama", "ponto_borrão", "sub_hialoide", "pre_retiniana"],
      "locations": [""],
      "quantity": "poucas|moderadas|numerosas"
    },
    "hard_exudates": {"present": true|false, "distribution": ""},
    "cotton_wool_spots": {"present": true|false, "quantity": 0, "locations": [""]},
    "irma": {"present": true|false, "location": ""},
    "venous_beading": {"present": true|false},
    "laser_scars": {"present": true|false, "pattern": "focal|panretinal"},
    "chorioretinal_scars": {"present": true|false, "description": ""},
    "nevus": {"present": true|false, "location": "", "size": ""},
    "peripheral_lesions": {"present": true|false, "description": ""}
  },
  "biomarkers": {
    "diabetic_retinopathy_signs": ["lista de achados"],
    "hypertensive_retinopathy_signs": ["lista de achados"],
    "glaucoma_signs": ["lista de achados no disco"],
    "amd_signs": ["lista de achados"],
    "vascular_occlusion_signs": ["lista de achados"]
  },
  "classifications": {
    "diabetic_retinopathy": "ausente|rdnp_leve|rdnp_moderada|rdnp_severa|rdp",
    "diabetic_macular_edema": "ausente|presente_nao_central|presente_central",
    "hypertensive_retinopathy": "ausente|grau1|grau2|grau3|grau4",
    "amd": "ausente|precoce|intermediaria|avancada_seca|avancada_exsudativa",
    "glaucoma_suspect": "nao|baixa_probabilidade|moderada_probabilidade|alta_probabilidade"
  },
  "diagnosis": {
    "primary": "",
    "secondary": [""],
    "differential": [""]
  },
  "recommendations": [""],
  "urgency": "rotina|preferencial|urgente",
  "clinical_notes": ""
}

IMPORTANTE:
- Analise o disco óptico com atenção especial para sinais de glaucoma
- Estime o C/D ratio mesmo que aproximado
- Avalie a regra ISNT
- Identifique sinais de retinopatia diabética e hipertensiva
- Classifique a gravidade das alterações encontradas
- Indique urgência de avaliação quando necessário
- Este é um auxílio diagnóstico que requer validação médica`;

// ============= FUNÇÕES AUXILIARES =============

function getPromptForExamType(examType: string, isBilateral: boolean): string {
  if (isBilateral) {
    switch (examType) {
      case 'oct_macular':
        return OCT_MACULAR_BILATERAL_PROMPT;
      case 'oct_nerve':
        return OCT_NERVE_BILATERAL_PROMPT;
      case 'retinography':
        return RETINOGRAPHY_BILATERAL_PROMPT;
      default:
        throw new Error(`Tipo de exame não suportado: ${examType}`);
    }
  } else {
    switch (examType) {
      case 'oct_macular':
        return OCT_MACULAR_PROMPT;
      case 'oct_nerve':
        return OCT_NERVE_PROMPT;
      case 'retinography':
        return RETINOGRAPHY_PROMPT;
      default:
        throw new Error(`Tipo de exame não suportado: ${examType}`);
    }
  }
}

function extractJsonFromResponse(text: string): any {
  // Try to extract JSON from markdown code blocks
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1].trim());
  }
  
  // Try to parse directly
  const startIndex = text.indexOf('{');
  const endIndex = text.lastIndexOf('}');
  if (startIndex !== -1 && endIndex !== -1) {
    return JSON.parse(text.substring(startIndex, endIndex + 1));
  }
  
  throw new Error('Não foi possível extrair JSON válido da resposta da IA');
}

function mapResponseToAnalysis(examType: string, response: any, isBilateral: boolean): {
  quality_score: string | null;
  findings: any;
  biomarkers: any;
  optic_nerve_analysis: any;
  retinography_analysis: any;
  measurements: any;
  diagnosis: string[];
  recommendations: string[];
  risk_classification: string | null;
} {
  const result = {
    quality_score: null as string | null,
    findings: null as any,
    biomarkers: null as any,
    optic_nerve_analysis: null as any,
    retinography_analysis: null as any,
    measurements: null as any,
    diagnosis: [] as string[],
    recommendations: response.recommendations || [],
    risk_classification: null as string | null,
  };

  // Map diagnosis
  if (response.diagnosis?.primary) {
    result.diagnosis.push(response.diagnosis.primary);
  }
  if (response.diagnosis?.secondary) {
    result.diagnosis = result.diagnosis.concat(response.diagnosis.secondary.filter((d: string) => d));
  }

  // Handle bilateral responses
  if (isBilateral && response.bilateral) {
    // Quality score - use average or worse of both
    const odQuality = response.od?.quality?.score;
    const oeQuality = response.oe?.quality?.score;
    const qualityOrder = ['boa', 'moderada', 'ruim'];
    const odIndex = qualityOrder.indexOf(odQuality || 'boa');
    const oeIndex = qualityOrder.indexOf(oeQuality || 'boa');
    result.quality_score = qualityOrder[Math.max(odIndex, oeIndex)] || null;

    switch (examType) {
      case 'oct_macular':
        result.findings = {
          bilateral: true,
          od: {
            layers: response.od?.layers,
            foveal_depression: response.od?.foveal_depression,
            retinal_surface: response.od?.retinal_surface,
            inner_layers: response.od?.inner_layers,
            outer_layers: response.od?.outer_layers,
            rpe_choroid_complex: response.od?.rpe_choroid_complex,
            clinical_notes: response.od?.clinical_notes,
          },
          oe: {
            layers: response.oe?.layers,
            foveal_depression: response.oe?.foveal_depression,
            retinal_surface: response.oe?.retinal_surface,
            inner_layers: response.oe?.inner_layers,
            outer_layers: response.oe?.outer_layers,
            rpe_choroid_complex: response.oe?.rpe_choroid_complex,
            clinical_notes: response.oe?.clinical_notes,
          },
          comparison: response.comparison,
          overall_clinical_notes: response.overall_clinical_notes,
        };
        result.biomarkers = {
          bilateral: true,
          od: response.od?.biomarkers,
          oe: response.oe?.biomarkers,
        };
        result.measurements = {
          bilateral: true,
          od: response.od?.measurements,
          oe: response.oe?.measurements,
        };
        break;

      case 'oct_nerve':
        result.optic_nerve_analysis = {
          bilateral: true,
          od: {
            rnfl: response.od?.rnfl,
            optic_disc: response.od?.optic_disc,
            clinical_notes: response.od?.clinical_notes,
          },
          oe: {
            rnfl: response.oe?.rnfl,
            optic_disc: response.oe?.optic_disc,
            clinical_notes: response.oe?.clinical_notes,
          },
          comparison: response.comparison,
        };
        result.biomarkers = {
          bilateral: true,
          od: response.od?.biomarkers_glaucoma,
          oe: response.oe?.biomarkers_glaucoma,
        };
        result.risk_classification = response.risk_classification?.glaucoma_risk || null;
        result.findings = {
          bilateral: true,
          staging: response.diagnosis?.staging,
          overall_clinical_notes: response.overall_clinical_notes,
        };
        break;

      case 'retinography':
        result.retinography_analysis = {
          bilateral: true,
          od: {
            optic_disc: response.od?.optic_disc,
            macula: response.od?.macula,
            vessels: response.od?.vessels,
            retina_general: response.od?.retina_general,
            clinical_notes: response.od?.clinical_notes,
          },
          oe: {
            optic_disc: response.oe?.optic_disc,
            macula: response.oe?.macula,
            vessels: response.oe?.vessels,
            retina_general: response.oe?.retina_general,
            clinical_notes: response.oe?.clinical_notes,
          },
          comparison: response.comparison,
          classifications: response.classifications,
          urgency: response.urgency,
        };
        result.findings = {
          bilateral: true,
          overall_clinical_notes: response.overall_clinical_notes,
        };
        break;
    }
  } else {
    // Single eye response (existing logic)
    result.quality_score = response.quality?.score || null;

    switch (examType) {
      case 'oct_macular':
        result.findings = {
          layers: response.layers,
          foveal_depression: response.foveal_depression,
          retinal_surface: response.retinal_surface,
          inner_layers: response.inner_layers,
          outer_layers: response.outer_layers,
          rpe_choroid_complex: response.rpe_choroid_complex,
          clinical_notes: response.clinical_notes,
        };
        result.biomarkers = response.biomarkers;
        result.measurements = response.measurements;
        break;

      case 'oct_nerve':
        result.optic_nerve_analysis = {
          rnfl: response.rnfl,
          optic_disc: response.optic_disc,
          ganglion_cell_analysis: response.ganglion_cell_analysis,
          comparison: response.comparison,
        };
        result.biomarkers = response.biomarkers_glaucoma;
        result.risk_classification = response.risk_classification?.glaucoma_risk || null;
        result.findings = {
          staging: response.diagnosis?.staging,
          clinical_notes: response.clinical_notes,
        };
        break;

      case 'retinography':
        result.retinography_analysis = {
          optic_disc: response.optic_disc,
          macula: response.macula,
          vessels: response.vessels,
          retina_general: response.retina_general,
          classifications: response.classifications,
          urgency: response.urgency,
        };
        result.biomarkers = response.biomarkers;
        result.findings = {
          clinical_notes: response.clinical_notes,
        };
        break;
    }
  }

  return result;
}

async function downloadImageAsBase64(imageUrl: string, supabaseClient: any): Promise<string> {
  console.log('[analyze-image] Downloading image from:', imageUrl);
  
  // Check if it's a Supabase storage URL
  if (imageUrl.includes('supabase') && imageUrl.includes('/storage/')) {
    // Extract bucket and path from URL
    const urlParts = imageUrl.split('/storage/v1/object/');
    if (urlParts.length > 1) {
      const pathParts = urlParts[1].split('/');
      const accessType = pathParts[0]; // 'public' or 'sign'
      const bucket = pathParts[1];
      const filePath = pathParts.slice(2).join('/');
      
      console.log('[analyze-image] Downloading from Supabase storage:', { bucket, filePath });
      
      const { data, error } = await supabaseClient.storage
        .from(bucket)
        .download(filePath);
      
      if (error) {
        console.error('[analyze-image] Storage download error:', error);
        throw new Error(`Erro ao baixar imagem do storage: ${error.message}`);
      }
      
      const arrayBuffer = await data.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      const mimeType = data.type || 'image/jpeg';
      
      return `data:${mimeType};base64,${base64}`;
    }
  }
  
  // For external URLs, fetch directly
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Erro ao baixar imagem: ${response.status}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  
  return `data:${contentType};base64,${base64}`;
}

// ============= SISTEMA DE CORRECOES DINAMICAS =============

interface PromptConfig {
  config_type: string;
  content: {
    target: string;
    type: string;
    message: string;
    suggestion?: string[];
    criteria?: string[];
    characteristics?: string[];
    severity?: string;
  };
  priority: number;
}

/**
 * Busca configuracoes de prompt ativas para o tipo de exame
 */
async function fetchPromptConfigs(
  supabaseClient: any,
  examType: string
): Promise<PromptConfig[]> {
  try {
    const { data, error } = await supabaseClient
      .rpc('get_active_prompt_configs', { p_exam_type: examType });

    if (error) {
      console.error('[analyze-image] Error fetching prompt configs:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[analyze-image] Exception fetching prompt configs:', err);
    return [];
  }
}

/**
 * Aplica correcoes dinamicas ao prompt base
 */
function applyDynamicCorrections(
  basePrompt: string,
  configs: PromptConfig[]
): string {
  if (!configs || configs.length === 0) {
    return basePrompt;
  }

  // Separar por tipo de configuracao
  const corrections = configs.filter(c => c.config_type === 'correction');
  const exclusions = configs.filter(c => c.config_type === 'exclusion');
  const emphases = configs.filter(c => c.config_type === 'emphasis');

  const sections: string[] = [];

  // Secao de correcoes (diagnosticos perdidos)
  if (corrections.length > 0) {
    sections.push('## CORRECOES BASEADAS EM FEEDBACK MEDICO\n');
    sections.push('As seguintes observacoes sao baseadas em feedback de medicos especialistas:\n');

    corrections.forEach((c, i) => {
      sections.push(`${i + 1}. ${c.content.message}`);
      if (c.content.suggestion && c.content.suggestion.length > 0) {
        sections.push('   Sinais a observar:');
        c.content.suggestion.forEach(s => sections.push(`   - ${s}`));
      }
      sections.push('');
    });
  }

  // Secao de exclusoes (falsos positivos)
  if (exclusions.length > 0) {
    sections.push('## ALERTAS DE FALSOS POSITIVOS\n');
    sections.push('Os seguintes diagnosticos tem gerado falsos positivos frequentes:\n');

    exclusions.forEach((c, i) => {
      sections.push(`${i + 1}. ${c.content.message}`);
      if (c.content.criteria && c.content.criteria.length > 0) {
        sections.push('   Criterios obrigatorios:');
        c.content.criteria.forEach(cr => sections.push(`   - ${cr}`));
      }
      sections.push('');
    });
  }

  // Secao de enfases (biomarcadores)
  if (emphases.length > 0) {
    sections.push('## BIOMARCADORES COM ATENCAO ESPECIAL\n');

    emphases.forEach((c, i) => {
      sections.push(`${i + 1}. ${c.content.message}`);
      if (c.content.characteristics && c.content.characteristics.length > 0) {
        sections.push('   Caracteristicas:');
        c.content.characteristics.forEach(ch => sections.push(`   - ${ch}`));
      }
      sections.push('');
    });
  }

  // Se nao houver correcoes, retorna prompt original
  if (sections.length === 0) {
    return basePrompt;
  }

  // Inserir correcoes antes da secao "IMPORTANTE"
  const correctionBlock = sections.join('\n');

  if (basePrompt.includes('IMPORTANTE:')) {
    return basePrompt.replace(
      'IMPORTANTE:',
      `${correctionBlock}\nIMPORTANTE:`
    );
  }

  // Se nao encontrar "IMPORTANTE:", adiciona no final
  return `${basePrompt}\n\n${correctionBlock}`;
}

/**
 * Obtem prompt completo com correcoes dinamicas aplicadas
 */
async function getDynamicPrompt(
  supabaseClient: any,
  examType: string,
  isBilateral: boolean
): Promise<{ prompt: string; correctionsApplied: number }> {
  // Obter prompt base
  const basePrompt = getPromptForExamType(examType, isBilateral);

  // Buscar configuracoes dinamicas
  const configs = await fetchPromptConfigs(supabaseClient, examType);

  if (configs.length === 0) {
    console.log('[analyze-image] No dynamic corrections found for', examType);
    return { prompt: basePrompt, correctionsApplied: 0 };
  }

  console.log('[analyze-image] Applying', configs.length, 'dynamic corrections for', examType);

  // Aplicar correcoes
  const enhancedPrompt = applyDynamicCorrections(basePrompt, configs);

  return {
    prompt: enhancedPrompt,
    correctionsApplied: configs.length
  };
}

// ============= HANDLER PRINCIPAL =============

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[analyze-image] Request received');

    // Validate authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[analyze-image] Missing or invalid authorization header');
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Validate JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('[analyze-image] JWT validation failed:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log('[analyze-image] User authenticated:', userId);

    // Parse request body
    const { exam_id } = await req.json();
    
    if (!exam_id) {
      return new Response(
        JSON.stringify({ error: 'exam_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[analyze-image] Processing exam:', exam_id);

    // Fetch exam data
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('*, patients(name)')
      .eq('id', exam_id)
      .single();

    if (examError || !exam) {
      console.error('[analyze-image] Exam not found:', examError);
      return new Response(
        JSON.stringify({ error: 'Exame não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isBilateral = exam.eye === 'both';
    console.log('[analyze-image] Exam found:', { type: exam.exam_type, eye: exam.eye, bilateral: isBilateral });

    // Update exam status to analyzing
    await supabase
      .from('exams')
      .update({ status: 'analyzing' })
      .eq('id', exam_id);

    // Fetch exam images
    const { data: images, error: imagesError } = await supabase
      .from('exam_images')
      .select('*')
      .eq('exam_id', exam_id)
      .order('sequence', { ascending: true });

    if (imagesError || !images || images.length === 0) {
      console.error('[analyze-image] No images found:', imagesError);
      await supabase.from('exams').update({ status: 'pending' }).eq('id', exam_id);
      return new Response(
        JSON.stringify({ error: 'Nenhuma imagem encontrada para este exame' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[analyze-image] Found', images.length, 'images');

    // Use service role client for storage access
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Prepare images for analysis
    const imageContents: { type: string; image_url: { url: string } }[] = [];
    
    try {
      if (isBilateral && images.length >= 2) {
        // For bilateral exams, include both images
        // Separate images by eye
        const odImages = images.filter(img => img.eye === 'od');
        const oeImages = images.filter(img => img.eye === 'oe');
        
        if (odImages.length > 0) {
          const odBase64 = await downloadImageAsBase64(odImages[0].image_url, serviceClient);
          imageContents.push({ type: 'image_url', image_url: { url: odBase64 } });
          console.log('[analyze-image] OD image converted to base64');
        }
        
        if (oeImages.length > 0) {
          const oeBase64 = await downloadImageAsBase64(oeImages[0].image_url, serviceClient);
          imageContents.push({ type: 'image_url', image_url: { url: oeBase64 } });
          console.log('[analyze-image] OE image converted to base64');
        }
        
        // If we don't have both, fall back to first two images
        if (imageContents.length < 2) {
          for (let i = 0; i < Math.min(2, images.length); i++) {
            if (imageContents.length >= 2) break;
            const base64 = await downloadImageAsBase64(images[i].image_url, serviceClient);
            imageContents.push({ type: 'image_url', image_url: { url: base64 } });
          }
        }
      } else {
        // Single eye - just use first image
        const imageBase64 = await downloadImageAsBase64(images[0].image_url, serviceClient);
        imageContents.push({ type: 'image_url', image_url: { url: imageBase64 } });
      }
      
      console.log('[analyze-image] Total images prepared:', imageContents.length);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('[analyze-image] Image download error:', error);
      await supabase.from('exams').update({ status: 'pending' }).eq('id', exam_id);
      return new Response(
        JSON.stringify({ error: `Erro ao processar imagem: ${errorMessage}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the appropriate prompt with dynamic corrections
    const { prompt, correctionsApplied } = await getDynamicPrompt(
      serviceClient,
      exam.exam_type,
      isBilateral
    );
    console.log('[analyze-image] Using prompt for:', exam.exam_type, 'bilateral:', isBilateral, 'corrections:', correctionsApplied);

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('[analyze-image] LOVABLE_API_KEY not configured');
      await supabase.from('exams').update({ status: 'pending' }).eq('id', exam_id);
      return new Response(
        JSON.stringify({ error: 'Configuração de IA não encontrada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[analyze-image] Calling Lovable AI Gateway...');
    
    // Build message content with text prompt and images
    const messageContent: any[] = [{ type: 'text', text: prompt }];
    imageContents.forEach(img => messageContent.push(img));
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'user',
            content: messageContent
          }
        ],
        max_tokens: 8000,
      }),
    });

    // Handle rate limits and payment errors
    if (aiResponse.status === 429) {
      console.error('[analyze-image] Rate limit exceeded');
      await supabase.from('exams').update({ status: 'pending' }).eq('id', exam_id);
      return new Response(
        JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (aiResponse.status === 402) {
      console.error('[analyze-image] Payment required');
      await supabase.from('exams').update({ status: 'pending' }).eq('id', exam_id);
      return new Response(
        JSON.stringify({ error: 'Créditos de IA esgotados. Adicione créditos em Configurações > Workspace > Usage.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[analyze-image] AI Gateway error:', aiResponse.status, errorText);
      await supabase.from('exams').update({ status: 'pending' }).eq('id', exam_id);
      return new Response(
        JSON.stringify({ error: 'Erro ao processar análise de IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResult = await aiResponse.json();
    console.log('[analyze-image] AI response received');

    // Extract content from AI response
    const aiContent = aiResult.choices?.[0]?.message?.content;
    if (!aiContent) {
      console.error('[analyze-image] No content in AI response');
      await supabase.from('exams').update({ status: 'pending' }).eq('id', exam_id);
      return new Response(
        JSON.stringify({ error: 'Resposta de IA vazia' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse JSON from AI response
    let parsedResponse: any;
    try {
      parsedResponse = extractJsonFromResponse(aiContent);
      console.log('[analyze-image] JSON parsed successfully, bilateral:', parsedResponse.bilateral === true);
    } catch (parseError) {
      console.error('[analyze-image] JSON parse error:', parseError);
      console.log('[analyze-image] Raw AI content:', aiContent.substring(0, 500));
      await supabase.from('exams').update({ status: 'pending' }).eq('id', exam_id);
      return new Response(
        JSON.stringify({ error: 'Erro ao processar resposta da IA. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map response to database schema
    const mappedData = mapResponseToAnalysis(exam.exam_type, parsedResponse, isBilateral);

    // Insert analysis into database
    const { data: analysis, error: insertError } = await supabase
      .from('ai_analysis')
      .insert({
        exam_id,
        quality_score: mappedData.quality_score,
        findings: mappedData.findings,
        biomarkers: mappedData.biomarkers,
        optic_nerve_analysis: mappedData.optic_nerve_analysis,
        retinography_analysis: mappedData.retinography_analysis,
        measurements: mappedData.measurements,
        diagnosis: mappedData.diagnosis,
        recommendations: mappedData.recommendations,
        risk_classification: mappedData.risk_classification,
        raw_response: {
          ...parsedResponse,
          _metadata: {
            corrections_applied: correctionsApplied,
            analyzed_at: new Date().toISOString()
          }
        },
        model_used: 'google/gemini-2.5-pro',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[analyze-image] Insert error:', insertError);
      await supabase.from('exams').update({ status: 'pending' }).eq('id', exam_id);
      return new Response(
        JSON.stringify({ error: 'Erro ao salvar análise' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[analyze-image] Analysis saved:', analysis.id);

    // Update exam status to analyzed
    await supabase
      .from('exams')
      .update({ status: 'analyzed' })
      .eq('id', exam_id);

    console.log('[analyze-image] Exam status updated to analyzed');

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        analysis_id: analysis.id,
        exam_id,
        bilateral: isBilateral,
        message: 'Análise concluída com sucesso',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    console.error('[analyze-image] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
