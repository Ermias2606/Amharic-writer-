// components/PWAInstallButton.tsx
import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, installApp } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  // If already installed as standalone app, show a subtle badge or nothing
  if (isInstalled) {
    return (
      <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-800">
        <span>✓</span>
        <span>የተጫነ መተግበሪያ (Installed)</span>
      </span>
    );
  }

  const handleClick = async () => {
    if (isInstallable) {
      const success = await installApp();
      if (!success) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-red-700/30 bg-gradient-to-r from-red-700 to-amber-700 text-white hover:from-red-800 hover:to-amber-800 text-xs font-bold shadow-md transition-all active:scale-95 animate-pulse-gold"
        title="Install this app onto your phone, tablet, or desktop"
      >
        <span>📲</span>
        <span className="hidden md:inline font-amharic">መተግበሪያውን ጫን</span>
        <span>Install App</span>
      </button>

      {/* Installation Instruction Modal for iOS / unsupported browsers */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-amber-300 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📲</span>
                <h3 className="font-bold text-base text-gray-900 dark:text-white font-amharic">
                  መተግበሪያውን ይጫኑ • Install Web App
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
              <p>
                የአማርኛ ስብስብ ጀነሬተርን እንደ ራሱን የቻለ ፈጣን የሞባይል ወይም የኮምፒውተር መተግበሪያ አድርገው
                በቀላሉ መጫን ይችላሉ፦
              </p>

              {isIOS ? (
                /* iOS Safari instructions */
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-2">
                  <div className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                    <span>🍎</span>
                    <span>በ iPhone / iPad (Safari) ላይ ለመጫን፦</span>
                  </div>
                  <ol className="list-decimal pl-5 space-y-1.5 font-medium">
                    <li>
                      በ Safari አሳሽ ከታች ያለውን የ <strong>Share (ማጋሪያ)</strong> ቁልፍ ይጫኑ
                    </li>
                    <li>
                      ዝርዝሩን ወደታች በማንሸራተት <strong>"Add to Home Screen" (ወደ መነሻ ገጽ አክል)</strong>{' '}
                      የሚለውን ይምረጡ
                    </li>
                    <li>
                      ከላይ በቀኝ በኩል <strong>"Add" (አክል)</strong> የሚለውን ይጫኑ
                    </li>
                  </ol>
                </div>
              ) : (
                /* Android / Chrome / Edge instructions */
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-2">
                  <div className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                    <span>⚡</span>
                    <span>በ Chrome / Edge / Android ላይ፦</span>
                  </div>
                  <ol className="list-decimal pl-5 space-y-1.5 font-medium">
                    <li>
                      በአሳሽዎ የአድራሻ አሞሌ (Address Bar) በስተቀኝ ያለውን <strong>Install / ⊕</strong>{' '}
                      ምልክት ይጫኑ
                    </li>
                    <li>
                      ወይም የአሳሹን <strong>፧ (3 ነጥቦች)</strong> ምናሌ በመክፈት <strong>"Install app"</strong>{' '}
                      ይምረጡ
                    </li>
                  </ol>
                </div>
              )}

              <div className="pt-2 text-center text-[11px] text-gray-500">
                አፕሊኬሽኑ ሲጫን ከመስመር ውጭ (Offline) መስራትና በፍጥነት መከፈት ይችላል።
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-amber-700 text-white rounded-lg text-xs font-bold hover:bg-amber-800 transition-colors"
              >
                ገባኝ (Got it)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAInstallButton;
