import type { ChangeEvent, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, KeyRound, CircleUserRound } from 'lucide-react';

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
    className="access-view"
  >
    <div className="access-band">
      <strong>Elio</strong>
      <span>Euskara ikasi. Jolasean.</span>
    </div>

    <motion.form className="access-card" onSubmit={onSubmit}>
      <div className="access-card-icon">
        <CircleUserRound className="access-card-icon-svg" />
      </div>

      <div className="access-heading">
        <h1>Sartu jokora</h1>
      </div>

      <label className="access-field" htmlFor="access-code">
        <span>Erabiltzailea</span>
        <div className="access-input-shell">
          <CircleUserRound className="access-input-icon" />
          <input
            id="access-code"
            className="access-input"
            type="text"
            value={accessCode}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onCodeChange(event.target.value.toLowerCase())}
            placeholder="Adibidez: joka1"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
      </label>

      <label className="access-field" htmlFor="access-password">
        <span>Pasahitza</span>
        <div className="access-input-shell">
          <KeyRound className="access-input-icon" />
          <input
            id="access-password"
            className="access-input"
            type={isPasswordVisible ? 'text' : 'password'}
            value={accessPassword}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onPasswordChange(event.target.value)}
            placeholder="Sartu pasahitza"
          />
          <button
            className="access-visibility-button"
            type="button"
            onClick={onPasswordVisibilityToggle}
            aria-label={isPasswordVisible ? 'Pasahitza ezkutatu' : 'Pasahitza erakutsi'}
          >
            {isPasswordVisible ? <EyeOff className="access-input-icon" /> : <Eye className="access-input-icon" />}
          </button>
        </div>
      </label>

      {accessMessage && <div className="access-message">{accessMessage}</div>}

      <button className="access-submit" type="submit" disabled={isSubmittingAccess}>
        {isSubmittingAccess ? 'Konektatzen...' : 'Sartu'}
      </button>
    </motion.form>
  </motion.section>
);
