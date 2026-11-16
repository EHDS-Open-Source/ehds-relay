<#--
  Page frame for every EHDS Relay sign-in page: the white page with the turning ring of stars,
  the blue card with the logo, title and form, and a slot for lines on white under the card.

  Based on keycloak.v2's template.ftl from Keycloak 26.8.1. Kept from it: the scripts (password
  show/hide, session polling, one-click links), the "show username" block, the message slot and
  the sections each page template fills ("header", "form", "info", "socialProviders"). Re-check
  it against the new copy when Keycloak is upgraded.

  Extra sections a page may fill: "below" (lines on white under the card). Per-page wording that
  needs no page template of its own comes from the messages:
    relayTitle.<pageId>     replaces the page's own title
    relaySubtitle.<pageId>  a line of text under the title
-->
<#import "field.ftl" as field>
<#import "footer.ftl" as loginFooter>
<#import "theme-resources.ftl" as themeResourceTags>

<#-- The message for this key, or "" when the theme has none. -->
<#function optionalMsg key>
  <#local text = msg(key)>
  <#return (text == key)?then("", text)>
</#function>

<#macro username>
  <p class="rl-signed-in-as">
    ${msg("relaySignedInAs")} <strong id="kc-attempted-username">${auth.attemptedUsername}</strong>
    <a id="reset-login" class="rl-quiet-link" href="${url.loginRestartFlowUrl}">${msg("relayNotYou")}</a>
  </p>
</#macro>

<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false subtitle="">
<#assign headerMarkup><#nested "header"></#assign>
<#assign relayTitle = optionalMsg("relayTitle." + pageId)>
<#assign relaySubtitle = subtitle?has_content?then(subtitle, optionalMsg("relaySubtitle." + pageId))>
<#assign relayPlaceholder = optionalMsg("relayPlaceholder." + pageId)>
<#-- The title as text for <title>: the page's own title is already escaped markup, so only
     its tags are removed. -->
<#assign headerText = headerMarkup?markup_string?replace("<[^>]*>", "", "r")?trim>
<!DOCTYPE html>
<html class="${properties.kcHtmlClass!}" lang="${lang}">

<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="color-scheme" content="light">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title><#if relayTitle?has_content>${relayTitle} · <#elseif headerText?has_content>${headerText?no_esc} · </#if>${msg("relayAppName")}</title>
    <link rel="icon" type="image/png" sizes="32x32" href="${url.resourcesPath}/img/favicon-32.png" />
    <link rel="icon" type="image/png" sizes="64x64" href="${url.resourcesPath}/img/favicon-64.png" />
    <#if properties.styles?has_content>
        <#list properties.styles?split(' ') as style>
            <link href="${url.resourcesPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
    <script type="importmap">
        {
            "imports": {
                "rfc4648": "${url.resourcesCommonPath}/vendor/rfc4648/rfc4648.js"
            }
        }
    </script>
    <#if properties.scripts?has_content>
        <#list properties.scripts?split(' ') as script>
            <script src="${url.resourcesPath}/${script}" type="text/javascript"></script>
        </#list>
    </#if>
    <#if scripts??>
        <#list scripts as script>
            <script src="${script}" type="text/javascript"></script>
        </#list>
    </#if>
    <script type="module" src="${url.resourcesPath}/js/passwordVisibility.js"></script>
    <script type="module">
        <#outputformat "JavaScript">
        import { startSessionPolling } from ${(url.resourcesPath + "/js/authChecker.js")?c};

        startSessionPolling(
            ${url.ssoLoginInOtherTabsUrl?c}
        );
        </#outputformat>
    </script>
    <script type="module">
        document.addEventListener("click", (event) => {
            const link = event.target.closest("a[data-once-link]");

            if (!link) {
                return;
            }

            if (link.getAttribute("aria-disabled") === "true") {
                event.preventDefault();
                return;
            }

            const { disabledClass } = link.dataset;

            if (disabledClass) {
                link.classList.add(...disabledClass.trim().split(/\s+/));
            }

            link.setAttribute("role", "link");
            link.setAttribute("aria-disabled", "true");
        });
    </script>
    <#if authenticationSession??>
        <script type="module">
             <#outputformat "JavaScript">
            import { checkAuthSession } from ${(url.resourcesPath + "/js/authChecker.js")?c};

            checkAuthSession(
                ${authenticationSession.authSessionIdHash?c}
            );
            </#outputformat>
        </script>
    </#if>
