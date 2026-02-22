import { useState, useEffect } from "react";
import { VaultDoor } from "./icons/VaultDoor";
import { UnlockedVaultIcon } from "./icons/UnlockedVault";

interface WelcomePanelProps {
  secretCount: number;
  groupCount: number;
  hasProject: boolean;
}

function VaultOpenAnimation({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="absolute inset-0 z-10 overflow-hidden">
      {/* Left door */}
      <div className="vault-door-left absolute inset-y-0 left-0 w-1/2 border-r border-white/6 bg-vault-deep">
        <div className="flex h-full items-center justify-end pr-8">
          <div className="h-16 w-1 rounded-full bg-white/6" />
        </div>
      </div>
      {/* Right door */}
      <div className="vault-door-right absolute inset-y-0 right-0 w-1/2 border-l border-white/6 bg-vault-deep">
        <div className="flex h-full items-center pl-8">
          <div className="h-16 w-1 rounded-full bg-white/6" />
        </div>
      </div>
    </div>
  );
}

export function WelcomePanel({
  secretCount,
  groupCount,
  hasProject,
}: WelcomePanelProps) {
  const [showVaultAnimation, setShowVaultAnimation] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [prevHasProject, setPrevHasProject] = useState(false);

  useEffect(() => {
    if (hasProject && !prevHasProject) {
      setShowVaultAnimation(true);
      setShowContent(false);
    } else if (!hasProject) {
      setShowContent(true);
      setShowVaultAnimation(false);
    }
    setPrevHasProject(hasProject);
  }, [hasProject, prevHasProject]);

  const handleAnimationComplete = () => {
    setShowVaultAnimation(false);
    setShowContent(true);
  };

  if (!hasProject) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-5 text-center">
          <VaultDoor />
          <div>
            <p className="text-sm font-medium text-ink-secondary">
              No vault open
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              Open a project directory containing secrets
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full items-center justify-center">
      {showVaultAnimation && (
        <VaultOpenAnimation onComplete={handleAnimationComplete} />
      )}
      {showContent && (
        <div className="vault-content-reveal flex flex-col items-center gap-6 text-center">
          {/* Unlocked vault icon */}
          <UnlockedVaultIcon />
          <div>
            <p className="font-mono text-sm font-medium tracking-wide text-ink-primary">
              Vault unlocked
            </p>
            <div className="mt-3 flex items-center justify-center gap-6">
              <div className="flex flex-col items-center">
                <span className="font-mono text-2xl font-medium text-key-gold">
                  {secretCount}
                </span>
                <span className="text-xs tracking-wide text-ink-muted">
                  secrets
                </span>
              </div>
              <div className="h-8 w-px bg-white/6" />
              <div className="flex flex-col items-center">
                <span className="font-mono text-2xl font-medium text-steel">
                  {groupCount}
                </span>
                <span className="text-xs tracking-wide text-ink-muted">
                  groups
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs text-ink-muted">Select a secret to view</p>
        </div>
      )}
    </div>
  );
}
