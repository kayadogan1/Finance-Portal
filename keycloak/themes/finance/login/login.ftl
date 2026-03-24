<#-- Finans Portalı — Login Page (v2 Design System) -->
<!DOCTYPE html>
<html lang="${(locale.currentLanguageTag)!''}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${msg("loginTitle", (realm.displayName!''))}</title>
    <link href="${url.resourcesPath}/css/styles.css" rel="stylesheet">
    <script>
        // Sync theme from localStorage (matches frontend)
        (function() {
            var t = localStorage.getItem('fp-theme');
            if (t === 'light') document.documentElement.classList.add('light');
        })();
    </script>
</head>
<body>
    <div class="login-pf-page">
        <div class="card-pf" style="position: relative;">

            <!-- Theme toggle -->
            <button class="theme-toggle" onclick="toggleTheme()" title="Tema değiştir" type="button">
                <svg id="icon-sun" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
                <svg id="icon-moon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none;">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
            </button>

            <header class="login-pf-header">
                <div class="fp-logo-container">
                    <div class="fp-logo-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                        </svg>
                    </div>
                    <h1 class="fp-logo-text">Finans Portalı</h1>
                </div>
                <p class="fp-subtitle">Hesabınıza giriş yapın</p>
            </header>

            <#if message?has_content && message.type == 'error'>
                <div class="pf-c-alert pf-m-danger">
                    <span>${kcSanitize(message.summary)?no_esc}</span>
                </div>
            </#if>

            <form id="kc-form-login" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post">
                <div class="pf-c-form__group">
                    <label for="username" class="pf-c-form__label">E-posta veya Kullanıcı adı</label>
                    <input tabindex="1" id="username" name="username" value="${(login.username!'')}" type="text" autofocus autocomplete="off" class="pf-c-form-control" placeholder="kullaniciadi" />
                </div>

                <div class="pf-c-form__group">
                    <label for="password" class="pf-c-form__label">Şifre</label>
                    <input tabindex="2" id="password" name="password" type="password" autocomplete="off" class="pf-c-form-control" placeholder="••••••••" />
                </div>

                <div id="kc-form-options">
                    <#if realm.rememberMe>
                        <div class="checkbox">
                            <label>
                                <input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox" <#if login.rememberMe??>checked</#if> />
                                Beni Hatırla
                            </label>
                        </div>
                    <#else>
                        <div></div>
                    </#if>
                    <#if realm.resetPasswordAllowed>
                        <a tabindex="5" href="${url.loginResetCredentialsUrl}">Şifremi Unuttum</a>
                    </#if>
                </div>

                <div class="pf-c-form__group">
                    <input tabindex="4" name="login" id="kc-login" type="submit" value="Giriş Yap" class="pf-c-button pf-m-primary" />
                </div>
            </form>

            <#if realm.password && realm.registrationAllowed && !(registrationDisabled!false)>
                <div id="kc-registration">
                    Hesabınız yok mu?
                    <a tabindex="6" href="${url.registrationUrl}">Kayıt Ol</a>
                </div>
            </#if>

        </div>
    </div>

    <script>
        function toggleTheme() {
            var root = document.documentElement;
            var isLight = root.classList.contains('light');
            if (isLight) {
                root.classList.remove('light');
                localStorage.setItem('fp-theme', 'dark');
            } else {
                root.classList.add('light');
                localStorage.setItem('fp-theme', 'light');
            }
            updateIcons();
        }
        function updateIcons() {
            var isLight = document.documentElement.classList.contains('light');
            document.getElementById('icon-sun').style.display = isLight ? 'none' : 'block';
            document.getElementById('icon-moon').style.display = isLight ? 'block' : 'none';
        }
        updateIcons();
    </script>
</body>
</html>