</head>

<body class="${properties.kcBodyClass!} ${bodyClass}" data-page-id="login-${pageId}">
<img class="rl-stars" src="${url.resourcesPath}/img/stars.svg" alt="" aria-hidden="true" />
<main id="content" class="rl-page">
  <section class="rl-card" data-surface="blue" aria-labelledby="kc-page-title">
    <div class="rl-logo">
      <img src="${url.resourcesPath}/img/logo.svg" alt="${msg('relayAppName')}" width="197" height="31" />
    </div>
    <h1 class="${properties.kcLoginMainTitle!}" id="kc-page-title"><#if relayTitle?has_content>${relayTitle}<#else>${headerMarkup}</#if></h1>
    <#if relaySubtitle?has_content>
      <p class="rl-sub">${kcSanitize(relaySubtitle)?no_esc}</p>
    </#if>

    <#if realm.internationalizationEnabled && locale.supported?size gt 1>
      <div class="${properties.kcLoginMainHeaderUtilities!}">
        <select class="rl-locale-select" aria-label="${msg("languages")}" id="login-select-toggle"
                onchange="if (this.value) window.location.href=this.value">
          <#list locale.supported?sort_by("label") as l>
            <option value="${l.url}" ${(l.languageTag == locale.currentLanguageTag)?then('selected','')}>${l.label}</option>
          </#list>
        </select>
      </div>
    </#if>

    <div class="${properties.kcLoginMainBody!}">
      <#if auth?has_content && auth.showUsername() && !auth.showResetCredentials()>
        <div class="${properties.kcContentWrapperClass!}">
          <#nested "show-username">
          <@username />
        </div>
      </#if>
      <#if displayRequiredFields>
        <p class="rl-required-note"><span class="${properties.kcInputRequiredClass!}" aria-hidden="true">*</span> ${msg("requiredFields")}</p>
      </#if>

      <#-- App-initiated actions should not see warning messages about the need to complete the
           action during login. -->
      <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
        <div class="${properties.kcAlertClass!} rl-alert-${message.type}" role="${(message.type = 'error')?then('alert', 'status')}">
          <span class="${properties.kcAlertIconClass!}" aria-hidden="true">
            <#if message.type = 'success'><span class="${properties.kcFeedbackSuccessIcon!}"></span></#if>
            <#if message.type = 'warning'><span class="${properties.kcFeedbackWarningIcon!}"></span></#if>
            <#if message.type = 'error'><span class="${properties.kcFeedbackErrorIcon!}"></span></#if>
            <#if message.type = 'info'><span class="${properties.kcFeedbackInfoIcon!}"></span></#if>
          </span>
          <span class="${properties.kcAlertTitleClass!} kc-feedback-text">${kcSanitize(message.summary)?no_esc}</span>
        </div>
      </#if>

      <#nested "form">

      <#if auth?has_content && auth.showTryAnotherWayLink()>
        <form id="kc-select-try-another-way-form" action="${url.loginAction}" method="post" novalidate="novalidate">
          <input type="hidden" name="tryAnotherWay" value="on"/>
          <a id="try-another-way" href="javascript:document.forms['kc-select-try-another-way-form'].requestSubmit()"
             class="rl-card-link">${msg("doTryAnotherWay")}</a>
        </form>
      </#if>

      <#if switchOrganizationEnabled?? && switchOrganizationEnabled>
        <form id="kc-switch-organization-form" action="${url.loginAction}" method="post" novalidate="novalidate">
          <input type="hidden" name="switchOrganization" value="true"/>
          <a id="switch-organization" href="javascript:document.forms['kc-switch-organization-form'].requestSubmit()"
             class="rl-card-link">${msg("doSwitchOrganization")}</a>
        </form>
      </#if>

      <#nested "socialProviders">

      <#if displayInfo>
        <div id="kc-info" class="rl-card-info">
          <div id="kc-info-wrapper">
            <#nested "info">
          </div>
        </div>
      </#if>

      <@loginFooter.content/>
    </div>
  </section>
  <#nested "below">
</main>
<#if relayPlaceholder?has_content>
<script>
  <#outputformat "JavaScript">
  (function () {
    var field = document.querySelector("main form input[type=text]");
    if (field) field.placeholder = ${relayPlaceholder?c};
  })();
  </#outputformat>
</script>
</#if>
</body>
</html>
</#macro>
