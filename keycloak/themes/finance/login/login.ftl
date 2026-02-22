<!DOCTYPE html>
<html lang="${(locale.currentLanguageTag)!''}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${msg("loginTitle", (realm.displayName!''))}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                    },
                    colors: {
                        emerald: {
                            500: '#10b981',
                            600: '#059669',
                        },
                        slate: {
                            800: '#1e293b',
                            900: '#0f172a',
                            950: '#020617',
                        }
                    }
                }
            }
        }
    </script>
</head>
<body class="bg-slate-950 text-slate-50 font-sans min-h-screen flex items-center justify-center p-4" style="background-image: radial-gradient(circle at 15% 50%, rgba(16, 185, 129, 0.08), transparent 25%), radial-gradient(circle at 85% 30%, rgba(56, 189, 248, 0.05), transparent 25%);">

    <div class="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        <!-- Top border glow -->
        <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-80"></div>

        <div class="text-center mb-8">
            <div class="flex items-center justify-center gap-3 mb-2">
                <div class="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-white" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                    </svg>
                </div>
                <h1 class="text-2xl font-bold tracking-tight text-white">Finans Portalı</h1>
            </div>
            <p class="text-slate-400 text-sm">Hesabınıza giriş yapın</p>
        </div>

        <#if message?has_content && message.type == 'error'>
            <div class="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-red-400 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
                <span class="text-sm text-red-200">${kcSanitize(message.summary)?no_esc}</span>
            </div>
        </#if>

        <form id="kc-form-login" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post" class="space-y-5">
            <div>
                <label for="username" class="block text-sm font-medium text-slate-300 mb-1.5">E-posta adresi veya Kullanıcı adı</label>
                <input tabindex="1" id="username" name="username" value="${(login.username!'')}" type="text" autofocus autocomplete="off"
                       class="w-full bg-slate-950/60 border border-slate-700/80 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors shadow-inner" 
                       placeholder="admin" />
            </div>

            <div>
                <label for="password" class="block text-sm font-medium text-slate-300 mb-1.5">Şifre</label>
                <input tabindex="2" id="password" name="password" type="password" autocomplete="off"
                       class="w-full bg-slate-950/60 border border-slate-700/80 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors shadow-inner" 
                       placeholder="••••••••" />
            </div>

            <div class="flex items-center justify-between text-sm mt-2">
                <#if realm.rememberMe>
                    <label class="flex items-center gap-2 cursor-pointer group">
                        <div class="relative flex items-center justify-center">
                            <input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox" <#if login.rememberMe??>checked</#if>
                                   class="peer appearance-none w-5 h-5 border border-slate-600 rounded bg-slate-900/50 checked:bg-emerald-500 checked:border-emerald-500 transition-colors cursor-pointer" />
                            <svg class="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                            </svg>
                        </div>
                        <span class="text-slate-400 group-hover:text-slate-300 transition-colors">Beni Hatırla</span>
                    </label>
                <#else>
                    <div></div>
                </#if>
                
                <#if realm.resetPasswordAllowed>
                    <a tabindex="5" href="${url.loginResetCredentialsUrl}" class="text-emerald-500 hover:text-emerald-400 font-medium transition-colors">Şifremi Unuttum</a>
                </#if>
            </div>

            <button tabindex="4" name="login" id="kc-login" type="submit" 
                    class="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/20 transform transition-all active:scale-[0.98] mt-2">
                Giriş Yap
            </button>
        </form>

        <#if realm.password && realm.registrationAllowed && !registrationDisabled>
            <div class="mt-8 pt-6 border-t border-slate-700/50 text-center">
                <p class="text-slate-400 text-sm">
                    Hesabınız yok mu? 
                    <a tabindex="6" href="${url.registrationUrl}" class="text-white font-semibold hover:text-emerald-400 transition-colors ml-1">Kayıt Ol</a>
                </p>
            </div>
        </#if>
    </div>

</body>
</html>
