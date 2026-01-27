import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer";

// Register fonts for better typography
Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica" },
    { src: "Helvetica-Bold", fontWeight: "bold" },
    { src: "Helvetica-Oblique", fontStyle: "italic" },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 20,
    borderBottom: "2px solid #1e3a5f",
    paddingBottom: 15,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  clinicInfo: {
    flex: 1,
  },
  clinicName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e3a5f",
    marginBottom: 4,
  },
  clinicDetails: {
    fontSize: 9,
    color: "#666666",
    lineHeight: 1.4,
  },
  logo: {
    width: 80,
    height: 80,
    objectFit: "contain",
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
    color: "#1e3a5f",
    textTransform: "uppercase",
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#1e3a5f",
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: "1px solid #e0e0e0",
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    fontWeight: "bold",
    width: 120,
    color: "#333333",
  },
  value: {
    flex: 1,
    color: "#000000",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  gridItem: {
    width: "50%",
    marginBottom: 4,
  },
  image: {
    width: "100%",
    maxHeight: 200,
    objectFit: "contain",
    marginVertical: 10,
    border: "1px solid #e0e0e0",
  },
  text: {
    marginBottom: 6,
    lineHeight: 1.5,
    textAlign: "justify",
  },
  list: {
    marginLeft: 10,
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 4,
  },
  bullet: {
    width: 15,
    color: "#1e3a5f",
  },
  listText: {
    flex: 1,
    lineHeight: 1.4,
  },
  table: {
    marginTop: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1px solid #e0e0e0",
    paddingVertical: 4,
  },
  tableHeader: {
    backgroundColor: "#f5f5f5",
    borderBottom: "2px solid #1e3a5f",
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 4,
  },
  tableCellHeader: {
    fontWeight: "bold",
    color: "#1e3a5f",
  },
  biomarkerNormal: {
    backgroundColor: "#dcfce7",
    color: "#166534",
    padding: "2px 6px",
    borderRadius: 3,
    fontSize: 8,
    marginRight: 4,
    marginBottom: 4,
  },
  biomarkerAbnormal: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    padding: "2px 6px",
    borderRadius: 3,
    fontSize: 8,
    marginRight: 4,
    marginBottom: 4,
  },
  biomarkerBorderline: {
    backgroundColor: "#fef9c3",
    color: "#854d0e",
    padding: "2px 6px",
    borderRadius: 3,
    fontSize: 8,
    marginRight: 4,
    marginBottom: 4,
  },
  disclaimer: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#fef3c7",
    borderRadius: 4,
    border: "1px solid #f59e0b",
  },
  disclaimerTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#92400e",
    marginBottom: 4,
  },
  disclaimerText: {
    fontSize: 8,
    color: "#92400e",
    lineHeight: 1.4,
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
  },
  signature: {
    marginTop: 30,
    alignItems: "center",
  },
  signatureImage: {
    width: 150,
    height: 60,
    objectFit: "contain",
  },
  signatureLine: {
    width: 200,
    borderTop: "1px solid #000000",
    marginTop: 10,
    paddingTop: 5,
    textAlign: "center",
  },
  signatureText: {
    fontSize: 9,
    textAlign: "center",
    color: "#333333",
    marginTop: 2,
  },
  approvalInfo: {
    marginTop: 20,
    paddingTop: 15,
    borderTop: "1px solid #e0e0e0",
    fontSize: 8,
    color: "#666666",
    textAlign: "center",
  },
});

export interface ReportData {
  exam: {
    id: string;
    exam_type: string;
    eye: string;
    exam_date: string;
    equipment?: string;
    clinical_indication?: string;
    status: string;
  };
  patient: {
    name: string;
    birth_date?: string;
    record_number?: string;
    gender?: string;
  };
  analysis?: {
    quality_score?: string;
    findings?: any;
    biomarkers?: any;
    measurements?: any;
    diagnosis?: string[];
    recommendations?: string[];
    risk_classification?: string;
  };
  doctorNotes?: string;
  profile: {
    full_name: string;
    crm: string;
    crm_uf: string;
    clinic_name?: string;
    clinic_address?: string;
    clinic_phone?: string;
    clinic_cnpj?: string;
    clinic_logo_url?: string;
    signature_url?: string;
    include_logo_in_pdf?: boolean;
    include_signature_in_pdf?: boolean;
  };
  imageUrl?: string;
  approvedAt?: string;
}

const examTypeLabels: Record<string, string> = {
  oct_macular: "OCT MACULAR",
  oct_nerve: "OCT NERVO ÓPTICO",
  retinography: "RETINOGRAFIA",
};

