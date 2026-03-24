<#-- Finans Portalı — Register Page (v2 Design System) -->
<!DOCTYPE html>
<html lang="${(locale.currentLanguageTag)!''}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${msg("registerTitle")}</title>
    <link href="${url.resourcesPath}/css/styles.css" rel="stylesheet">
    <script>
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
                <p class="fp-subtitle">Yeni hesap oluşturun</p>
            </header>

            <#if message?has_content && (message.type == 'error' || message.type == 'warning')>
                <div class="pf-c-alert pf-m-danger">
                    <span>${kcSanitize(message.summary)?no_esc}</span>
                </div>
            </#if>

            <form id="kc-register-form" action="${url.registrationAction}" method="post">

                <div class="pf-c-form__group">
                    <label for="firstName" class="pf-c-form__label">${msg("firstName")}</label>
                    <input type="text" id="firstName" class="pf-c-form-control" name="firstName" value="${(register.formData.firstName!'')}" autocomplete="given-name" />
                </div>

                <div class="pf-c-form__group">
                    <label for="lastName" class="pf-c-form__label">${msg("lastName")}</label>
                    <input type="text" id="lastName" class="pf-c-form-control" name="lastName" value="${(register.formData.lastName!'')}" autocomplete="family-name" />
                </div>

                <div class="pf-c-form__group">
                    <label for="email" class="pf-c-form__label">${msg("email")}</label>
                    <input type="text" id="email" class="pf-c-form-control" name="email" value="${(register.formData.email!'')}" autocomplete="email" />
                </div>

                <#if !realm.registrationEmailAsUsername>
                    <div class="pf-c-form__group">
                        <label for="username" class="pf-c-form__label">${msg("username")}</label>
                        <input type="text" id="username" class="pf-c-form-control" name="username" value="${(register.formData.username!'')}" autocomplete="username" />
                    </div>
                </#if>

                <#if passwordRequired??>
                    <div class="pf-c-form__group">
                        <label for="password" class="pf-c-form__label">${msg("password")}</label>
                        <input type="password" id="password" class="pf-c-form-control" name="password" autocomplete="new-password" />
                    </div>

                    <div class="pf-c-form__group">
                        <label for="password-confirm" class="pf-c-form__label">${msg("passwordConfirm")}</label>
                        <input type="password" id="password-confirm" class="pf-c-form-control" name="password-confirm" autocomplete="new-password" />
                    </div>
                </#if>

                <div class="pf-c-form__group">
                    <input type="submit" class="pf-c-button pf-m-primary" value="${msg("doRegister")}" />
                </div>

                <div id="kc-registration">
                    Zaten hesabınız var mı?
                    <a href="${url.loginUrl}">Giriş Yap</a>
                </div>
            </form>

        </div>
    </div>

    <script>
        function toggleTheme() {
            var root = document.documentElement;
            var isLight = root.classList.contains('light');
            if (isLight) { root.classList.remove('light'); localStorage.setItem('fp-theme', 'dark'); }
            else { root.classList.add('light'); localStorage.setItem('fp-theme', 'light'); }
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
