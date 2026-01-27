-- =====================================================
-- OphtalAI Database Schema
-- =====================================================

-- 1. Create custom types/enums
CREATE TYPE public.app_role AS ENUM ('admin', 'doctor');
CREATE TYPE public.profile_status AS ENUM ('pending', 'approved', 'suspended');
CREATE TYPE public.exam_type AS ENUM ('oct_macular', 'oct_nerve', 'retinography');
CREATE TYPE public.eye_type AS ENUM ('od', 'oe', 'both');
CREATE TYPE public.exam_status AS ENUM ('pending', 'analyzing', 'analyzed', 'approved');
CREATE TYPE public.specialty_type AS ENUM ('oftalmologia', 'retina', 'glaucoma');

-- 2. Create user_roles table (separate for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'doctor',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- 3. Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    crm TEXT NOT NULL,
    crm_uf TEXT NOT NULL,
    specialty specialty_type NOT NULL DEFAULT 'oftalmologia',
    phone TEXT,
    avatar_url TEXT,
    clinic_name TEXT,
    clinic_logo_url TEXT,
    clinic_address TEXT,
    clinic_phone TEXT,
    clinic_cnpj TEXT,
    signature_url TEXT,
    default_report_template TEXT,
    include_logo_in_pdf BOOLEAN DEFAULT true,
    include_signature_in_pdf BOOLEAN DEFAULT true,
    theme TEXT DEFAULT 'light',
    language TEXT DEFAULT 'pt-BR',
    email_notifications BOOLEAN DEFAULT true,
    status profile_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Create patients table
CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    birth_date DATE,
    gender TEXT CHECK (gender IN ('M', 'F')),
    cpf TEXT,
    record_number TEXT,
    phone TEXT,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Create exams table
CREATE TABLE public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    exam_type exam_type NOT NULL,
    eye eye_type NOT NULL,
    exam_date DATE NOT NULL DEFAULT CURRENT_DATE,
    equipment TEXT,
    clinical_indication TEXT,
    status exam_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Create exam_images table
CREATE TABLE public.exam_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
    image_url TEXT NOT NULL,
    eye eye_type NOT NULL,
    sequence INTEGER DEFAULT 1,
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Create ai_analysis table
CREATE TABLE public.ai_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
    model_used TEXT DEFAULT 'google/gemini-2.5-pro',
    raw_response JSONB,
    quality_score TEXT,
    findings JSONB,
    biomarkers JSONB,
    optic_nerve_analysis JSONB,
    retinography_analysis JSONB,
    measurements JSONB,
    diagnosis TEXT[],
    recommendations TEXT[],
    risk_classification TEXT,
    analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Create reports table
CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
    ai_analysis_id UUID REFERENCES public.ai_analysis(id) ON DELETE SET NULL,
    final_findings JSONB,
    doctor_notes TEXT,
    final_diagnosis TEXT,
    final_recommendations TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    pdf_url TEXT,
    share_token TEXT UNIQUE,
    share_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. Create exam_comparisons table
CREATE TABLE public.exam_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    exam_ids UUID[] NOT NULL,
    comparison_notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 10. Create audit_log table for tracking critical actions
CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- Security Functions (SECURITY DEFINER)
-- =====================================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Function to check if user profile is approved
CREATE OR REPLACE FUNCTION public.is_approved_doctor(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND status = 'approved'
  )
$$;

-- Function to get user's profile id
CREATE OR REPLACE FUNCTION public.get_profile_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = _user_id
$$;

-- =====================================================
-- Triggers for updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_patients_updated_at
    BEFORE UPDATE ON public.patients
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exams_updated_at
    BEFORE UPDATE ON public.exams
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- Enable Row Level Security
-- =====================================================

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies
-- =====================================================

-- user_roles policies
CREATE POLICY "Users can view their own roles"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
    ON public.user_roles FOR SELECT
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage roles"
    ON public.user_roles FOR ALL
    USING (public.is_admin(auth.uid()));

-- profiles policies
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any profile"
    ON public.profiles FOR UPDATE
    USING (public.is_admin(auth.uid()));

-- patients policies
CREATE POLICY "Approved doctors can view patients they created"
    ON public.patients FOR SELECT
    USING (
        public.is_approved_doctor(auth.uid()) 
        AND created_by = public.get_profile_id(auth.uid())
    );

CREATE POLICY "Admins can view all patients"
    ON public.patients FOR SELECT
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Approved doctors can create patients"
    ON public.patients FOR INSERT
    WITH CHECK (
        public.is_approved_doctor(auth.uid())
        AND created_by = public.get_profile_id(auth.uid())
    );

CREATE POLICY "Approved doctors can update their patients"
    ON public.patients FOR UPDATE
    USING (
        public.is_approved_doctor(auth.uid()) 
        AND created_by = public.get_profile_id(auth.uid())
    );

CREATE POLICY "Approved doctors can delete their patients"
    ON public.patients FOR DELETE
    USING (
        public.is_approved_doctor(auth.uid()) 
        AND created_by = public.get_profile_id(auth.uid())
    );

-- exams policies
CREATE POLICY "Approved doctors can view their exams"
    ON public.exams FOR SELECT
    USING (
        public.is_approved_doctor(auth.uid()) 
        AND doctor_id = public.get_profile_id(auth.uid())
    );

CREATE POLICY "Admins can view all exams"
    ON public.exams FOR SELECT
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Approved doctors can create exams"
    ON public.exams FOR INSERT
    WITH CHECK (
        public.is_approved_doctor(auth.uid())
        AND doctor_id = public.get_profile_id(auth.uid())
    );

CREATE POLICY "Approved doctors can update their exams"
    ON public.exams FOR UPDATE
    USING (
        public.is_approved_doctor(auth.uid()) 
        AND doctor_id = public.get_profile_id(auth.uid())
    );

CREATE POLICY "Approved doctors can delete their exams"
    ON public.exams FOR DELETE
    USING (
        public.is_approved_doctor(auth.uid()) 
        AND doctor_id = public.get_profile_id(auth.uid())
    );

-- exam_images policies
CREATE POLICY "Users can view images of their exams"
    ON public.exam_images FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.exams 
            WHERE exams.id = exam_images.exam_id 
            AND exams.doctor_id = public.get_profile_id(auth.uid())
        )
    );

