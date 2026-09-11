
/**
 * CreatorOnboardingModal
 *
 * Three-step modal that walks a user through applying to become a Verified Writer.
 *
 * Step 1 — Identity     : Legal name, pen name, portfolio URL
 * Step 2 — Sample Work  : Sample title, synopsis (min 50 chars)
 * Step 3 — Pitch        : Serialisation pitch (min 100 chars), primary genre + review
 *
 * Constitution refs:
 *   §4.2 Tailwind only, no inline styles except dynamic values
 *   §8.1 All server state via TanStack Query (mutation via useCreatorApplication)
 *   §P1  Mobile-first, 44px touch targets
 */

import React, { useState } from 'react';
import {
  X, Feather, ChevronRight, ChevronLeft,
  CheckCircle, Clock, AlertCircle, Loader2,
} from 'lucide-react';
import { useCreatorApplication } from '../hooks/useCreatorApplication';
import { useCategoriesQuery } from '../../../hooks/useCategoriesQuery';
import type { CreatorApplicationInput } from '@arcanium/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreatorOnboardingModalProps {
  isOpen:   boolean;
  onClose:  () => void;
}

type FormData = CreatorApplicationInput;

const EMPTY_FORM: FormData = {
  applicantName:  '',
  penName:        '',
  portfolioUrl:   '',
  sampleTitle:    '',
  sampleSynopsis: '',
  pitch:          '',
  primaryGenre:   '',
};

const STEPS = ['Identity', 'Sample Work', 'Pitch & Genre'];

// ---------------------------------------------------------------------------
// Step-level validation helpers
// ---------------------------------------------------------------------------

