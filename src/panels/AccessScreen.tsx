import type { ChangeEvent, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, KeyRound, CircleUserRound, X } from 'lucide-react';

interface AccessScreenProps {
  accessCode: string;
  accessPassword: string;
  accessMessage: string | null;
  isPasswordVisible: boolean;
  isSubmittingAccess: boolean;
  onCodeChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onPasswordVisibilityToggle: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

const bgStyle = {
  background: `
    radial-gradient(ellipse at 18% 5%,  rgba(107, 184, 217, 0.22) 0%, transparent 52%),
    radial-gradient(ellipse at 82% 92%, rgba(72,  200, 186, 0.18) 0%, transparent 50%),
    radial-gradient(ellipse at 60% 48%, rgba(198, 221, 107, 0.1)  0%, transparent 46%),
    linear-gradient(180deg, #f2faff 0%, #edfaf6 100%)
  `
};

const fieldShellClass =
  'flex items-center gap-2.5 min-h-[62px] px-4 rounded-[22px] border border-[rgba(216,226,241,0.92)] bg-[rgba(249,251,255,0.94)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition-all duration-150 ease-out focus-within:border-[rgba(107,184,217,0.42)] focus-within:bg-[rgba(252,254,255,0.98)] focus-within:shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_0_0_3px_rgba(107,184,217,0.08)]';

const fieldInputClass =
  'w-full min-w-0 appearance-none rounded-none border-0! bg-transparent outline-none! shadow-none! ring-0! text-[var(--text)] text-base font-extrabold caret-[#6bb8d9] focus:border-0! focus:outline-none! focus:shadow-none! focus:ring-0! placeholder:text-[var(--muted)]';

export const AccessScreen = ({
  accessCode,
  accessPassword,
  accessMessage,
  isPasswordVisible,
  isSubmittingAccess,
  onCodeChange,
  onPasswordChange,
  onPasswordVisibilityToggle,
  onSubmit,
}: AccessScreenProps) => (
  <motion.section
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.04 }}
    className="grid content-start max-w-[560px] mx-auto min-h-full pb-10 gap-5 pt-[max(env(safe-area-inset-top),24px)]"
    style={bgStyle}
  >
    <div className="relative grid justify-items-center gap-2 px-6 pt-9 pb-8 text-white rounded-[32px] overflow-hidden bg-gradient-to-br from-[#5ab4d8] via-[#4ec9ba] via-[52%] to-[#cfe07a] shadow-[0_28px_64px_rgba(78,201,186,0.26),0_6px_20px_rgba(78,201,186,0.14)] before:absolute before:-top-[35%] before:-right-[8%] before:w-[220px] before:h-[220px] before:bg-white/10 before:rounded-full before:pointer-events-none after:absolute after:-bottom-[55%] after:-left-[6%] after:w-[180px] after:h-[180px] after:bg-white/5 after:rounded-full after:pointer-events-none">
      <strong className="relative font-display text-[clamp(2rem,6vw,2.8rem)] leading-none tracking-[-0.05em]">Elio</strong>
      <span className="relative text-[0.72rem] font-bold tracking-[0.14em] uppercase opacity-80">Euskara ikasi. Jolasean.</span>
    </div>

    <motion.form 
      className="grid gap-5 px-7 py-[30px] rounded-[36px] border border-white/70 bg-white/90 backdrop-blur-[20px] backdrop-saturate-[160%] shadow-[0_32px_80px_rgba(60,110,145,0.13),0_6px_22px_rgba(60,110,145,0.07),inset_0_1px_0_rgba(255,255,255,0.85)]" 
      onSubmit={onSubmit}
    >
      <div className="inline-flex items-center justify-center w-[86px] h-[86px] mx-auto text-white rounded-[30px] bg-gradient-to-br from-[#6ab6da] via-[#5ccbbc] via-[60%] to-[#cee07e] shadow-[0_20px_48px_rgba(92,203,188,0.32),0_0_0_6px_rgba(92,203,188,0.12),0_0_0_12px_rgba(92,203,188,0.05)]">
        <CircleUserRound className="w-[34px] h-[34px]" />
      </div>

      <div className="grid gap-2 text-center">
        <h1 className="font-display text-[clamp(2rem,6vw,3rem)] leading-none tracking-[-0.05em] text-[var(--text)]">Sartu jokora</h1>
      </div>

      <label className="grid gap-2.5" htmlFor="access-code">
        <span className="text-[var(--muted)] text-[0.82rem] font-extrabold tracking-[0.08em] uppercase">Erabiltzailea</span>
        <div className={fieldShellClass}>
          <CircleUserRound className="w-5 h-5 text-[#6bb8d9] shrink-0" />
          <input
            id="access-code"
            className={fieldInputClass}
            type="text"
            value={accessCode}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onCodeChange(event.target.value.toLowerCase())}
            placeholder="Adibidez: joka1"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {accessCode ? (
            <button
              className="inline-flex items-center justify-center w-[34px] h-[34px] rounded-[12px] bg-[rgba(107,184,217,0.1)] text-[#6bb8d9] cursor-pointer transition-colors duration-150 hover:bg-[rgba(107,184,217,0.18)]"
              type="button"
              onClick={() => onCodeChange('')}
              aria-label="Erabiltzailea garbitu"
            >
              <X className="w-4 h-4 shrink-0" />
            </button>
          ) : null}
        </div>
      </label>

      <label className="grid gap-2.5" htmlFor="access-password">
        <span className="text-[var(--muted)] text-[0.82rem] font-extrabold tracking-[0.08em] uppercase">Pasahitza</span>
        <div className={fieldShellClass}>
          <KeyRound className="w-5 h-5 text-[#6bb8d9] shrink-0" />
          <input
            id="access-password"
            className={fieldInputClass}
            type={isPasswordVisible ? 'text' : 'password'}
            value={accessPassword}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onPasswordChange(event.target.value)}
            placeholder="Sartu pasahitza"
          />
          <button
            className="inline-flex items-center justify-center w-[38px] h-[38px] rounded-[14px] bg-transparent text-[#6bb8d9] cursor-pointer"
            type="button"
            onClick={onPasswordVisibilityToggle}
            aria-label={isPasswordVisible ? 'Pasahitza ezkutatu' : 'Pasahitza erakutsi'}
          >
            {isPasswordVisible ? <EyeOff className="w-5 h-5 text-[#6bb8d9] shrink-0" /> : <Eye className="w-5 h-5 text-[#6bb8d9] shrink-0" />}
          </button>
        </div>
      </label>

      {accessMessage && <div className="px-4 py-3.5 rounded-[20px] border border-[rgba(255,194,172,0.88)] bg-[rgba(255,242,236,0.92)] text-[#b85f56] text-[0.94rem] font-bold leading-relaxed">{accessMessage}</div>}

      <button className="relative overflow-hidden inline-flex items-center justify-center min-h-[66px] rounded-full text-white text-[1.05rem] font-black tracking-[0.04em] cursor-pointer bg-gradient-to-br from-[#52bec2] via-[#6ecbac] via-[58%] to-[#c9de72] shadow-[0_18px_40px_rgba(82,190,194,0.32)] transition-all duration-150 ease-out hover:not-disabled:-translate-y-0.5 hover:not-disabled:shadow-[0_26px_48px_rgba(82,190,194,0.38)] active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait disabled:shadow-none after:absolute after:top-0 after:left-0 after:w-[60%] after:h-full after:bg-gradient-to-r after:from-transparent after:via-[rgba(255,255,255,0.22)] after:to-transparent after:-translate-x-[180%] after:animate-[submit-sheen_3.2s_ease-in-out_infinite] after:pointer-events-none" type="submit" disabled={isSubmittingAccess}>
        {isSubmittingAccess ? 'Konektatzen...' : 'Sartu'}
      </button>
    </motion.form>
  </motion.section>
);