CREATE POLICY "Admins can view all images"
    ON public.exam_images FOR SELECT
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can insert images to their exams"
    ON public.exam_images FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.exams 
            WHERE exams.id = exam_images.exam_id 
            AND exams.doctor_id = public.get_profile_id(auth.uid())
        )
    );

CREATE POLICY "Users can delete images of their exams"
    ON public.exam_images FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.exams 
            WHERE exams.id = exam_images.exam_id 
            AND exams.doctor_id = public.get_profile_id(auth.uid())
        )
    );

-- ai_analysis policies
CREATE POLICY "Users can view analysis of their exams"
    ON public.ai_analysis FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.exams 
            WHERE exams.id = ai_analysis.exam_id 
            AND exams.doctor_id = public.get_profile_id(auth.uid())
        )
    );

CREATE POLICY "Admins can view all analysis"
    ON public.ai_analysis FOR SELECT
    USING (public.is_admin(auth.uid()));

CREATE POLICY "System can insert analysis"
    ON public.ai_analysis FOR INSERT
    WITH CHECK (true);

-- reports policies
CREATE POLICY "Users can view reports of their exams"
    ON public.reports FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.exams 
            WHERE exams.id = reports.exam_id 
            AND exams.doctor_id = public.get_profile_id(auth.uid())
        )
    );

CREATE POLICY "Admins can view all reports"
    ON public.reports FOR SELECT
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can create reports for their exams"
    ON public.reports FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.exams 
            WHERE exams.id = reports.exam_id 
            AND exams.doctor_id = public.get_profile_id(auth.uid())
        )
    );

CREATE POLICY "Users can update reports of their exams"
    ON public.reports FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.exams 
            WHERE exams.id = reports.exam_id 
            AND exams.doctor_id = public.get_profile_id(auth.uid())
        )
    );

-- Public access to shared reports (via share_token)
CREATE POLICY "Anyone can view shared reports"
    ON public.reports FOR SELECT
    USING (
        share_token IS NOT NULL 
        AND share_expires_at > now()
    );

-- exam_comparisons policies
CREATE POLICY "Users can view their comparisons"
    ON public.exam_comparisons FOR SELECT
    USING (created_by = public.get_profile_id(auth.uid()));

CREATE POLICY "Users can create comparisons"
    ON public.exam_comparisons FOR INSERT
    WITH CHECK (created_by = public.get_profile_id(auth.uid()));

CREATE POLICY "Users can delete their comparisons"
    ON public.exam_comparisons FOR DELETE
    USING (created_by = public.get_profile_id(auth.uid()));

-- audit_log policies
CREATE POLICY "Admins can view audit logs"
    ON public.audit_log FOR SELECT
    USING (public.is_admin(auth.uid()));

CREATE POLICY "System can insert audit logs"
    ON public.audit_log FOR INSERT
    WITH CHECK (true);

-- =====================================================
-- Storage Buckets
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('exam-images', 'exam-images', false),
    ('report-pdfs', 'report-pdfs', false),
    ('avatars', 'avatars', true),
    ('clinic-logos', 'clinic-logos', true),
    ('signatures', 'signatures', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for exam-images
CREATE POLICY "Users can upload exam images"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'exam-images' 
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can view their exam images"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'exam-images' 
        AND auth.uid() IS NOT NULL
    );

-- Storage policies for avatars (public)
CREATE POLICY "Anyone can view avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars' 
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can update their avatar"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'avatars' 
        AND auth.uid() IS NOT NULL
    );

-- Storage policies for clinic-logos (public)
CREATE POLICY "Anyone can view clinic logos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'clinic-logos');

CREATE POLICY "Users can upload clinic logos"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'clinic-logos' 
        AND auth.uid() IS NOT NULL
    );

-- Storage policies for signatures
CREATE POLICY "Users can view signatures"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'signatures' 
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can upload signatures"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'signatures' 
        AND auth.uid() IS NOT NULL
    );

-- Storage policies for report-pdfs
CREATE POLICY "Users can view report PDFs"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'report-pdfs' 
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can upload report PDFs"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'report-pdfs' 
        AND auth.uid() IS NOT NULL
    );

-- =====================================================
-- Indexes for better performance
-- =====================================================

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_status ON public.profiles(status);
CREATE INDEX idx_patients_created_by ON public.patients(created_by);
CREATE INDEX idx_patients_name ON public.patients(name);
CREATE INDEX idx_exams_doctor_id ON public.exams(doctor_id);
CREATE INDEX idx_exams_patient_id ON public.exams(patient_id);
CREATE INDEX idx_exams_status ON public.exams(status);
CREATE INDEX idx_exams_exam_date ON public.exams(exam_date);
CREATE INDEX idx_exam_images_exam_id ON public.exam_images(exam_id);
CREATE INDEX idx_ai_analysis_exam_id ON public.ai_analysis(exam_id);
CREATE INDEX idx_reports_exam_id ON public.reports(exam_id);
CREATE INDEX idx_reports_share_token ON public.reports(share_token);