function validateStep(step: number, form: FormData): string | null {
  if (step === 0) {
    if (!form.applicantName.trim())  return 'Please enter your full name.';
    if (!form.penName.trim())        return 'Please enter your pen name.';
    if (
      form.portfolioUrl &&
      form.portfolioUrl.trim() !== '' &&
      !/^https?:\/\/.+/.test(form.portfolioUrl.trim())
    ) return 'Portfolio URL must start with http:// or https://.';
  }
  if (step === 1) {
    if (!form.sampleTitle.trim())           return 'Please enter your sample work title.';
    if (form.sampleSynopsis.trim().length < 50)
      return `Synopsis is too short — add ${50 - form.sampleSynopsis.trim().length} more characters.`;
  }
  if (step === 2) {
    if (form.pitch.trim().length < 100)
      return `Pitch is too short — add ${100 - form.pitch.trim().length} more characters.`;
    if (!form.primaryGenre) return 'Please select your primary genre.';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <React.Fragment key={i}>
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              i < current
                ? 'bg-[#43335A] dark:bg-[#684C8B] text-white'
                : i === current
                ? 'bg-[#43335A] dark:bg-[#684C8B] text-white ring-2 ring-[#43335A]/30 dark:ring-[#684C8B]/40'
                : 'bg-[#EFEAE2] dark:bg-[#2C2138] text-[#80778B] dark:text-[#6B6078]'
            }`}
          >
            {i < current ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
          </div>
          {i < total - 1 && (
            <div
              className={`flex-1 h-px transition-all ${
                i < current ? 'bg-[#43335A] dark:bg-[#684C8B]' : 'bg-[#EFEAE2] dark:bg-[#2C2138]'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-[#564D62] dark:text-[#C5BACF] mb-1.5">
      {children}
      {required && <span className="text-rose-500 ml-0.5">*</span>}
    </label>
  );
}

const inputCls =
  'w-full rounded-xl border border-[#EFEAE2] dark:border-[#352B44] bg-white dark:bg-[#1D1726] ' +
  'text-sm text-[#2D223B] dark:text-[#F1ECF7] placeholder:text-[#A59DB0] dark:placeholder:text-[#5A5268] ' +
  'px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-[#43335A]/30 dark:focus:ring-[#684C8B]/40 ' +
  'focus:border-[#43335A] dark:focus:border-[#684C8B] transition-all';

// ---------------------------------------------------------------------------
// Step panels
// ---------------------------------------------------------------------------

function StepIdentity({
  form, onChange,
}: { form: FormData; onChange: (k: keyof FormData, v: string) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <FieldLabel required>Full legal name</FieldLabel>
        <input
          className={inputCls}
          placeholder="e.g. Elara Nightwhisper"
          value={form.applicantName}
          onChange={(e) => onChange('applicantName', e.target.value)}
          maxLength={100}
        />
        <p className="mt-1 text-[10px] text-[#A59DB0] dark:text-[#6B6078]">
          Used for internal records only — not shown to readers.
        </p>
      </div>
      <div>
        <FieldLabel required>Pen name</FieldLabel>
        <input
          className={inputCls}
          placeholder="e.g. E. Nightwhisper"
          value={form.penName}
          onChange={(e) => onChange('penName', e.target.value)}
          maxLength={100}
        />
        <p className="mt-1 text-[10px] text-[#A59DB0] dark:text-[#6B6078]">
          This is the author name displayed on your published works.
        </p>
      </div>
      <div>
        <FieldLabel>Portfolio / social URL <span className="text-[#A59DB0] font-normal">(optional)</span></FieldLabel>
        <input
          className={inputCls}
          placeholder="https://royalroad.com/profile/..."
          value={form.portfolioUrl}
          onChange={(e) => onChange('portfolioUrl', e.target.value)}
          type="url"
        />
      </div>
    </div>
  );
}

function StepSampleWork({
  form, onChange,
}: { form: FormData; onChange: (k: keyof FormData, v: string) => void }) {
  const synopsisLen = form.sampleSynopsis.trim().length;
  return (
    <div className="space-y-4">
      <div>
        <FieldLabel required>Sample work title</FieldLabel>
        <input
          className={inputCls}
          placeholder="Title of an existing or planned work"
          value={form.sampleTitle}
          onChange={(e) => onChange('sampleTitle', e.target.value)}
          maxLength={300}
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <FieldLabel required>Synopsis</FieldLabel>
          <span className={`text-[10px] font-mono ${synopsisLen < 50 ? 'text-amber-500' : 'text-emerald-500'}`}>
            {synopsisLen} / 2000
          </span>
        </div>
        <textarea
          className={`${inputCls} resize-none`}
          rows={5}
          placeholder="Give us a compelling 2–3 paragraph overview of your story..."
          value={form.sampleSynopsis}
          onChange={(e) => onChange('sampleSynopsis', e.target.value)}
          maxLength={2000}
        />
        {synopsisLen > 0 && synopsisLen < 50 && (
          <p className="mt-1 text-[10px] text-amber-500">
            Minimum 50 characters — {50 - synopsisLen} more to go.
          </p>
        )}
      </div>
    </div>
  );
}

function StepPitch({
  form, onChange, genres,
}: {
  form: FormData;
  onChange: (k: keyof FormData, v: string) => void;
  genres: { id: string; name: string; genre: string }[];
}) {
  const pitchLen = form.pitch.trim().length;
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <FieldLabel required>Serialisation pitch</FieldLabel>
          <span className={`text-[10px] font-mono ${pitchLen < 100 ? 'text-amber-500' : 'text-emerald-500'}`}>
            {pitchLen} / 3000
          </span>
        </div>
        <textarea
          className={`${inputCls} resize-none`}
          rows={6}
          placeholder="Why should Arcanium readers follow your serialised work? Tell us about your writing style, update cadence, and long-term vision..."
          value={form.pitch}
          onChange={(e) => onChange('pitch', e.target.value)}
          maxLength={3000}
        />
        {pitchLen > 0 && pitchLen < 100 && (
          <p className="mt-1 text-[10px] text-amber-500">
            Minimum 100 characters — {100 - pitchLen} more to go.
          </p>
        )}
      </div>
      <div>
        <FieldLabel required>Primary genre</FieldLabel>
        <select
          className={inputCls}
          value={form.primaryGenre}
          onChange={(e) => onChange('primaryGenre', e.target.value)}
        >
          <option value="">Select a genre…</option>
          {genres.map((cat) => (
            <option key={cat.id} value={cat.genre}>{cat.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Success / pending states shown inside the modal after submission
// ---------------------------------------------------------------------------

function SubmittedState({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-5 py-6">
      <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center">
        <Clock className="w-8 h-8 text-emerald-500" />
      </div>
      <div>
        <h3 className="text-lg font-serif font-bold text-[#2D223B] dark:text-[#F1ECF7]">
          Application submitted
        </h3>
        <p className="text-sm text-[#80778B] dark:text-[#9F94AC] mt-1.5 max-w-xs">
          Our editorial team will review your pitch within 3–5 business days.
          You'll see your status update here and in your profile.
        </p>
      </div>
      <button
        onClick={onClose}
        className="px-6 py-2.5 rounded-xl bg-[#43335A] dark:bg-[#684C8B] text-white text-sm font-semibold hover:bg-[#342647] dark:hover:bg-[#563D75] active:scale-95 transition-all"
      >
        Got it
      </button>
    </div>
  );
}

function AlreadyPendingState({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-5 py-6">
      <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center">
        <Clock className="w-8 h-8 text-amber-500" />
      </div>
      <div>
        <h3 className="text-lg font-serif font-bold text-[#2D223B] dark:text-[#F1ECF7]">
          Application under review
        </h3>
        <p className="text-sm text-[#80778B] dark:text-[#9F94AC] mt-1.5 max-w-xs">
          Your application is in the queue. We'll notify you once a decision is made.
        </p>
      </div>
      <button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-[#43335A] dark:bg-[#684C8B] text-white text-sm font-semibold hover:bg-[#342647] active:scale-95 transition-all">
        Close
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main modal component
// ---------------------------------------------------------------------------

export default function CreatorOnboardingModal({ isOpen, onClose }: CreatorOnboardingModalProps) {
  const [step, setStep]       = useState(0);
  const [form, setForm]       = useState<FormData>(EMPTY_FORM);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const {
    hasPendingApp,
    submitAsync,
    isSubmitting,
    submitSuccess,
    submitError,
  } = useCreatorApplication();

  const { data: categories = [] } = useCategoriesQuery();

  if (!isOpen) return null;

  function handleChange(key: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldError(null);
  }

  function handleNext() {
    const err = validateStep(step, form);
    if (err) { setFieldError(err); return; }
    setFieldError(null);
    setStep((s) => s + 1);
  }

  function handleBack() {
    setFieldError(null);
    setStep((s) => s - 1);
  }

  async function handleSubmit() {
    const err = validateStep(2, form);
    if (err) { setFieldError(err); return; }
    setFieldError(null);
    try {
      await submitAsync({
        ...form,
        portfolioUrl: form.portfolioUrl?.trim() || undefined,
      });
    } catch {
      // submitError from hook handles display
    }
  }

  function handleClose() {
    setStep(0);
    setForm(EMPTY_FORM);
    setFieldError(null);
    onClose();
  }

  const stepPanels = [
    <StepIdentity   key="id"     form={form} onChange={handleChange} />,
    <StepSampleWork key="sample" form={form} onChange={handleChange} />,
    <StepPitch      key="pitch"  form={form} onChange={handleChange} genres={categories} />,
  ];

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      aria-modal="true"
      role="dialog"
      aria-label="Become a Verified Author"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 w-full sm:max-w-lg bg-[#FAF8F5] dark:bg-[#18132A] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-[#EFEAE2] dark:border-[#352B44] flex flex-col max-h-[92dvh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#EFEAE2] dark:border-[#2C2138] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#F2EDFA] dark:bg-[#2C213B] border border-[#E3D9F2] dark:border-[#43345A] flex items-center justify-center">
              <Feather className="w-4.5 h-4.5 text-[#43335A] dark:text-[#C5BACF]" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-[#2D223B] dark:text-[#F1ECF7] leading-tight">
                Become a Verified Author
              </h2>
              {!submitSuccess && !hasPendingApp && (
                <p className="text-[10px] text-[#80778B] dark:text-[#9F94AC]">
                  Step {step + 1} of {STEPS.length} — {STEPS[step]}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#80778B] dark:text-[#9F94AC] hover:bg-[#EFEAE2] dark:hover:bg-[#2C2138] active:scale-95 transition-all"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 no-scrollbar">
          {(submitSuccess) ? (
            <SubmittedState onClose={handleClose} />
          ) : hasPendingApp ? (
            <AlreadyPendingState onClose={handleClose} />
          ) : (
            <>
              {/* Step indicator */}
              <div className="mb-5">
                <StepIndicator current={step} total={STEPS.length} />
              </div>

              {/* Active step */}
              {stepPanels[step]}

              {/* Field validation error */}
              {fieldError && (
                <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl px-3 py-2.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {fieldError}
                </div>
              )}

              {/* Server error */}
              {submitError && (
                <div className="mt-3 flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-xl px-3 py-2.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {submitError.message ?? 'Something went wrong. Please try again.'}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer nav — hidden after success/pending */}
        {!submitSuccess && !hasPendingApp && (
          <div className="flex items-center justify-between gap-3 px-5 pb-5 pt-3 border-t border-[#EFEAE2] dark:border-[#2C2138] flex-shrink-0">
            <button
              onClick={step === 0 ? handleClose : handleBack}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-[#564D62] dark:text-[#C5BACF] bg-[#EFEAE2] dark:bg-[#2C2138] hover:bg-[#E8E1D5] dark:hover:bg-[#352844] active:scale-95 transition-all disabled:opacity-50"
            >
              {step > 0 && <ChevronLeft className="w-4 h-4" />}
              {step === 0 ? 'Cancel' : 'Back'}
            </button>

            {step < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#43335A] dark:bg-[#684C8B] hover:bg-[#342647] dark:hover:bg-[#563D75] active:scale-95 transition-all shadow-sm"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#43335A] dark:bg-[#684C8B] hover:bg-[#342647] dark:hover:bg-[#563D75] active:scale-95 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <Feather className="w-4 h-4" />
                    Submit Application
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