const getEyeLabel = (eye: string) => {
  switch (eye) {
    case "od": return "OD (Olho Direito)";
    case "oe": return "OE (Olho Esquerdo)";
    case "both": return "Ambos os Olhos";
    default: return eye;
  }
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatFindings = (findings: any): string => {
  if (!findings) return "";
  if (typeof findings === "string") return findings;
  if (typeof findings === "object") {
    // Handle different finding structures
    if (findings.summary) return findings.summary;
    if (findings.description) return findings.description;
    if (findings.text) return findings.text;
    // Flatten object to readable text
    return Object.entries(findings)
      .map(([key, value]) => {
        if (typeof value === "string") return `${key}: ${value}`;
        if (typeof value === "object" && value !== null) {
          return `${key}: ${JSON.stringify(value)}`;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
};

const getBiomarkerStatus = (biomarker: any): "normal" | "abnormal" | "borderline" => {
  if (!biomarker) return "normal";
  if (typeof biomarker === "string") {
    const lower = biomarker.toLowerCase();
    if (lower.includes("anormal") || lower.includes("alterado") || lower.includes("presente")) {
      return "abnormal";
    }
    if (lower.includes("limítrofe") || lower.includes("borderline") || lower.includes("suspeito")) {
      return "borderline";
    }
  }
  if (typeof biomarker === "object" && biomarker.status) {
    const status = biomarker.status.toLowerCase();
    if (status === "abnormal" || status === "anormal") return "abnormal";
    if (status === "borderline") return "borderline";
  }
  return "normal";
};

export const ExamReportPdf: React.FC<{ data: ReportData }> = ({ data }) => {
  const { exam, patient, analysis, doctorNotes, profile, imageUrl, approvedAt } = data;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.clinicInfo}>
              <Text style={styles.clinicName}>
                {profile.clinic_name || "Consultório Oftalmológico"}
              </Text>
              <Text style={styles.clinicDetails}>
                {profile.clinic_address && `${profile.clinic_address}\n`}
                {profile.clinic_phone && `Tel: ${profile.clinic_phone}`}
                {profile.clinic_cnpj && ` | CNPJ: ${profile.clinic_cnpj}`}
              </Text>
            </View>
            {profile.include_logo_in_pdf && profile.clinic_logo_url && (
              <Image style={styles.logo} src={profile.clinic_logo_url} />
            )}
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>
          LAUDO DE {examTypeLabels[exam.exam_type] || exam.exam_type}
        </Text>

        {/* Patient Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DADOS DO PACIENTE</Text>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <View style={styles.row}>
                <Text style={styles.label}>Paciente:</Text>
                <Text style={styles.value}>{patient.name}</Text>
              </View>
            </View>
            {patient.record_number && (
              <View style={styles.gridItem}>
                <View style={styles.row}>
                  <Text style={styles.label}>Prontuário:</Text>
                  <Text style={styles.value}>{patient.record_number}</Text>
                </View>
              </View>
            )}
            {patient.birth_date && (
              <View style={styles.gridItem}>
                <View style={styles.row}>
                  <Text style={styles.label}>Data Nasc.:</Text>
                  <Text style={styles.value}>
                    {new Date(patient.birth_date).toLocaleDateString("pt-BR")}
                  </Text>
                </View>
              </View>
            )}
            {patient.gender && (
              <View style={styles.gridItem}>
                <View style={styles.row}>
                  <Text style={styles.label}>Sexo:</Text>
                  <Text style={styles.value}>
                    {patient.gender === "M" ? "Masculino" : "Feminino"}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Exam Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DADOS DO EXAME</Text>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <View style={styles.row}>
                <Text style={styles.label}>Tipo:</Text>
                <Text style={styles.value}>
                  {examTypeLabels[exam.exam_type] || exam.exam_type}
                </Text>
              </View>
            </View>
            <View style={styles.gridItem}>
              <View style={styles.row}>
                <Text style={styles.label}>Olho:</Text>
                <Text style={styles.value}>{getEyeLabel(exam.eye)}</Text>
              </View>
            </View>
            <View style={styles.gridItem}>
              <View style={styles.row}>
                <Text style={styles.label}>Data:</Text>
                <Text style={styles.value}>{formatDate(exam.exam_date)}</Text>
              </View>
            </View>
            {exam.equipment && (
              <View style={styles.gridItem}>
                <View style={styles.row}>
                  <Text style={styles.label}>Equipamento:</Text>
                  <Text style={styles.value}>{exam.equipment}</Text>
                </View>
              </View>
            )}
          </View>
          {exam.clinical_indication && (
            <View style={styles.row}>
              <Text style={styles.label}>Indicação Clínica:</Text>
              <Text style={styles.value}>{exam.clinical_indication}</Text>
            </View>
          )}
        </View>

        {/* Exam Image */}
        {imageUrl && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>IMAGEM DO EXAME</Text>
            <Image style={styles.image} src={imageUrl} />
          </View>
        )}

        {/* AI Analysis */}
        {analysis && (
          <>
            {/* Quality */}
            {analysis.quality_score && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>QUALIDADE DA IMAGEM</Text>
                <Text style={styles.text}>{analysis.quality_score}</Text>
              </View>
            )}

            {/* Findings */}
            {analysis.findings && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>ACHADOS</Text>
                <Text style={styles.text}>{formatFindings(analysis.findings)}</Text>
              </View>
            )}

            {/* Biomarkers */}
            {analysis.biomarkers && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>BIOMARCADORES</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {Array.isArray(analysis.biomarkers) ? (
                    analysis.biomarkers.map((b: any, i: number) => {
                      const status = getBiomarkerStatus(b);
                      const styleName = status === "abnormal" 
                        ? styles.biomarkerAbnormal 
                        : status === "borderline"
                        ? styles.biomarkerBorderline
                        : styles.biomarkerNormal;
                      return (
                        <Text key={i} style={styleName}>
                          {typeof b === "string" ? b : b.name || JSON.stringify(b)}
                        </Text>
                      );
                    })
                  ) : typeof analysis.biomarkers === "object" ? (
                    Object.entries(analysis.biomarkers).map(([key, value]: [string, any], i) => {
                      const status = getBiomarkerStatus(value);
                      const styleName = status === "abnormal" 
                        ? styles.biomarkerAbnormal 
                        : status === "borderline"
                        ? styles.biomarkerBorderline
                        : styles.biomarkerNormal;
                      return (
                        <Text key={i} style={styleName}>
                          {key}: {typeof value === "string" ? value : value?.status || "✓"}
                        </Text>
                      );
                    })
                  ) : (
                    <Text style={styles.text}>{String(analysis.biomarkers)}</Text>
                  )}
                </View>
              </View>
            )}

            {/* Measurements */}
            {analysis.measurements && Object.keys(analysis.measurements).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>MEDIÇÕES</Text>
                <View style={styles.table}>
                  <View style={[styles.tableRow, styles.tableHeader]}>
                    <Text style={[styles.tableCell, styles.tableCellHeader]}>Parâmetro</Text>
                    <Text style={[styles.tableCell, styles.tableCellHeader]}>Valor</Text>
                    <Text style={[styles.tableCell, styles.tableCellHeader]}>Referência</Text>
                  </View>
                  {Object.entries(analysis.measurements).map(([key, value]: [string, any], i) => (
                    <View key={i} style={styles.tableRow}>
                      <Text style={styles.tableCell}>{key}</Text>
                      <Text style={styles.tableCell}>
                        {typeof value === "object" ? value.value || JSON.stringify(value) : value}
                      </Text>
                      <Text style={styles.tableCell}>
                        {typeof value === "object" && value.reference ? value.reference : "-"}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Diagnosis */}
            {analysis.diagnosis && analysis.diagnosis.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>IMPRESSÃO DIAGNÓSTICA</Text>
                <View style={styles.list}>
                  {analysis.diagnosis.map((d: string, i: number) => (
                    <View key={i} style={styles.listItem}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.listText}>{d}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Recommendations */}
            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>RECOMENDAÇÕES</Text>
                <View style={styles.list}>
                  {analysis.recommendations.map((r: string, i: number) => (
                    <View key={i} style={styles.listItem}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.listText}>{r}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {/* Doctor Notes */}
        {doctorNotes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>OBSERVAÇÕES DO MÉDICO</Text>
            <Text style={styles.text}>{doctorNotes}</Text>
          </View>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>⚠️ AVISO IMPORTANTE</Text>
          <Text style={styles.disclaimerText}>
            Este laudo foi gerado com auxílio de Inteligência Artificial e constitui uma ferramenta
            de APOIO DIAGNÓSTICO. A interpretação final e a conduta clínica são de exclusiva
            responsabilidade do médico assistente. Este documento não substitui a avaliação
            clínica completa do paciente.
          </Text>
        </View>

        {/* Signature */}
        <View style={styles.signature}>
          {profile.include_signature_in_pdf && profile.signature_url && (
            <Image style={styles.signatureImage} src={profile.signature_url} />
          )}
          <View style={styles.signatureLine}>
            <Text>{profile.full_name}</Text>
            <Text style={styles.signatureText}>
              CRM {profile.crm}/{profile.crm_uf}
            </Text>
          </View>
        </View>

        {/* Approval Info */}
        {approvedAt && (
          <Text style={styles.approvalInfo}>
            Laudo aprovado em {formatDate(approvedAt)} • Documento gerado eletronicamente
          </Text>
        )}
      </Page>
    </Document>
  );
};

export default ExamReportPdf;
