<#--
  "This page has expired": two buttons instead of keycloak.v2's two "Click here" links. Based on
  base's login-page-expired.ftl from Keycloak 26.8.1; the link ids stay the same.
-->
<#import "template.ftl" as layout>
<@layout.registrationLayout; section>
    <#if section = "header">
        ${msg("pageExpiredTitle")}
    <#elseif section = "form">
        <div class="${properties.kcFormActionGroupClass!}">
            <a id="loginRestartLink" class="${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!}" href="${url.loginRestartFlowUrl}">${msg("relayPageExpiredRestart")}</a>
            <a id="loginContinueLink" class="${properties.kcButtonSecondaryClass!} ${properties.kcButtonBlockClass!}" href="${url.loginAction}">${msg("relayPageExpiredContinue")}</a>
        </div>
    </#if>
</@layout.registrationLayout>
